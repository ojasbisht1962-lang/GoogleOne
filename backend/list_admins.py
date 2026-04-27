"""
Script to list all SuperAdmin users from the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def list_superadmins():
    """List all superadmin users"""
    
    # Get MongoDB connection string
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "trustedhands")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]
    users_collection = db["users"]
    
    print("=" * 70)
    print("SUPERADMIN USERS")
    print("=" * 70)
    
    # Find all users with superadmin role
    admin_users = await users_collection.find({
        "$or": [
            {"role": "superadmin"},
            {"roles": "superadmin"}
        ]
    }).to_list(length=100)
    
    if not admin_users:
        print("\n❌ No SuperAdmin users found in the database!")
        print("\nTo create a SuperAdmin account, run: python create_admin.py")
    else:
        print(f"\n✅ Found {len(admin_users)} SuperAdmin user(s):\n")
        
        for idx, user in enumerate(admin_users, 1):
            print(f"{idx}. USER ID: {user['_id']}")
            print(f"   Name: {user.get('name', 'N/A')}")
            print(f"   Email: {user.get('email', 'N/A')}")
            print(f"   Role: {user.get('role', 'N/A')}")
            print(f"   Roles: {user.get('roles', [user.get('role', 'N/A')])}")
            print(f"   Google ID: {user.get('google_id', 'N/A')}")
            print(f"   Created: {user.get('created_at', 'N/A')}")
            print(f"   Blocked: {user.get('is_blocked', False)}")
            print("-" * 70)
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(list_superadmins())
