#!/bin/bash

# Backup Script for Cherry Studio
# Backs up all application data before updating

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Cherry Studio Data Backup Script                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Create backup directory
BACKUP_DIR=~/Desktop/cherry-studio-backup-$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📁 Backup directory: $BACKUP_DIR${NC}"
echo ""

# Check if app data exists
APP_SUPPORT_DIR=~/Library/Application\ Support/CherryStudio

if [ ! -d "$APP_SUPPORT_DIR" ]; then
    echo -e "${RED}❌ Cherry Studio data directory not found!${NC}"
    echo "   Expected location: $APP_SUPPORT_DIR"
    exit 1
fi

echo "🔍 Found Cherry Studio data directory"
echo ""

# Backup application data
echo "📦 Backing up application data..."
rsync -a --exclude='SingletonSocket' --exclude='SingletonLock' --exclude='SingletonCookie' \
  "$APP_SUPPORT_DIR/" "$BACKUP_DIR/CherryStudio/" 2>&1 | grep -v "socket (not copied)" || true
echo -e "${GREEN}✅ Application data backed up${NC}"
echo ""

# Backup the app itself (optional)
if [ -d "/Applications/The Boss.app" ]; then
    echo "📦 Backing up application binary..."
    cp -r "/Applications/The Boss.app" "$BACKUP_DIR/The Boss.app"
    echo -e "${GREEN}✅ Application binary backed up${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️  Application not found at /Applications/The Boss.app${NC}"
    echo ""
fi

# Check Redux version
echo "🔍 Checking Redux version..."
REDUX_VERSION=$(sqlite3 "$APP_SUPPORT_DIR/Local Storage/leveldb/"*.ldb "SELECT value FROM ItemTable WHERE key='persist:cherry-studio' LIMIT 1" 2>/dev/null | grep -o '"version":[0-9]*' | cut -d':' -f2 || echo "unknown")
echo "   Redux version: $REDUX_VERSION"
echo ""

# Check SQLite database
echo "🔍 Checking agents database..."
if [ -f "$APP_SUPPORT_DIR/Data/agents.db" ]; then
    MIGRATION_COUNT=$(sqlite3 "$APP_SUPPORT_DIR/Data/agents.db" "SELECT COUNT(*) FROM migrations" 2>/dev/null || echo "0")
    echo "   Applied migrations: $MIGRATION_COUNT"
    
    # Show last 3 migrations
    echo "   Last migrations:"
    sqlite3 "$APP_SUPPORT_DIR/Data/agents.db" \
        "SELECT '     ' || tag || ' (v' || version || ')' FROM migrations ORDER BY version DESC LIMIT 3" \
        2>/dev/null || echo "     (none)"
else
    echo "   No agents database found"
fi
echo ""

# Create backup manifest
cat > "$BACKUP_DIR/backup-manifest.txt" << EOF
Cherry Studio Backup
====================
Date: $(date)
Redux Version: $REDUX_VERSION
Migrations: $MIGRATION_COUNT

Contents:
- Application data: $APP_SUPPORT_DIR
- Redux state: Local Storage/leveldb/
- SQLite database: Data/agents.db
- Logs: logs/
- Configuration: config.json

Backup location: $BACKUP_DIR
EOF

echo -e "${GREEN}📝 Backup manifest created${NC}"
echo ""

# Show backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Backup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Backup Summary:"
echo "   Location: $BACKUP_DIR"
echo "   Size: $BACKUP_SIZE"
echo "   Redux version: $REDUX_VERSION"
echo "   Migrations: $MIGRATION_COUNT"
echo ""
echo "📋 Next steps:"
echo "   1. Review docs/SAFE_UPDATE_GUIDE.md"
echo "   2. Test update in dev mode: pnpm dev"
echo "   3. Build new version: pnpm build:mac"
echo ""
echo "💡 To restore from backup:"
echo "   rm -rf ~/Library/Application\\ Support/CherryStudio"
echo "   cp -r \"$BACKUP_DIR/CherryStudio\" ~/Library/Application\\ Support/"
echo ""
