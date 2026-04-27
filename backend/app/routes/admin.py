from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from app.middleware.auth import require_superadmin
from app.database import get_collection
from app.models.user import UserRole, VerificationStatus
from app.models.service import ServiceCategory, PriceRange
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
import secrets
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/admin", tags=["Admin"])

# Delete user route for admin
@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_superadmin)):
    users_collection = await get_collection("users")
    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

class UpdateVerificationRequest(BaseModel):
    status: VerificationStatus
    notes: Optional[str] = None

class BlockUserRequest(BaseModel):
    reason: str

class UpdateTaskerTypeRequest(BaseModel):
    tasker_type: str

class PriceRangeRequest(BaseModel):
    category: ServiceCategory
    min_price: float
    max_price: float
    recommended_price: Optional[float] = None

@router.get("/stats")
async def get_admin_stats(current_user: dict = Depends(require_superadmin)):
    """Get overall platform statistics"""
    users_collection = await get_collection("users")
    bookings_collection = await get_collection("bookings")
    services_collection = await get_collection("services")
    amc_collection = await get_collection("amc")
    
    # Multi-role compatible queries - check both roles array and role field
    total_customers = await users_collection.count_documents({
        "$or": [{"roles": UserRole.CUSTOMER.value}, {"role": UserRole.CUSTOMER.value}]
    })
    total_taskers = await users_collection.count_documents({
        "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}]
    })
    total_professionals = await users_collection.count_documents({
        "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}],
        "professional_badge": True
    })
    total_helpers = await users_collection.count_documents({
        "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}],
        "tasker_type": "helper"
    })
    
    pending_verifications = await users_collection.count_documents({
        "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}],
        "verification_status": VerificationStatus.PENDING.value
    })
    
    total_bookings = await bookings_collection.count_documents({})
    pending_bookings = await bookings_collection.count_documents({"status": "pending"})
    completed_bookings = await bookings_collection.count_documents({"status": "completed"})
    
    total_services = await services_collection.count_documents({"is_active": True})
    
    total_amc_requests = await amc_collection.count_documents({})
    pending_amc = await amc_collection.count_documents({"status": "pending"})
    
    return {
        "users": {
            "total_customers": total_customers,
            "total_taskers": total_taskers,
            "professionals": total_professionals,
            "helpers": total_helpers
        },
        "verifications": {
            "pending": pending_verifications
        },
        "bookings": {
            "total": total_bookings,
            "pending": pending_bookings,
            "completed": completed_bookings
        },
        "services": {
            "total": total_services
        },
        "amc": {
            "total": total_amc_requests,
            "pending": pending_amc
        }
    }

@router.get("/users")
async def get_all_users(
    role: Optional[UserRole] = None,
    is_blocked: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_superadmin)
):
    """Get all users with filters"""
    users_collection = await get_collection("users")
    
    query = {}
    if role:
        query["role"] = role.value
    if is_blocked is not None:
        query["is_blocked"] = is_blocked
    
    cursor = users_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    users = await cursor.to_list(length=limit)
    
    for user in users:
        user["_id"] = str(user["_id"])
    
    total = await users_collection.count_documents(query)
    
    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/taskers/pending-verification")
async def get_pending_verifications(
    current_user: dict = Depends(require_superadmin)
):
    """Get taskers with pending verification (includes document verification records)"""
    users_collection = await get_collection("users")
    documents_collection = await get_collection("verification_documents")
    
    # Get taskers with pending status
    cursor = users_collection.find({
        "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}],
        "verification_status": VerificationStatus.PENDING.value
    }).sort("created_at", 1)
    
    taskers = await cursor.to_list(length=100)
    
    # Enrich with document verification details
    for tasker in taskers:
        tasker["_id"] = str(tasker["_id"])
        
        # Get pending documents for this tasker
        pending_docs = await documents_collection.find({
            "user_id": tasker["_id"],
            "verification_status": {"$in": ["pending", "ai_processing"]}
        }).sort("uploaded_at", -1).to_list(length=10)
        
        for doc in pending_docs:
            doc["_id"] = str(doc["_id"])
        
        tasker["pending_documents"] = pending_docs
        tasker["document_count"] = len(pending_docs)
        
        # Add verification method info
        tasker["verification_method"] = tasker.get("verification_method", "unknown")
    
    return taskers

