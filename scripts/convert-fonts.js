/**
 * Font Conversion Script
 *
 * This script converts TTF fonts to WOFF2 format for better web performance.
 *
 * Prerequisites:
 * 1. Install Node.js
 * 2. Install required packages:
 *    npm install ttf2woff2
 *
 * Usage:
 * node convert-fonts.js
 */

const fs = require('fs')
const path = require('path')
const ttf2woff2 = require('ttf2woff2')

// Paths to font directories
const fontDirs = [
  path.join(__dirname, '../src/renderer/src/assets/fonts/roboto'),
  path.join(__dirname, '../src/renderer/src/assets/fonts/inter')
]

// Convert TTF to WOFF2
function convertTTFtoWOFF2(fontDir) {
  const files = fs.readdirSync(fontDir)

  files.forEach((file) => {
    if (file.endsWith('.ttf')) {
      const ttfPath = path.join(fontDir, file)
      const woff2Path = path.join(fontDir, file.replace('.ttf', '.woff2'))

      console.log(`Converting ${ttfPath} to ${woff2Path}`)

      const input = fs.readFileSync(ttfPath)
      const output = ttf2woff2(input)
      fs.writeFileSync(woff2Path, output)

      console.log(`Conversion complete: ${file} -> ${file.replace('.ttf', '.woff2')}`)
    }
  })
}

// Process all font directories
fontDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`Processing directory: ${dir}`)
    convertTTFtoWOFF2(dir)
  } else {
    console.log(`Directory not found: ${dir}`)
  }
})

console.log('Font conversion complete!')

/**
 * After running this script, update the CSS files to use WOFF2 format:
 *
 * In roboto.css and proxima-nova.css, change:
 * src: url('./Font-Name.ttf') format('truetype');
 *
 * To:
 * src: url('./Font-Name.woff2') format('woff2');
 */
