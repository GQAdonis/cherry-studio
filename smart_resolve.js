const fs = require('fs')
const { execSync } = require('child_process')

try {
  // Get all AA/U files with remaining markers
  const status = execSync("grep -rIl '<<<<<<< HEAD' .", { encoding: 'utf-8' })
  const files = status.split('\n').filter((f) => f.trim() !== '')

  console.log(`Processing ${files.length} files...`)

  let resolvedCount = 0
  let manualCount = 0

  for (const file of files) {
    if (!fs.existsSync(file)) continue

    let content = fs.readFileSync(file, 'utf-8')
    const originalContent = content

    // Regex to find conflict blocks
    // Note: lazy quantifiers *? to match minimal blocks
    const regex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> upstream\/main/g

    let match
    let newContent = content

    // We process matches one by one. Since replacing changes indices, we can replace globally or careful loop.
    // Replacing globally with a callback function is safest for simple replacements.

    newContent = content.replace(regex, (match, headParams, upstreamParams) => {
      const headContent = headParams // Content in HEAD
      const upstreamContent = upstreamParams // Content in upstream

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
        // Upstream added something, HEAD didn't. Take upstream.
        return upstreamContent
      }
      if (upstreamTrim === '' && headTrim !== '') {
        // HEAD added something, Upstream didn't. Take HEAD.
        return headContent
      }

      // Heuristic 3: Explicit feature preservation (Artifacts)
      if (headContent.includes('artifacts') || headContent.includes('Sparkles')) {
        // Likely local feature, keep it.
        // BUT check if upstream also added something important.
        // If upstream is purely missing it, we take HEAD (already covered by #2).
        // If upstream has *something else*, it's a conflict.
        // If upstream has 'code_tools' and HEAD has 'code_tools, artifacts', we want HEAD.
        return headContent
      }

      // Heuristic 4: Imports
      // If both are imports, we might want to merge them?
      // Too risky for regex.

      // Fallback: Keep as conflict
      return match
    })

    if (newContent !== originalContent) {
      fs.writeFileSync(file, newContent)
      // Check if any conflicts remain in this file
      if (!newContent.includes('<<<<<<< HEAD')) {
        resolvedCount++
        execSync(`git add "${file}"`)
      } else {
        manualCount++
        // Partially resolved?
      }
    } else {
      manualCount++
    }
  }

  console.log(`Auto-resolved: ${resolvedCount}`)
  console.log(`Requires manual review: ${manualCount}`)
} catch (e) {
  console.error(e)
}
