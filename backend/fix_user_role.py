import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_user_role(email, correct_role):
    """Fix a user's role back to the correct value"""
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["trustedhands"]
    users_collection = db["users"]
    
    print(f"\nSearching for user with email: {email}")
    user = await users_collection.find_one({"email": email})
    
    if not user:
        print(f"❌ User with email {email} not found!")
        client.close()
        return
    
    print(f"\nCurrent user data:")
    print(f"  Name: {user.get('name', 'N/A')}")
    print(f"  Email: {user.get('email', 'N/A')}")
    print(f"  Current Role: {user.get('role', 'N/A')}")
    print(f"  Roles Array: {user.get('roles', [])}")
    
    # Update the role
    result = await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "role": correct_role,
                "roles": [correct_role]
            }
        }
    )
    
    if result.modified_count > 0:
        print(f"\n✅ Successfully updated user role to: {correct_role}")
        
        # Verify the update
        updated_user = await users_collection.find_one({"_id": user["_id"]})
        print(f"\nUpdated user data:")
        print(f"  Name: {updated_user.get('name', 'N/A')}")
        print(f"  Email: {updated_user.get('email', 'N/A')}")
        print(f"  New Role: {updated_user.get('role', 'N/A')}")
        print(f"  New Roles Array: {updated_user.get('roles', [])}")
    else:
        print(f"\n⚠️  No changes made (role was already {correct_role})")
    
    client.close()

if __name__ == "__main__":
    print("="*80)
    print("USER ROLE FIX UTILITY")
    print("="*80)
    print("\nPlease enter the user's email and the correct role")
    print("Valid roles: customer, tasker, superadmin")
    print()
    
    email = input("User email: ").strip().lower()
    correct_role = input("Correct role (customer/tasker/superadmin): ").strip().lower()
    
    if correct_role not in ['customer', 'tasker', 'superadmin']:
        print(f"\n❌ Invalid role: {correct_role}")
        print("Valid roles are: customer, tasker, superadmin")
    else:
        asyncio.run(fix_user_role(email, correct_role))
