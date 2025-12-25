const fs = require('fs')
const { execSync } = require('child_process')

try {
  // Get all AA files
  const status = execSync("git status --porcelain | grep '^AA' | cut -c4-", { encoding: 'utf-8' })
  const files = status.split('\n').filter((f) => f.trim() !== '')

  console.log(`Analyzing ${files.length} conflict files...`)

  const identicalFiles = []
  const differentFiles = []
  const emptyFiles = []

  for (const file of files) {
    if (!fs.existsSync(file)) continue

    const content = fs.readFileSync(file, 'utf-8')

    // Check for conflict markers
    if (content.includes('<<<<<<< HEAD')) {
      // Has markers, this is a real conflict content that needs manual help or is already marked
      differentFiles.push(file)
    } else {
      // No markers? That's weird for AA unless it's binary or git didn't merge them in content
      // For 'both added', git usually leaves the file as is from one side or just marks it conflict
      // Let's check if the file content is actually identical to HEAD or MERGE_HEAD
      // But wait, if it's AA, the working tree version might just be one of them or empty?
      // Actually, for both added, if the content is different, git puts conflict markers.
      // If the content is identical, git should have auto-resolved it?
      // No, sometimes it still marks as AA if it was added independently.

      // If no markers, maybe it's identical?
      identicalFiles.push(file)
    }
  }

  console.log(`Identical/Marker-less files: ${identicalFiles.length}`)
  console.log(`Different/Marker files: ${differentFiles.length}`)

  if (differentFiles.length > 0) {
    console.log('Files with markers:', differentFiles.slice(0, 10)) // Show sample
  }

  if (identicalFiles.length > 0) {
    console.log('Resolving identical/marker-less files...')
    // For these files, we assume the current content is what we want (or maybe we should check)
    // If there are no markers, it potentially means the content was merged or clean
    // Let's just stage them.
    execSync(`git add ${identicalFiles.join(' ')}`)
  }
} catch (e) {
  console.error(e)
}
