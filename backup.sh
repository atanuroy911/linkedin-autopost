#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_$TIMESTAMP.tar.gz"

echo "Creating backup..."

# Check if data exists
if [ ! -d "data" ]; then
    echo "No local data found. Have you deployed yet?"
    exit 1
fi

# Package environment variables and local data state
tar -czvf "$BACKUP_FILE" .env.local data/

echo ""
echo "✅ Backup completed successfully: $BACKUP_FILE"
echo "Keep this file safe! To restore on a new server, simply extract it:"
echo "  tar -xzvf $BACKUP_FILE"
