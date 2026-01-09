const fs = require('fs')
const { execSync } = require('child_process')

try {
  console.log('Finding conflict files using git grep...')
  let filesOutput = ''
  try {
    // Look for all conflict markers
    filesOutput = execSync("git grep -l '<<<<<<<'", { encoding: 'utf-8' })
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
    if (file.includes('node_modules') || file.includes('dist') || file.includes('out')) continue

    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content

    // Basic conflict regex
    const regex = /<<<<<<< .+\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> .+/g

    let newContent = content.replace(regex, (match, headContent, upstreamContent) => {
      const headTrim = headContent.trim()
      const upstreamTrim = upstreamContent.trim()

      // Heuristic 1: Identity Preservation (Strings/Comments)
      // If HEAD contains "The Boss" and upstream contains "Cherry Studio", we might want to be careful.
      // But if it's a script name or a dependency, upstream is probably right.

      // Specifically for package.json identity fields
      if (file.endsWith('package.json')) {
        if (headContent.includes('"description": "The Boss') || headContent.includes('"name": "CherryStudio"')) {
          // We want to keep our name/desc but take upstream's other changes.
          // This regex approach is a bit blunt if multiple things are in one block.
          // However, usually these are single lines.
          if (upstreamContent.includes('"name":') || upstreamContent.includes('"description":')) {
            // If upstream changed the version or something else in the same block, this might be tricky.
            // For now, let's assume we want to keep the branded identity.
            return headContent
          }
        }
      }

      // Heuristic 2: Prefer Upstream for "New Functionality"
      // The user explicitly asked for "new functionality".
      if (upstreamTrim !== '' && headTrim === '') {
        return upstreamContent
      }

      // If both have content, and it's not branding, take upstream.
      // But wait, "The Boss" is our identify.
      if (headContent.includes('The Boss') && !upstreamContent.includes('The Boss')) {
        // If it's just a name change from Cherry Studio to The Boss, keep HEAD.
        if (upstreamContent.includes('Cherry Studio')) {
          return headContent
        }
        // If it's actual code that happens to have "The Boss" in a comment or string,
        // but upstream added new logic, we might miss the logic.
      }

      // Default strategy per user request: "in favor of new functionality"
      // This means taking upstreamContent most of the time.
      return upstreamContent
    })

    if (newContent !== originalContent) {
      fs.writeFileSync(file, newContent)
      touchedCount++

      if (!newContent.includes('<<<<<<<')) {
        resolvedCount++
        execSync(`git add "${file}"`)
      } else {
        manualCount++
      }
    } else {
      // If we didn't change it, it still has markers
      manualCount++
    }
  }

  console.log(`Touched: ${touchedCount}`)
  console.log(`Fully Auto-resolved: ${resolvedCount}`)
  console.log(`Requires manual review: ${manualCount}`)
} catch (e) {
  console.error(e)
}
