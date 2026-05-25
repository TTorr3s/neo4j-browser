/*
 * Copyright (c) 2002-2021 "Neo4j,"
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

const fs = require('fs')
const path = require('path')

process.stdin.setEncoding('utf8')

let data = ''

process.stdin.on('readable', () => {
  const chunk = process.stdin.read()
  if (chunk !== null) {
    data += chunk
  }
})

process.stdin.on('end', () => {
  const licenses = JSON.parse(data)
  const dependencies = flattenPnpmLicenses(licenses)
  process.stdout.write(dependencies.map(buildDisclaimer).join('\n\n-----\n\n'))
})

function flattenPnpmLicenses(licenses) {
  return Object.entries(licenses)
    .flatMap(([license, dependencies]) =>
      dependencies.flatMap(dependency =>
        dependency.paths.map(packagePath => {
          const manifest = readManifest(packagePath)
          return {
            name: manifest.name || dependency.name,
            version: manifest.version || dependency.versions.join(', '),
            license: manifest.license || dependency.license || license,
            author: formatAuthor(manifest.author || dependency.author),
            homepage: manifest.homepage || dependency.homepage,
            packagePath
          }
        })
      )
    )
    .sort((a, b) =>
      `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)
    )
}

function readManifest(packagePath) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')
    )
  } catch {
    return {}
  }
}

function buildDisclaimer(dependency) {
  const metadata = [
    `Package: ${dependency.name}`,
    `Version: ${dependency.version}`,
    `License: ${dependency.license}`,
    dependency.author ? `Author: ${dependency.author}` : null,
    dependency.homepage ? `Homepage: ${dependency.homepage}` : null
  ].filter(Boolean)

  return [
    metadata.join('\n'),
    '',
    findLicenseText(dependency.packagePath) ||
      'No license text found in package.'
  ].join('\n')
}

function findLicenseText(packagePath) {
  const candidates = fs
    .readdirSync(packagePath)
    .filter(file => /^(licen[cs]e|copying)(\..*)?$/i.test(file))
    .sort((a, b) => scoreLicenseFile(a) - scoreLicenseFile(b))

  for (const candidate of candidates) {
    const candidatePath = path.join(packagePath, candidate)
    if (fs.statSync(candidatePath).isFile()) {
      return fs.readFileSync(candidatePath, 'utf8').trim()
    }
  }

  return null
}

function scoreLicenseFile(file) {
  const normalized = file.toLowerCase()
  if (normalized === 'license') return 0
  if (normalized === 'license.md') return 1
  if (normalized === 'license.txt') return 2
  if (normalized === 'licence') return 3
  if (normalized === 'copying') return 4
  return 5
}

function formatAuthor(author) {
  if (!author) {
    return null
  }

  if (typeof author === 'string') {
    return author
  }

  return [author.name, author.email, author.url].filter(Boolean).join(' ')
}
