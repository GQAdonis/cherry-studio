const fs = require('fs')
const { execSync } = require('child_process')

try {
  console.log('Finding conflict files using git grep...')
  // Use git grep to find files with conflict markers, restricting to tracked files (ignoring node_modules etc)
  // We need to handle potential failure if no files found (exit code 1)
  let filesOutput = ''
  try {
    filesOutput = execSync("git grep -l '<<<<<<< HEAD'", { encoding: 'utf-8' })
  } catch (e) {
    // grep returns 1 if no matches found
    if (e.status === 1) {
      filesOutput = ''
    } else {
      throw e // real error
    }
  }

  const files = filesOutput.split('\n').filter((f) => f.trim() !== '')

  console.log(`Processing ${files.length} files...`)

  let resolvedCount = 0
  let manualCount = 0

  for (const file of files) {
    if (!fs.existsSync(file)) continue

    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content

    // Regex to find conflict blocks
    const regex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> upstream\/main/g

    let newContent = content.replace(regex, (match, headParams, upstreamParams) => {
      const headContent = headParams
      const upstreamContent = upstreamParams

      const headTrim = headContent.trim()
      const upstreamTrim = upstreamContent.trim()

      // Heuristic 1: Branding
      if (headContent.includes('The Boss') || headContent.includes('The Boss API')) {
        return headContent
      }
      if (upstreamContent.includes('Cherry Studio') && headContent.includes('The Boss')) {
        return headContent
      }

      // Heuristic 2: One side is empty (or just whitespace)
      if (headTrim === '' && upstreamTrim !== '') {
        return upstreamContent // Take Upstream additions
      }
      if (upstreamTrim === '' && headTrim !== '') {
        return headContent // Take HEAD additions
      }

      // Heuristic 3: Explicit feature preservation (Artifacts)
      if (headContent.includes('artifacts') || headContent.includes('Sparkles')) {
        return headContent
      }

      return match // Keep as conflict
    })

    if (newContent !== originalContent) {
      fs.writeFileSync(file, newContent)

      if (!newContent.includes('<<<<<<< HEAD')) {
        resolvedCount++
        execSync(`git add "${file}"`)
        console.log(`Resolved: ${file}`)
      } else {
        manualCount++
        console.log(`Manual review needed (partial): ${file}`)
      }
    } else {
      manualCount++
      console.log(`Manual review needed (no change): ${file}`)
    }
  }

  console.log(`Auto-resolved: ${resolvedCount}`)
  console.log(`Requires manual review: ${manualCount}`)
} catch (e) {
  console.error(e)
}
