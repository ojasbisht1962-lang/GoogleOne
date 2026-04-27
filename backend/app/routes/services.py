"""
Commission rates for service jobs:
 - Technical job categories: 15% commission
 - Non-Technical job categories: 10% commission
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from app.middleware.auth import require_tasker, require_professional_badge, get_current_user
from app.database import get_collection
from app.models.service import Service, ServiceCategory, ServiceType, CATEGORY_TYPE_MAP
from app.models.user import TaskerType
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/services", tags=["Services"])

class CreateServiceRequest(BaseModel):
    title: str
    description: str
    category: ServiceCategory
    price: float
    price_unit: str = "per hour"
    images: Optional[List[str]] = []
    location: Optional[str] = None
    availability: Optional[List[str]] = []

class UpdateServiceRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    price_unit: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[str] = None
    availability: Optional[List[str]] = None
    is_active: Optional[bool] = None

@router.post("/")
async def create_service(
    service_data: CreateServiceRequest,
    current_user: dict = Depends(require_tasker)
):
    """Create a new service"""
    
    # Check if service type requires professional badge
    service_type = CATEGORY_TYPE_MAP.get(service_data.category, ServiceType.NON_TECHNICAL)
    
    if service_type == ServiceType.TECHNICAL:
        # Check if tasker has professional badge
        if not current_user.get("professional_badge", False):
            raise HTTPException(
                status_code=403,
                detail="You don't have a professional badge. Please apply for professional verification to offer technical services."
            )
    
    # Check price range
    price_ranges_collection = await get_collection("price_ranges")
    price_range = await price_ranges_collection.find_one({
        "category": service_data.category.value
    })
    
    if price_range:
        if service_data.price < price_range["min_price"] or service_data.price > price_range["max_price"]:
            raise HTTPException(
                status_code=400,
                detail=f"Price must be between {price_range['min_price']} and {price_range['max_price']}"
            )
    
    services_collection = await get_collection("services")
    
    new_service = Service(
        tasker_id=str(current_user["_id"]),
        title=service_data.title,
        description=service_data.description,
        category=service_data.category,
        service_type=service_type,
        price=service_data.price,
        price_unit=service_data.price_unit,
        images=service_data.images,
        location=service_data.location or current_user.get("address"),
        availability=service_data.availability,
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    result = await services_collection.insert_one(new_service.dict(by_alias=True, exclude={"id"}))
    
    created_service = await services_collection.find_one({"_id": result.inserted_id})
    created_service["_id"] = str(created_service["_id"])
    
    return created_service

@router.get("/")
async def get_services(
    category: Optional[ServiceCategory] = None,
    service_type: Optional[ServiceType] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    location: Optional[str] = None,
    tasker_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get list of services with filters"""
    services_collection = await get_collection("services")
    
    query = {}
    
    # Only filter by is_active if not filtering by specific tasker
    if not tasker_id:
        query["is_active"] = True
    
    if category:
        query["category"] = category.value
    
    if service_type:
        query["service_type"] = service_type.value
    
    if min_price or max_price:
        query["price"] = {}
        if min_price:
            query["price"]["$gte"] = min_price
        if max_price:
            query["price"]["$lte"] = max_price
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    if tasker_id:
        query["tasker_id"] = tasker_id
    
    cursor = services_collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    services = await cursor.to_list(length=limit)
    
    # Get tasker details for each service
    users_collection = await get_collection("users")
    for service in services:
        service["_id"] = str(service["_id"])
        tasker = await users_collection.find_one({"_id": ObjectId(service["tasker_id"])})
        if tasker:
            service["tasker"] = {
                "_id": str(tasker["_id"]),
                "name": tasker["name"],
                "profile_picture": tasker.get("profile_picture"),
                "tasker_type": tasker.get("tasker_type"),
                "professional_badge": tasker.get("professional_badge", False),
                "rating": tasker.get("rating", 0.0),
                "total_jobs": tasker.get("total_jobs", 0),
                "service_location": tasker.get("service_location")
            }
    
    return services

@router.get("/my-services")
async def get_my_services(current_user: dict = Depends(require_tasker)):
    """Get current tasker's services"""
    services_collection = await get_collection("services")
    
    cursor = services_collection.find({"tasker_id": str(current_user["_id"])}).sort("created_at", -1)
    services = await cursor.to_list(length=100)
    
    for service in services:
        service["_id"] = str(service["_id"])
    
    return services

@router.get("/{service_id}")
async def get_service(service_id: str):
    """Get service details"""
    services_collection = await get_collection("services")
    
    try:
        service = await services_collection.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid service ID")
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service["_id"] = str(service["_id"])
    # Commission split
    technical_categories = [
        "electrician", "plumber", "carpenter", "ac_servicing", "ro_servicing", "appliance_repair", "painting", "pest_control"
    ]
    commission_rate = 15 if service["category"] in technical_categories else 10
    split = 7.5 if commission_rate == 15 else 5
    service["customer_commission"] = split
    service["tasker_commission"] = split
    
    # Get tasker details
    users_collection = await get_collection("users")
    tasker = await users_collection.find_one({"_id": ObjectId(service["tasker_id"])})
    
    if tasker:
        tasker["_id"] = str(tasker["_id"])
        service["tasker"] = tasker
    
    return service

@router.put("/{service_id}")
async def update_service(
    service_id: str,
    update_data: UpdateServiceRequest,
    current_user: dict = Depends(require_tasker)
):
    """Update a service"""
    services_collection = await get_collection("services")
    
    try:
        service = await services_collection.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid service ID")
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service["tasker_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to update this service")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await services_collection.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update service")
    
    updated_service = await services_collection.find_one({"_id": ObjectId(service_id)})
    updated_service["_id"] = str(updated_service["_id"])
    
    return updated_service

@router.delete("/{service_id}")
async def delete_service(
    service_id: str,
    current_user: dict = Depends(require_tasker)
):
    """Delete a service"""
    services_collection = await get_collection("services")
    
    try:
        service = await services_collection.find_one({"_id": ObjectId(service_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid service ID")
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    if service["tasker_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this service")
    
    result = await services_collection.delete_one({"_id": ObjectId(service_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Failed to delete service")
    
    return {"message": "Service deleted successfully"}
