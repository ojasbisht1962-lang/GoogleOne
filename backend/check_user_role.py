import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

async def check_users():
    """Check and display all users with their roles"""
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["trustedhands"]
    users_collection = db["users"]
    
    print("\n" + "="*80)
    print("ALL USERS IN DATABASE")
    print("="*80)
    
    users = await users_collection.find({}).to_list(length=None)
    
    for i, user in enumerate(users, 1):
        print(f"\n{i}. User ID: {user['_id']}")
        print(f"   Name: {user.get('name', 'N/A')}")
        print(f"   Email: {user.get('email', 'N/A')}")
        print(f"   Current Role: {user.get('role', 'N/A')}")
        print(f"   Roles Array: {user.get('roles', [])}")
        print(f"   Is Admin: {'Yes' if user.get('role') == 'superadmin' else 'No'}")
        print(f"   Created: {user.get('created_at', 'N/A')}")
    
    print("\n" + "="*80)
    print(f"Total Users: {len(users)}")
    print("="*80 + "\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