@router.put("/taskers/{tasker_id}/verification")
async def update_verification_status(
    tasker_id: str,
    verification_data: UpdateVerificationRequest,
    current_user: dict = Depends(require_superadmin)
):
    """
    STEP 2: Admin manual approval/rejection
    (Used when AI auto-verification fails or is uncertain in STEP 1)
    """
    users_collection = await get_collection("users")
    documents_collection = await get_collection("verification_documents")
    
    try:
        tasker = await users_collection.find_one({
            "_id": ObjectId(tasker_id),
            "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}]
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid tasker ID")
    
    if not tasker:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    update_data = {
        "verification_status": verification_data.status.value,
        "verification_method": "admin_manual_review",
        "updated_at": datetime.utcnow()
    }
    
    if verification_data.status == VerificationStatus.APPROVED:
        # STEP 2 APPROVAL: Grant professional status
        update_data["professional_badge"] = True
        update_data["tasker_type"] = "professional"
        update_data["work_as_professional"] = True
        
        # Mark all pending documents as verified by admin
        await documents_collection.update_many(
            {
                "user_id": tasker_id,
                "verification_status": {"$in": ["pending", "ai_processing"]}
            },
            {
                "$set": {
                    "verification_status": "verified",
                    "verified_by_admin": True,
                    "verified_at": datetime.utcnow(),
                    "admin_notes": verification_data.notes
                }
            }
        )
    else:
        # STEP 2 REJECTION: Mark documents as rejected
        await documents_collection.update_many(
            {
                "user_id": tasker_id,
                "verification_status": {"$in": ["pending", "ai_processing"]}
            },
            {
                "$set": {
                    "verification_status": "rejected",
                    "verified_by_admin": False,
                    "rejection_reason": verification_data.notes or "Did not meet verification criteria",
                    "admin_notes": verification_data.notes
                }
            }
        )
    
    result = await users_collection.update_one(
        {"_id": ObjectId(tasker_id)},
        {"$set": update_data}
    )
    
    # Notify tasker of STEP 2 result
    notification_type = (
        NotificationType.VERIFICATION_APPROVED 
        if verification_data.status == VerificationStatus.APPROVED 
        else NotificationType.VERIFICATION_REJECTED
    )
    
    message = (
        "✓ STEP 2 COMPLETE: Admin approved your professional verification! You are now a verified professional."
        if verification_data.status == VerificationStatus.APPROVED
        else f"✗ STEP 2: Your professional verification was not approved. {verification_data.notes or 'Please contact support for details.'}"
    )
    
    await create_notification(
        user_id=tasker_id,
        notification_type=notification_type,
        title=f"Verification {verification_data.status.value.title()}",
        message=message,
        link="/tasker/profile"
    )
    
    updated_tasker = await users_collection.find_one({"_id": ObjectId(tasker_id)})
    updated_tasker["_id"] = str(updated_tasker["_id"])
    
    return updated_tasker

@router.put("/users/{user_id}/block")
async def block_user(
    user_id: str,
    block_data: BlockUserRequest,
    current_user: dict = Depends(require_superadmin)
):
    """Block a user"""
    users_collection = await get_collection("users")
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] == UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Cannot block superadmin")
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_blocked": True, "updated_at": datetime.utcnow()}}
    )
    
    # Notify user
    await create_notification(
        user_id=user_id,
        notification_type=NotificationType.ACCOUNT_BLOCKED,
        title="Account Blocked",
        message=f"Your account has been blocked. Reason: {block_data.reason}",
        link="/contact-support"
    )
    
    return {"message": "User blocked successfully"}

@router.put("/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    current_user: dict = Depends(require_superadmin)
):
    """Unblock a user"""
    users_collection = await get_collection("users")
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_blocked": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "User unblocked successfully"}

