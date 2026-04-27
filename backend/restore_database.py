"""
Database Restore Script
Restores database from a backup created by backup_database.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path
from bson import ObjectId

load_dotenv()

async def restore_database(backup_name):
    mongodb_url = os.getenv('MONGODB_URL')
    database_name = os.getenv('DATABASE_NAME')
    
    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]
    
    backup_dir = Path(f'database_backups/{backup_name}')
    
    if not backup_dir.exists():
        print(f'❌ Backup directory not found: {backup_dir}')
        return False
    
    print('=' * 100)
    print('DATABASE RESTORE SCRIPT')
    print('=' * 100)
    print(f'\n📁 Backup Directory: {backup_dir}')
    print(f'🗄️  Target Database: {database_name}')
    print(f'⏰ Current Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n')
    
    # Load metadata
    metadata_file = backup_dir / 'backup_metadata.json'
    if not metadata_file.exists():
        print('❌ Backup metadata not found!')
        return False
    
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    
    print(f'📊 Backup contains {len(metadata["collections"])} collections')
    print(f'📊 Total documents in backup: {metadata["total_documents"]:,}\n')
    
    print('⚠️  WARNING: This will REPLACE all existing data in the database!')
    response = input('\nAre you sure you want to continue? (yes/no): ')
    
    if response.lower() != 'yes':
        print('❌ Restore cancelled.')
        return False
    
    total_restored = 0
    
    # Restore each collection
    for idx, (coll_name, info) in enumerate(metadata['collections'].items(), 1):
        print(f'\n[{idx}/{len(metadata["collections"])}] Restoring: {coll_name}...', end=' ')
        
        backup_file = backup_dir / f'{coll_name}.json'
        if not backup_file.exists():
            print(f'❌ Backup file not found: {backup_file}')
            continue
        
        # Load documents
        with open(backup_file, 'r') as f:
            documents = json.load(f)
        
        # Convert string _id back to ObjectId
        for doc in documents:
            if '_id' in doc and isinstance(doc['_id'], str):
                try:
                    doc['_id'] = ObjectId(doc['_id'])
                except:
                    pass
            # Convert ISO datetime strings back to datetime objects
            for key, value in doc.items():
                if isinstance(value, str) and 'T' in value and ':' in value:
                    try:
                        doc[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except:
                        pass
        
        # Drop existing collection
        await db[coll_name].drop()
        
        # Insert documents
        if documents:
            await db[coll_name].insert_many(documents)
            total_restored += len(documents)
            print(f'✅ {len(documents)} documents restored')
        else:
            print('✅ 0 documents (empty collection)')
    
    print('\n' + '=' * 100)
    print('RESTORE COMPLETE')
    print('=' * 100)
    print(f'\n✅ Successfully restored {len(metadata["collections"])} collections')
    print(f'✅ Total documents restored: {total_restored:,}')
    print('\n' + '=' * 100)
    
    client.close()
    return True

if __name__ == "__main__":
    # List available backups
    backups_dir = Path('database_backups')
    if backups_dir.exists():
        backups = [d.name for d in backups_dir.iterdir() if d.is_dir()]
        
        if backups:
            print('\n📦 Available backups:')
            for idx, backup in enumerate(sorted(backups, reverse=True), 1):
                print(f'  {idx}. {backup}')
            
            print('\nEnter backup name or number:')
            choice = input('> ')
            
            if choice.isdigit() and 1 <= int(choice) <= len(backups):
                backup_name = sorted(backups, reverse=True)[int(choice) - 1]
            else:
                backup_name = choice
            
            asyncio.run(restore_database(backup_name))
        else:
            print('❌ No backups found in database_backups/')
    else:
        print('❌ Backups directory not found: database_backups/')
