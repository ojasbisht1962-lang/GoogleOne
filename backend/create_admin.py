"""
Script to create a SuperAdmin user
Run this script to create your first admin account
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from app.routes.auth import hash_password
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def create_superadmin():
    """Create a superadmin user"""
    
    # Get MongoDB connection string
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "trustedhands")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]
    users_collection = db["users"]
    
    print("=" * 50)
    print("CREATE SUPERADMIN ACCOUNT")
    print("=" * 50)
    
    # Get admin details
    email = input("\nEnter admin email: ").strip().lower()
    password = input("Enter admin password: ").strip()
    name = input("Enter admin name: ").strip()
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": email})
    
    if existing_user:
        print(f"\n⚠️  User with email {email} already exists!")
        update = input("Update existing user to SuperAdmin? (y/n): ").strip().lower()
        
        if update == 'y':
            result = await users_collection.update_one(
                {"email": email},
                {
                    "$set": {
                        "role": "superadmin",
                        "roles": ["superadmin"],
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            print(f"\n✅ Successfully updated {email} to SuperAdmin!")
            print(f"\nLogin credentials:")
            print(f"Email: {email}")
            print(f"Role: SuperAdmin")
        else:
            print("\n❌ Operation cancelled.")
    else:
        # Hash password
        hashed_password = hash_password(password)
        
        # Create new admin user
        admin_user = {
            "email": email,
            "password": hashed_password,
            "name": name,
            "role": "superadmin",
            "roles": ["superadmin"],
            "is_blocked": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "profile_picture": None,
            "phone": None,
            "address": None,
            "gender": None
        }
        
        result = await users_collection.insert_one(admin_user)
        
        print(f"\n✅ SuperAdmin account created successfully!")
        print(f"\nLogin credentials:")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Role: SuperAdmin")
        print(f"\n⚠️  IMPORTANT: Save these credentials securely!")
    
    client.close()
    print("\n" + "=" * 50)

if __name__ == "__main__":
    asyncio.run(create_superadmin())
