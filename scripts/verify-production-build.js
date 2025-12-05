#!/usr/bin/env node

/**
 * Verification script for production builds
 * Checks that critical external dependencies are properly included in the packaged app
 */

const path = require('path')
const fs = require('fs')

// Try to load asar if available
let asar
try {
  asar = require('asar')
} catch (e) {
  console.log('⚠️  asar package not found, will skip asar inspection')
}

// Define the critical packages that MUST be present in production
const REQUIRED_PACKAGES = [
  {
    name: '@e2b/code-interpreter',
    paths: ['node_modules/@e2b/code-interpreter/dist/index.js', 'node_modules/@e2b/code-interpreter/package.json']
  },
  {
    name: 'e2b',
    paths: ['node_modules/e2b/package.json']
  },
  {
    name: 'unstructured-client',
    paths: ['node_modules/unstructured-client/dist/commonjs/index.js', 'node_modules/unstructured-client/package.json']
  },
  {
    name: 'jsdom',
    paths: ['node_modules/jsdom/package.json']
  },
  {
    name: 'iconv-lite',
    paths: ['node_modules/iconv-lite/package.json']
  }
]

// Platform-specific app paths
const APP_PATHS = {
  darwin: 'dist/mac-arm64/The Boss.app/Contents/Resources',
  win32: 'dist/win-unpacked/resources',
  linux: 'dist/linux-unpacked/resources'
}

function getAppPath() {
  const platform = process.platform
  const basePath = APP_PATHS[platform]

  if (!basePath) {
    console.error(`❌ Unsupported platform: ${platform}`)
    process.exit(1)
  }

  return path.join(process.cwd(), basePath)
}

function checkAsarUnpacked(resourcesPath) {
  const asarUnpackedPath = path.join(resourcesPath, 'app.asar.unpacked')

  if (!fs.existsSync(asarUnpackedPath)) {
    console.error('❌ app.asar.unpacked directory not found!')
    console.error('   This means asarUnpack configuration is not working.')
    return false
  }

  console.log('✅ app.asar.unpacked directory exists')

  let allPackagesFound = true

  for (const pkg of REQUIRED_PACKAGES) {
    console.log(`\n📦 Checking package: ${pkg.name}`)

    for (const relPath of pkg.paths) {
      const fullPath = path.join(asarUnpackedPath, relPath)

      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath)
        const size = stats.isFile() ? ` (${(stats.size / 1024).toFixed(2)} KB)` : ''
        console.log(`   ✅ ${relPath}${size}`)
      } else {
        console.log(`   ❌ MISSING: ${relPath}`)
        allPackagesFound = false
      }
    }
  }

  return allPackagesFound
}

function checkInsideAsar(resourcesPath) {
  const asarPath = path.join(resourcesPath, 'app.asar')

  if (!fs.existsSync(asarPath)) {
    console.error('❌ app.asar not found!')
    return false
  }

  if (!asar) {
    console.log('   ℹ️  Skipping asar inspection (asar package not available)')
    return true
  }

  console.log('\n📦 Checking app.asar contents...')

  try {
    const files = asar.listPackage(asarPath)
    const nodeModulesFiles = files.filter((f) => f.startsWith('node_modules/'))

    console.log(`   Total files in asar: ${files.length}`)
    console.log(`   node_modules entries: ${nodeModulesFiles.length}`)

    // Check if our packages are incorrectly bundled in asar (they should be unpacked)
    const e2bInAsar = files.some((f) => f.includes('@e2b/code-interpreter'))
    const unstructuredInAsar = files.some((f) => f.includes('unstructured-client'))

    if (e2bInAsar) {
      console.log('   ⚠️  WARNING: @e2b/code-interpreter found in asar (should be unpacked)')
    }
    if (unstructuredInAsar) {
      console.log('   ⚠️  WARNING: unstructured-client found in asar (should be unpacked)')
    }

    return true
  } catch (error) {
    console.error('❌ Error reading asar:', error.message)
    return false
  }
}

function main() {
  console.log('🔍 Production Build Verification')
  console.log('='.repeat(50))

  const resourcesPath = getAppPath()
  console.log(`📂 Resources path: ${resourcesPath}`)

  if (!fs.existsSync(resourcesPath)) {
    console.error('\n❌ Build not found!')
    console.error('   Please run a production build first:')
    console.error('   yarn build:mac:arm64 (macOS)')
    console.error('   yarn build:win (Windows)')
    console.error('   yarn build:linux (Linux)')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(50))
  console.log('Checking asarUnpack configuration...')
  console.log('='.repeat(50))

  const unpackedOk = checkAsarUnpacked(resourcesPath)

  console.log('\n' + '='.repeat(50))
  console.log('Checking asar bundle...')
  console.log('='.repeat(50))

  const asarOk = checkInsideAsar(resourcesPath)

  console.log('\n' + '='.repeat(50))
  console.log('Verification Summary')
  console.log('='.repeat(50))

  if (unpackedOk && asarOk) {
    console.log('✅ ALL CHECKS PASSED!')
    console.log('   Production build is ready for distribution.')
    process.exit(0)
  } else {
    console.log('❌ VERIFICATION FAILED!')
    console.log('   Please check the errors above and rebuild.')
    process.exit(1)
  }
}

main()
