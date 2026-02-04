const fs = require('fs')
const path = require('path')
const JSZip = require('jszip')

const DIST_DIR = path.join(__dirname, '..', 'dist')
const ZIP_PATH = path.join(__dirname, '..', 'dist.zip')

async function addDirectoryToZip(zip, dirPath, zipPath = '') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    // Skip .DS_Store files
    if (entry.name === '.DS_Store') {
      continue
    }

    const fullPath = path.join(dirPath, entry.name)
    const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, fullPath, entryZipPath)
    } else {
      const content = fs.readFileSync(fullPath)
      zip.file(entryZipPath, content)
    }
  }
}

async function main() {
  // Check if dist folder exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist/ folder does not exist. Run build first.')
    process.exit(1)
  }

  // Remove existing zip if it exists
  if (fs.existsSync(ZIP_PATH)) {
    console.log('Removing existing dist.zip...')
    fs.unlinkSync(ZIP_PATH)
  }

  console.log('Creating dist.zip...')

  const zip = new JSZip()
  await addDirectoryToZip(zip, DIST_DIR)

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })

  fs.writeFileSync(ZIP_PATH, content)

  const stats = fs.statSync(ZIP_PATH)
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`Created dist.zip (${sizeMB} MB)`)
}

main().catch(err => {
  console.error('Error creating zip:', err)
  process.exit(1)
})
