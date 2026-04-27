from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.database import get_collection
from app.models.address import AddressCreate, AddressUpdate, Address
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter(prefix="/addresses", tags=["Addresses"])

@router.get("/", response_model=List[dict])
async def get_user_addresses(current_user: dict = Depends(get_current_user)):
    """Get all addresses for the current user"""
    try:
        addresses_collection = await get_collection("addresses")
        addresses = await addresses_collection.find(
            {"user_id": str(current_user["_id"])}
        ).sort("is_default", -1).to_list(length=100)
        
        # Convert ObjectId to string for JSON serialization
        for address in addresses:
            address["_id"] = str(address["_id"])
        
        return addresses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_address(
    address: AddressCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new address for the current user"""
    try:
        addresses_collection = await get_collection("addresses")
        
        # If this is marked as default, unset other default addresses
        if address.is_default:
            await addresses_collection.update_many(
                {"user_id": str(current_user["_id"]), "is_default": True},
                {"$set": {"is_default": False}}
            )
        
        address_dict = address.dict()
        address_dict["user_id"] = str(current_user["_id"])
        address_dict["created_at"] = datetime.utcnow()
        address_dict["updated_at"] = datetime.utcnow()
        
        result = await addresses_collection.insert_one(address_dict)
        
        new_address = await addresses_collection.find_one({"_id": result.inserted_id})
        new_address["_id"] = str(new_address["_id"])
        return new_address
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{address_id}")
async def get_address(
    address_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific address"""
    try:
        addresses_collection = await get_collection("addresses")
        address = await addresses_collection.find_one({
            "_id": ObjectId(address_id),
            "user_id": str(current_user["_id"])
        })
        
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")
        
        address["_id"] = str(address["_id"])
        return address
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{address_id}")
async def update_address(
    address_id: str,
    address_update: AddressUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an address"""
    try:
        addresses_collection = await get_collection("addresses")
        
        # Check if address belongs to user
        existing_address = await addresses_collection.find_one({
            "_id": ObjectId(address_id),
            "user_id": str(current_user["_id"])
        })
        
        if not existing_address:
            raise HTTPException(status_code=404, detail="Address not found")
        
        # If setting as default, unset other defaults
        if address_update.is_default:
            await addresses_collection.update_many(
                {"user_id": str(current_user["_id"]), "is_default": True},
                {"$set": {"is_default": False}}
            )
        
        update_data = {k: v for k, v in address_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        await addresses_collection.update_one(
            {"_id": ObjectId(address_id)},
            {"$set": update_data}
        )
        
        updated_address = await addresses_collection.find_one({"_id": ObjectId(address_id)})
        updated_address["_id"] = str(updated_address["_id"])
        return updated_address
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{address_id}")
async def delete_address(
    address_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an address"""
    try:
        addresses_collection = await get_collection("addresses")
        
        result = await addresses_collection.delete_one({
            "_id": ObjectId(address_id),
            "user_id": str(current_user["_id"])
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Address not found")
        
        return {"message": "Address deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{address_id}/set-default")
async def set_default_address(
    address_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Set an address as default"""
    try:
        addresses_collection = await get_collection("addresses")
        
        # Verify address belongs to user
        address = await addresses_collection.find_one({
            "_id": ObjectId(address_id),
            "user_id": str(current_user["_id"])
        })
        
        if not address:
            raise HTTPException(status_code=404, detail="Address not found")
        
        # Unset all other defaults
        await addresses_collection.update_many(
            {"user_id": str(current_user["_id"]), "is_default": True},
            {"$set": {"is_default": False}}
        )
        
        # Set this as default
        await addresses_collection.update_one(
            {"_id": ObjectId(address_id)},
            {"$set": {"is_default": True, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Default address updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
