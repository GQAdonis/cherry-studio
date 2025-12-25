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

    // More robust regex:
    // Matches <<<<<<< [anything] newline [content] newline ======= newline [content] newline >>>>>>> [anything]
    // using [\r\n]+ to match any line ending
    const regex = /<<<<<<< .+(\r?\n)([\s\S]*?)(\r?\n)=======(\r?\n)([\s\S]*?)(\r?\n)>>>>>>> .+/g

    let newContent = content.replace(regex, (match, nl1, headContent, nl2, nl3, upstreamContent, nl4) => {
      // Verify if it's the right markers by checking match string?
      // Actually, standard git markers are reliable enough for structural match.
      // But we need to know which is HEAD. The first block is ALWAYS "ours" (current branch), usually HEAD.
      // The second block is "theirs" (incoming).

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
        return upstreamContent
      }
      if (upstreamTrim === '' && headTrim !== '') {
        return headContent
      }

      // Heuristic 3: Explicit feature preservation
      if (headContent.includes('artifacts') || headContent.includes('Sparkles')) {
        return headContent
      }

      // Debugging log if needed
      // console.log("Conflict found, manual review needed.");
      return match
    })

    if (newContent !== originalContent) {
      fs.writeFileSync(file, newContent)
      touchedCount++

      if (!newContent.includes('<<<<<<<')) {
        resolvedCount++
        execSync(`git add "${file}"`)
        console.log(`Resolved: ${file}`)
      } else {
        manualCount++
        console.log(`Partial resolve: ${file}`)
      }
    } else {
      manualCount++
      // console.log(`No heuristics matched: ${file}`);
    }
  }

  console.log(`Touched: ${touchedCount}`)
  console.log(`Fully Auto-resolved: ${resolvedCount}`)
  console.log(`Requires manual review: ${manualCount}`)
} catch (e) {
  console.error(e)
}