@router.put("/users/{user_id}/tasker-type")
async def update_tasker_type(
    user_id: str,
    update_data: UpdateTaskerTypeRequest,
    current_user: dict = Depends(require_superadmin)
):
    """
    ⚠️ EMERGENCY OVERRIDE ONLY - Direct tasker type change
    
    WARNING: This endpoint bypasses the two-step document verification system.
    For regular professional upgrades, use PUT /admin/taskers/{tasker_id}/verification
    after taskers submit documents via the verification system.
    
    This should ONLY be used for:
    - Emergency account fixes
    - Special administrative overrides
    - Downgrading professionals to helpers
    
    All uses are logged for audit purposes.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    users_collection = await get_collection("users")
    
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["role"] != UserRole.TASKER.value:
        raise HTTPException(status_code=400, detail="User is not a tasker")
    
    if update_data.tasker_type not in ["helper", "professional"]:
        raise HTTPException(status_code=400, detail="Invalid tasker type")
    
    # AUDIT LOG: Track emergency override usage
    logger.warning(
        f"🚨 EMERGENCY OVERRIDE: Admin {current_user.get('email', current_user.get('_id'))} "
        f"directly changed tasker {user.get('email', user_id)} type to {update_data.tasker_type} "
        f"(bypassing document verification system)"
    )
    
    update_fields = {
        "tasker_type": update_data.tasker_type,
        "updated_at": datetime.utcnow(),
        "verification_method": "admin_emergency_override"  # Track override in user record
    }
    
    # If upgrading to professional
    if update_data.tasker_type == "professional":
        update_fields["work_as_professional"] = True
        update_fields["professional_badge"] = True
        update_fields["verification_status"] = VerificationStatus.APPROVED.value
        
        # Generate referral code if doesn't exist
        if not user.get("referral_code"):
            update_fields["referral_code"] = f"TH{secrets.token_hex(4).upper()}"
        
        # Notify tasker
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.VERIFICATION_APPROVED,
            title="Upgraded to Professional",
            message="Congratulations! Your account has been upgraded to Professional status by admin (emergency override).",
            link="/tasker/profile"
        )
    else:
        # Downgrading to helper
        update_fields["work_as_professional"] = False
        update_fields["professional_badge"] = False
        update_fields["verification_status"] = VerificationStatus.NOT_APPLIED.value
        
        # Notify tasker
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.VERIFICATION_REJECTED,
            title="Changed to Helper",
            message="Your account has been changed to Helper status by admin.",
            link="/tasker/profile"
        )
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update tasker type")
    
    updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
    updated_user["_id"] = str(updated_user["_id"])
    
    return updated_user

@router.get("/price-ranges")
async def get_price_ranges(current_user: dict = Depends(require_superadmin)):
    """Get all price ranges"""
    price_ranges_collection = await get_collection("price_ranges")
    
    cursor = price_ranges_collection.find({})
    price_ranges = await cursor.to_list(length=100)
    
    for pr in price_ranges:
        pr["_id"] = str(pr["_id"])
    
    return price_ranges

from fastapi import Request

@router.post("/price-ranges")
async def create_price_range(
    request: Request,
    current_user: dict = Depends(require_superadmin)
):
    """Create or update price range for a service category (capitalized)"""
    price_ranges_collection = await get_collection("price_ranges")
    data = await request.json()
    service_category = data.get("service_category")
    min_price = data.get("min_price")
    max_price = data.get("max_price")
    recommended_price = data.get("recommended_price")

    errors = []
    if not service_category:
        errors.append({"loc": ["service_category"], "msg": "field required", "type": "value_error.missing"})
    if min_price is None:
        errors.append({"loc": ["min_price"], "msg": "field required", "type": "value_error.missing"})
    if max_price is None:
        errors.append({"loc": ["max_price"], "msg": "field required", "type": "value_error.missing"})
    if min_price is not None and max_price is not None and min_price >= max_price:
        errors.append({"loc": ["min_price", "max_price"], "msg": "min_price must be less than max_price", "type": "value_error"})
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    # Check if price range already exists
    existing = await price_ranges_collection.find_one({
        "service_category": service_category
    })

    if existing:
        # Update existing
        await price_ranges_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "min_price": min_price,
                "max_price": max_price,
                "recommended_price": recommended_price,
                "updated_at": datetime.utcnow()
            }}
        )
        price_range = await price_ranges_collection.find_one({"_id": existing["_id"]})
        price_range["_id"] = str(price_range["_id"])
        return price_range
    else:
        # Create new
        new_price_range = {
            "service_category": service_category,
            "min_price": min_price,
            "max_price": max_price,
            "recommended_price": recommended_price,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await price_ranges_collection.insert_one(new_price_range)
        price_range_id = str(result.inserted_id)
        price_range = await price_ranges_collection.find_one({"_id": ObjectId(price_range_id)})
        price_range["_id"] = str(price_range["_id"])
        return price_range

@router.delete("/price-ranges/{id}")
async def delete_price_range(
    id: str,
    current_user: dict = Depends(require_superadmin)
):
    """Delete price range by _id (ObjectId)"""
    price_ranges_collection = await get_collection("price_ranges")
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid price range id")
    result = await price_ranges_collection.delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Price range not found")
    return {"message": "Price range deleted successfully"}

@router.get("/bookings")
async def get_all_bookings(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_superadmin)
):
    """Get all bookings"""
    bookings_collection = await get_collection("bookings")
    
    query = {}
    if status:
        query["status"] = status
    
    cursor = bookings_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    bookings = await cursor.to_list(length=limit)
    
    # Get additional details
    users_collection = await get_collection("users")
    services_collection = await get_collection("services")
    
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
        
        # Get customer
        customer = await users_collection.find_one({"_id": ObjectId(booking["customer_id"])})
        if customer:
            booking["customer"] = {
                "_id": str(customer["_id"]),
                "name": customer["name"],
                "email": customer["email"]
            }
            # Add flattened fields
            booking["customer_name"] = customer["name"]
            booking["customer_email"] = customer["email"]
        
        # Get tasker
        tasker = await users_collection.find_one({"_id": ObjectId(booking["tasker_id"])})
        if tasker:
            booking["tasker"] = {
                "_id": str(tasker["_id"]),
                "name": tasker["name"],
                "email": tasker["email"]
            }
            # Add flattened fields
            booking["tasker_name"] = tasker["name"]
            booking["tasker_email"] = tasker["email"]
        
        # Get service
        service = await services_collection.find_one({"_id": ObjectId(booking["service_id"])})
        if service:
            booking["service"] = {
                "_id": str(service["_id"]),
                "title": service["title"],
                "category": service["category"]
            }
            # Add flattened fields
            booking["service_name"] = service["title"]
            booking["service_category"] = service["category"]
        
        # Map backend fields to frontend expected fields
        booking["total_price"] = booking.get("total_amount", 0)
        booking["booking_date"] = booking.get("date")
        booking["scheduled_date"] = booking.get("date")
        booking["booking_time"] = booking.get("time_slot")
        booking["scheduled_time"] = booking.get("time_slot")
        
        # Ensure status is preserved - MongoDB should store it as string already
        # But explicitly ensure it's a string value in case it's stored differently
        if "status" not in booking or booking["status"] is None:
            booking["status"] = "pending"  # Default fallback
        else:
            # Convert to string and ensure lowercase
            booking["status"] = str(booking["status"]).lower()
    
    total = await bookings_collection.count_documents(query)
    
    return {
        "bookings": bookings,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/services")
async def get_all_services(
    current_user: dict = Depends(require_superadmin)
):
    """Get all services"""
    services_collection = await get_collection("services")
    
    cursor = services_collection.find({}).sort("created_at", -1)
    services = await cursor.to_list(length=200)
    
    # Get tasker details
    users_collection = await get_collection("users")
    
    for service in services:
        service["_id"] = str(service["_id"])
        
        tasker = await users_collection.find_one({"_id": ObjectId(service["tasker_id"])})
        if tasker:
            service["tasker"] = {
                "_id": str(tasker["_id"]),
                "name": tasker["name"],
                "email": tasker["email"]
            }
    
    return services
