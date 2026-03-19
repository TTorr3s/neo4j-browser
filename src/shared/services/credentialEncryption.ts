/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Credential encryption service using Web Crypto API (AES-GCM) with
 * a non-extractable CryptoKey stored in IndexedDB.
 *
 * The key cannot be read or exported via browser dev tools, providing
 * protection for credentials stored in localStorage.
 */

const DB_NAME = 'neo4j-browser-keystore'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const KEY_ID = 'profile-encryption-key'

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const db = await openKeyStore()

  // Try to load existing key
  const existing = await new Promise<CryptoKey | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(KEY_ID)
    request.onsuccess = () => resolve(request.result?.key ?? null)
    request.onerror = () => reject(request.error)
  })

  if (existing) {
    db.close()
    return existing
  }

  // Generate a new non-extractable AES-GCM 256-bit key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: cannot be read via dev tools
    ['encrypt', 'decrypt']
  )

  // Store in IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put({ id: KEY_ID, key })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })

  db.close()
  return key
}

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export interface EncryptedPayload {
  __encrypted: true
  iv: string
  data: string
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as EncryptedPayload).__encrypted === true &&
    typeof (value as EncryptedPayload).iv === 'string' &&
    typeof (value as EncryptedPayload).data === 'string'
  )
}

export async function encryptData(
  plaintext: string
): Promise<EncryptedPayload> {
  const key = await getOrCreateKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    __encrypted: true,
    iv: toBase64(iv.buffer),
    data: toBase64(ciphertext)
  }
}

export async function decryptData(payload: EncryptedPayload): Promise<string> {
  const key = await getOrCreateKey()
  const iv = fromBase64(payload.iv)
  const ciphertext = fromBase64(payload.data)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypt an array of connection profiles and store in localStorage.
 */
export async function saveEncryptedProfiles(
  storageKey: string,
  profiles: unknown[]
): Promise<void> {
  const plaintext = JSON.stringify(profiles)
  const encrypted = await encryptData(plaintext)
  localStorage.setItem(storageKey, JSON.stringify(encrypted))
}

/**
 * Load and decrypt connection profiles from localStorage.
 * Handles both encrypted and legacy plain-text formats.
 * If plain-text profiles are found, they are re-saved encrypted (migration).
 */
export async function loadEncryptedProfiles<T = unknown>(
  storageKey: string
): Promise<T[]> {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  // Encrypted format
  if (isEncryptedPayload(parsed)) {
    try {
      const decrypted = await decryptData(parsed)
      return JSON.parse(decrypted)
    } catch {
      // If decryption fails (e.g. key was lost), clear corrupted data
      localStorage.removeItem(storageKey)
      return []
    }
  }

  // Legacy plain-text format: migrate to encrypted
  if (Array.isArray(parsed)) {
    await saveEncryptedProfiles(storageKey, parsed)
    return parsed as T[]
  }

  return []
}
