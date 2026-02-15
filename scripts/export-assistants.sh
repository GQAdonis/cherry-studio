#!/bin/bash

# Export Assistants from The Boss (Cherry Studio)
# This script helps you export your assistants data from localStorage

cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║  Export Assistants from The Boss (Cherry Studio)          ║
╚════════════════════════════════════════════════════════════╝

📋 Follow these steps to export your assistants:

1. Open The Boss application

2. Open Developer Tools:
   - Menu: View → Toggle Developer Tools
   - Or press: Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows/Linux)

3. Click on the "Console" tab

4. Copy and paste this command:

   ┌────────────────────────────────────────────────────────┐
   │ JSON.stringify(                                        │
   │   JSON.parse(localStorage.getItem("persist:cherry-    │
   │     studio")).assistants,                              │
   │   null,                                                │
   │   2                                                    │
   │ )                                                      │
   └────────────────────────────────────────────────────────┘

5. Right-click on the output and select "Copy string contents"

6. Save to a file:

EOF

# Offer to create the file
read -p "   Would you like to paste the content now? (y/n): " response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    echo "   Paste the JSON content and press Ctrl+D when done:"
    echo ""
    cat > assistants-export.json
    echo ""
    echo "✅ Saved to: $(pwd)/assistants-export.json"
    echo ""
    echo "📊 Preview:"
    jq -r '.assistants | length' assistants-export.json 2>/dev/null | \
        xargs -I {} echo "   Found {} assistants"
    echo ""
    echo "🚀 Now run the migration script:"
    echo "   npx tsx scripts/migrate-assistants-to-agents.ts"
    echo ""
else
    echo ""
    echo "   Save manually to: $(pwd)/assistants-export.json"
    echo ""
    echo "   Then run: npx tsx scripts/migrate-assistants-to-agents.ts"
    echo ""
fi
