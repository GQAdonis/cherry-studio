const fs = require('fs')
const file = 'src/renderer/src/config/models/openai.ts' // Known conflict file
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf-8')
  const index = content.indexOf('<<<<<<<')
  if (index !== -1) {
    console.log('Found marker at index ' + index)
    // Print 100 chars around it
    console.log(JSON.stringify(content.substring(index, index + 200)))
  } else {
    console.log('Marker NOT found with indexOf')
  }
} else {
  console.log('File not found')
}
