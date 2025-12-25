const fs = require('fs')
const { execSync } = require('child_process')

try {
  console.log('Finding conflict files using git grep...')
  let filesOutput = ''
  try {
    filesOutput = execSync("git grep -l '<<<<<<< HEAD'", { encoding: 'utf-8' })
  } catch (e) {
    if (e.status === 1) {
      filesOutput = ''
    } else {
      throw e
    }
  }

  const files = filesOutput.split('\n').filter((f) => f.trim() !== '')

  console.log(`Processing ${files.length} files...`)

  let resolvedCount = 0
  let manualCount = 0
  let touchedCount = 0

  for (const file of files) {
    if (!fs.existsSync(file)) continue

    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content

    const regex = /<<<<<<< .+\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> .+/g

    let newContent = content.replace(regex, (match, headContent, upstreamContent) => {
      const headTrim = headContent.trim()
      const upstreamTrim = upstreamContent.trim()

      // Heuristic 1: Branding and Feature Names
      if (headContent.includes('The Boss') || headContent.includes('The Boss API') || headContent.includes('MinApp')) {
        return headContent
      }
      if (upstreamContent.includes('Cherry Studio') && headContent.includes('The Boss')) {
        return headContent
      }

      // Heuristic 2: One side is empty
      if (headTrim === '' && upstreamTrim !== '') {
        return upstreamContent
      }
      if (upstreamTrim === '' && headTrim !== '') {
        return headContent
      }

      // Heuristic 3: Explicit feature preservation
      if (headContent.includes('artifacts') || headContent.includes('Sparkles')) {
        return headContent
      }

      // Heuristic 4: Superset / Comma insertion
      // If HEAD is strictly longer than Upstream, and HEAD roughly contains Upstream, take HEAD.
      // Common case:
      // Upstream: "key": "value"
      // HEAD: "key": "value", "newKey": "values"

      // Remove commas and whitespace to compare "base" content?
      const normalize = (s) => s.replace(/[\s,;]/g, '')
      const headNorm = normalize(headContent)
      const upstreamNorm = normalize(upstreamContent)

      if (headNorm.includes(upstreamNorm) && headNorm.length > upstreamNorm.length) {
        // HEAD includes Upstream content + more. Assume extension.
        return headContent
      }

      // Also check reverse (Upstream added more?)
      if (upstreamNorm.includes(headNorm) && upstreamNorm.length > headNorm.length) {
        return upstreamContent
      }

      return match
    })

    if (newContent !== originalContent) {
      fs.writeFileSync(file, newContent)
      touchedCount++

      if (!newContent.includes('<<<<<<<')) {
        resolvedCount++
        execSync(`git add "${file}"`)
        // console.log(`Resolved: ${file}`);
      } else {
        manualCount++
      }
    } else {
      manualCount++
    }
  }

  console.log(`Touched: ${touchedCount}`)
  console.log(`Fully Auto-resolved: ${resolvedCount}`)
  console.log(`Requires manual review: ${manualCount}`)
} catch (e) {
  console.error(e)
}
