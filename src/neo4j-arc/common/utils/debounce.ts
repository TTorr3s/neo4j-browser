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

export interface DebounceOptions {
  /** Execute on the leading edge of the timeout. Default: false */
  leading?: boolean
  /** Execute on the trailing edge of the timeout. Default: true */
  trailing?: boolean
  /** Maximum time to wait before forcing execution (in ms) */
  maxWait?: number
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  /** Cancel any pending invocation */
  cancel: () => void
  /** Immediately execute any pending invocation */
  flush: () => void
  /** Check if there's a pending invocation */
  pending: () => boolean
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after `wait` milliseconds have elapsed since the last invocation.
 *
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param options - Configuration options
 * @returns A debounced version of the function with cancel, flush, and pending methods
 *
 * @example
 * // Basic usage
 * const debouncedSave = debounce(save, 300)
 *
 * @example
 * // With maxWait to ensure execution at least every 1000ms
 * const debouncedUpdate = debounce(update, 300, { maxWait: 1000 })
 *
 * @example
 * // Leading edge execution
 * const debouncedSearch = debounce(search, 300, { leading: true, trailing: false })
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let lastCallTime: number | null = null
  let lastInvokeTime = 0

  const invokeFunc = (): void => {
    const args = lastArgs
    lastArgs = null
    timeoutId = null
    maxWaitTimeoutId = null
    lastInvokeTime = Date.now()
    if (args !== null) {
      fn(...args)
    }
  }

  const clearAllTimers = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (maxWaitTimeoutId !== null) {
      clearTimeout(maxWaitTimeoutId)
      maxWaitTimeoutId = null
    }
  }

  const shouldInvoke = (time: number): boolean => {
    if (lastCallTime === null) return true

    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    // First call, or enough time has passed
    return (
      timeSinceLastCall >= wait ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  const timerExpired = (): void => {
    const time = Date.now()
    if (shouldInvoke(time)) {
      // Clear the other timer to prevent double invocation
      clearAllTimers()
      if (trailing) {
        invokeFunc()
      } else {
        lastArgs = null
      }
    } else if (maxWait !== undefined) {
      // Restart trailing timer with remaining time
      const timeSinceLastCall = time - (lastCallTime ?? 0)
      const timeSinceLastInvoke = time - lastInvokeTime
      const timeWaiting = wait - timeSinceLastCall
      const maxWaitRemaining = maxWait - timeSinceLastInvoke
      const remainingWait = Math.min(timeWaiting, maxWaitRemaining)
      timeoutId = setTimeout(timerExpired, Math.max(0, remainingWait))
    }
  }

  const debounced = ((...args: Parameters<T>): void => {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastCallTime = time

    if (isInvoking) {
      // No timers running, start fresh
      if (timeoutId === null) {
        if (leading) {
          invokeFunc()
        }
        // Set up trailing timer
        timeoutId = setTimeout(timerExpired, wait)

        // Set up maxWait timer if configured
        if (maxWait !== undefined) {
          maxWaitTimeoutId = setTimeout(timerExpired, maxWait)
        }
        return
      }

      // maxWait timer expired while we had an active trailing timer
      if (maxWait !== undefined && maxWaitTimeoutId === null) {
        maxWaitTimeoutId = setTimeout(timerExpired, maxWait)
      }
    }

    // Reset trailing timer on each call
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(timerExpired, wait)
  }) as DebouncedFunction<T>

  debounced.cancel = (): void => {
    clearAllTimers()
    lastArgs = null
    lastCallTime = null
  }

  debounced.flush = (): void => {
    if (lastArgs !== null) {
      clearAllTimers()
      invokeFunc()
    }
  }

  debounced.pending = (): boolean => {
    return timeoutId !== null
  }

  return debounced
}
