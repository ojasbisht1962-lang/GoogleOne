from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.middleware.auth import get_current_user, require_tasker, require_superadmin
from app.database import get_collection
from app.models.user import User, UserRole, TaskerType, VerificationStatus
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
import secrets
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/users", tags=["Users"])

class UpdateUserProfile(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    languages_spoken: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    tasker_type: Optional[str] = None
    work_as_professional: Optional[bool] = None
    experience_years: Optional[int] = None
    service_location: Optional[dict] = None
    customer_location: Optional[dict] = None

class TaskerDetailsRequest(BaseModel):
    age: int
    phone: Optional[str] = None
    address: Optional[str] = None
    languages_spoken: List[str]
    criminal_record: bool
    work_as_professional: bool
    tasker_type: str
    referral_code: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[List[str]] = []
    service_location: Optional[dict] = None  # {"address": str, "coordinates": {"lat": float, "lng": float}}

class ServiceJobRequest(BaseModel):
    category: str
    title: str
    description: str
    price: float
    price_unit: str = "per hour"
    location: str = ""
    is_active: bool = True

ALLOWED_FOR_HELPERS = [
    "car_washing",
    "assignment_writing",
    "project_making",
    "other"
]

def can_post_service(user, category):
    if user["tasker_type"] == "professional" and user["verification_status"] == VerificationStatus.APPROVED.value:
        return True  # Can post any category
    if category in ALLOWED_FOR_HELPERS:
        return True  # Helpers and pending professionals can post only these
    return False  # Restrict all other categories

@router.get("/me")
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    current_user["_id"] = str(current_user["_id"])
    return current_user

@router.get("/service-jobs")
async def get_my_service_jobs(current_user: dict = Depends(get_current_user)):
    """Get all service jobs posted by the current tasker"""
    print(f"=== GET /users/service-jobs called ===")
    print(f"User ID: {current_user.get('_id')}")
    
    try:
        services_collection = await get_collection("services")
        
        tasker_id_str = str(current_user["_id"])
        print(f"Searching for services with tasker_id: {tasker_id_str}")
        
        services = await services_collection.find({
            "tasker_id": tasker_id_str
        }).to_list(length=None)
        
        print(f"Found {len(services)} services")
        
        # Convert ObjectId and datetime to string for JSON serialization
        result = []
        for service in services:
            service_dict = {}
            for key, value in service.items():
                if isinstance(value, ObjectId):
                    service_dict[key] = str(value)
                elif isinstance(value, datetime):
                    service_dict[key] = value.isoformat()
                else:
                    service_dict[key] = value
            result.append(service_dict)
        
        print(f"Returning {len(result)} services")
        return {"services": result, "count": len(result)}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in get_my_service_jobs: {e}")
        print(f"Traceback: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error fetching services: {str(e)}")

@router.get("/{user_id}")
async def get_user_by_id(user_id: str):
    users_collection = await get_collection("users")
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_blocked", False):
        raise HTTPException(status_code=403, detail="This user is not available")
    user["_id"] = str(user["_id"])
    
    # Remove sensitive information
    user.pop("password", None)
    user.pop("google_id", None)
    
    return user

@router.put("/me")
async def update_current_user_profile(
    profile_data: UpdateUserProfile,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    users_collection = await get_collection("users")
    
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Always set tasker_type to 'helper' unless 'professional' is requested
    if profile_data.tasker_type == "professional":
        if current_user.get("tasker_type") != "professional":
            update_data["tasker_type"] = "professional"
            update_data["verification_status"] = VerificationStatus.PENDING.value
            if not current_user.get("referral_code"):
                update_data["referral_code"] = f"TH{secrets.token_hex(4).upper()}"
            await create_notification(
                user_id=str(current_user["_id"]),
                notification_type=NotificationType.VERIFICATION_APPROVED,
                title="Professional Upgrade Request",
                message="Your request to upgrade to professional status has been submitted for review."
            )
    else:
        if current_user.get("tasker_type") != "helper":
            update_data["tasker_type"] = "helper"
            update_data["verification_status"] = VerificationStatus.NOT_APPLIED.value
    
    result = await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        # Check if no changes were made
        if not update_data:
            raise HTTPException(status_code=400, detail="No changes to update")
    
    updated_user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    
    return updated_user

@router.post("/tasker/complete-profile")
async def complete_tasker_profile(
    details: TaskerDetailsRequest,
    current_user: dict = Depends(require_tasker)
):
    """Complete tasker profile with additional details"""
    users_collection = await get_collection("users")
    
    # Validate referral code if professional work is requested
    if details.work_as_professional and details.referral_code:
        referrer = await users_collection.find_one({
            "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}],
            "professional_badge": True,
            "referral_code": details.referral_code
        })
        
        if not referrer:
            raise HTTPException(status_code=404, detail="Invalid referral code")
    
    # Enforce tasker_type logic: default to 'helper', set to 'professional' only with pending status
    referral_code = f"TH{secrets.token_hex(4).upper()}"
    if details.work_as_professional:
        update_data = {
            "age": details.age,
            "phone": details.phone,
            "address": details.address,
            "languages_spoken": details.languages_spoken,
            "criminal_record": details.criminal_record,
            "work_as_professional": True,
            "tasker_type": "professional",
            "verification_status": VerificationStatus.PENDING.value,
            "bio": details.bio,
            "experience_years": details.experience_years,
            "skills": details.skills,
            "referral_code": referral_code,
            "updated_at": datetime.utcnow()
        }
    else:
        update_data = {
            "age": details.age,
            "phone": details.phone,
            "address": details.address,
            "languages_spoken": details.languages_spoken,
            "criminal_record": details.criminal_record,
            "work_as_professional": False,
            "tasker_type": "helper",
            "verification_status": VerificationStatus.NOT_APPLIED.value,
            "bio": details.bio,
            "experience_years": details.experience_years,
            "skills": details.skills,
            "referral_code": referral_code,
            "updated_at": datetime.utcnow()
        }
    
    if details.referral_code:
        update_data["referred_by"] = str(referrer["_id"])
        # If referred by a professional, auto-approve
        update_data["professional_badge"] = True
        update_data["verification_status"] = VerificationStatus.APPROVED.value
    
    result = await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update profile")
    
    # Create notification if verification is pending
    if update_data["verification_status"] == VerificationStatus.PENDING.value and not details.referral_code:
        await create_notification(
            user_id=str(current_user["_id"]),
            notification_type=NotificationType.VERIFICATION_APPROVED,
            title="Verification Request Submitted",
            message="Your professional verification request has been submitted and is pending review."
        )
    
    updated_user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    
    return updated_user

@router.get("/taskers")
async def get_taskers(
    tasker_type: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = None,
    skip: int = 0,
    limit: int = 20
):
    """Get list of taskers with filters"""
    try:
        users_collection = await get_collection("users")
        
        # Query for users who have tasker in their roles array OR have role=tasker
        query = {
            "$or": [
                {"roles": UserRole.TASKER.value},  # Multi-role users
                {"role": UserRole.TASKER.value}    # Single-role users (backwards compat)
            ],
            "is_blocked": {"$ne": True}
        }
        
        if tasker_type:
            query["tasker_type"] = tasker_type
        
        if location:
            query["address"] = {"$regex": location, "$options": "i"}
        
        if min_rating:
            query["rating"] = {"$gte": min_rating}
        
        cursor = users_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        taskers = await cursor.to_list(length=limit)
        
        for tasker in taskers:
            tasker["_id"] = str(tasker["_id"])
            # Remove sensitive information
            tasker.pop("password", None)
            tasker.pop("google_id", None)
        
        return taskers
    except Exception as e:
        print(f"Error in get_taskers: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/taskers/{tasker_id}")
async def get_tasker_details(tasker_id: str):
    """Get detailed information about a specific tasker"""
    users_collection = await get_collection("users")
    
    try:
        tasker = await users_collection.find_one({
            "_id": ObjectId(tasker_id),
            "$or": [{"roles": UserRole.TASKER.value}, {"role": UserRole.TASKER.value}]
        })
    except:
        raise HTTPException(status_code=400, detail="Invalid tasker ID")
    
    if not tasker:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    if tasker.get("is_blocked", False):
        raise HTTPException(status_code=403, detail="This tasker is not available")
    
    tasker["_id"] = str(tasker["_id"])
    
    # Get tasker's services
    services_collection = await get_collection("services")
    services_cursor = services_collection.find({
        "tasker_id": tasker_id,
        "is_active": True
    })
    services = await services_cursor.to_list(length=100)
    
    for service in services:
        service["_id"] = str(service["_id"])
    
    tasker["services"] = services
    
    return tasker

@router.post("/service-jobs")
async def create_service_job(
    request: ServiceJobRequest,
    current_user: dict = Depends(get_current_user)
):
    # Restrict job posting based on user type and category
    if not can_post_service(current_user, request.category):
        if current_user["tasker_type"] == "helper":
            raise HTTPException(status_code=403, detail="Failed to post job. Apply for professional badge to post jobs in this category.")
        elif current_user["tasker_type"] == "professional" and current_user["verification_status"] == VerificationStatus.PENDING.value:
            raise HTTPException(status_code=403, detail="Failed to post your job. Your professional badge status is pending.")
    
    # Create the service job
    services_collection = await get_collection("services")
    
    # Use tasker's service location if available, otherwise use provided location
    service_location = current_user.get("service_location", None)
    location_address = service_location.get("address") if service_location else request.location
    
    service_doc = {
        "tasker_id": str(current_user["_id"]),
        "tasker_name": current_user.get("name", "Unknown"),
        "category": request.category,
        "title": request.title,
        "description": request.description,
        "price": request.price,
        "price_unit": request.price_unit,
        "location": location_address,
        "service_location": service_location,  # Include full location with coordinates
        "is_active": request.is_active,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await services_collection.insert_one(service_doc)
    
    return {"message": "Job posted successfully", "service_id": str(result.inserted_id)}

@router.put("/service-jobs/{service_id}")
async def update_service_job(
    service_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a service job (e.g., toggle is_active status)"""
    services_collection = await get_collection("services")
    
    # Check if service belongs to current user
    service = await services_collection.find_one({
        "_id": ObjectId(service_id),
        "tasker_id": str(current_user["_id"])
    })
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Update the service with provided data
    update_fields = {k: v for k, v in update_data.items() if k in ['is_active', 'title', 'description', 'price', 'price_unit', 'location']}
    update_fields["updated_at"] = datetime.utcnow()
    
    await services_collection.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": update_fields}
    )
    
    return {"message": "Service updated successfully"}

@router.delete("/service-jobs/{service_id}")
async def delete_service_job(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a service job"""
    services_collection = await get_collection("services")
    
    # Check if service belongs to current user
    service = await services_collection.find_one({
        "_id": ObjectId(service_id),
        "tasker_id": str(current_user["_id"])
    })
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    await services_collection.delete_one({"_id": ObjectId(service_id)})
    
    return {"message": "Service deleted successfully"}

@router.put("/update-service-location")
async def update_service_location(
    location_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update tasker's service location and propagate to all their services"""
    users_collection = await get_collection("users")
    services_collection = await get_collection("services")
    
    # Validate location data
    if not location_data.get("address") or not location_data.get("coordinates"):
        raise HTTPException(status_code=400, detail="Invalid location data. Must include address and coordinates")
    
    # Update user's service location
    result = await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "service_location": location_data,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update location")
    
    # Update all services with the new location
    services_update_result = await services_collection.update_many(
        {"tasker_id": str(current_user["_id"])},
        {
            "$set": {
                "location": location_data.get("address"),
                "service_location": location_data,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Service location updated successfully",
        "services_updated": services_update_result.modified_count
    }

@router.put("/update-customer-location")
async def update_customer_location(
    location_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update customer's location (separate from tasker location)"""
    users_collection = await get_collection("users")
    
    # Validate location data
    if not location_data.get("address") or not location_data.get("coordinates"):
        raise HTTPException(status_code=400, detail="Invalid location data. Must include address and coordinates")
    
    # Update user's customer location
    result = await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "customer_location": location_data,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update location")
    
    # Get updated user
    updated_user = await users_collection.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    
    return {
        "message": "Customer location updated successfully",
        "user": updated_user
    }

