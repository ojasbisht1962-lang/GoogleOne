#!/bin/bash
# Complete Database Migration Script
# This script will:
# 1. Create a backup
# 2. Run the migration
# 3. Verify the results

echo "======================================================================================================"
echo "TRUSTEDHANDS DATABASE MIGRATION"
echo "======================================================================================================"
echo ""
echo "This script will:"
echo "  1. Create a complete backup of your database"
echo "  2. Run the data migration to fix inconsistencies"
echo "  3. Verify the migration results"
echo ""
echo "⚠️  Make sure the backend server is stopped before proceeding!"
echo ""

# Check if backend is running
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "❌ Backend server is running on port 8000!"
    echo "Please stop it first: pkill -f 'main.py'"
    exit 1
fi

echo "✅ Backend server is not running"
echo ""

read -p "Do you want to proceed? (yes/no): " response

if [ "$response" != "yes" ]; then
    echo "❌ Migration cancelled."
    exit 0
fi

echo ""
echo "======================================================================================================"
echo "STEP 1: Creating Database Backup"
echo "======================================================================================================"
echo ""

cd /Users/aryaarora/Downloads/Trusted-Hands-main/backend
venv/bin/python backup_database.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Backup failed! Migration aborted."
    exit 1
fi

echo ""
echo "======================================================================================================"
echo "STEP 2: Running Data Migration"
echo "======================================================================================================"
echo ""

# Run migration with automatic yes
echo "yes" | echo "yes" | venv/bin/python migrate_database.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Migration failed!"
    echo "Your backup is safe in: database_backups/"
    echo "To restore: python restore_database.py [backup_name]"
    exit 1
fi

echo ""
echo "======================================================================================================"
echo "MIGRATION COMPLETE"
echo "======================================================================================================"
echo ""
echo "✅ Backup created successfully"
echo "✅ Migration completed successfully"
echo "📦 Your backup is safe in: database_backups/"
echo ""
echo "Next steps:"
echo "  1. Restart the backend server"
echo "  2. Refresh the frontend dashboard"
echo "  3. Verify the revenue and user counts are correct"
echo ""
echo "If something went wrong, restore from backup:"
echo "  python restore_database.py [backup_name]"
echo ""
