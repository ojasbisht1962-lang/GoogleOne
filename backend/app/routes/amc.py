from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.middleware.auth import require_customer, get_current_user, require_superadmin
from app.database import get_collection
from app.models.amc import AMC, AMCStatus, AMCServiceType
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/amc", tags=["AMC"])

class CreateAMCRequest(BaseModel):
    company_name: str
    contact_person: str
    contact_email: EmailStr
    contact_phone: str
    address: str
    service_types: List[AMCServiceType]
    description: str
    duration_months: int = 12
    frequency: str
    preferred_days: Optional[List[str]] = []
    preferred_time: Optional[str] = None
    estimated_budget: Optional[float] = None

class UpdateAMCStatusRequest(BaseModel):
    status: AMCStatus
    quoted_price: Optional[float] = None
    admin_notes: Optional[str] = None
    assigned_taskers: Optional[List[str]] = []

@router.post("/")
async def create_amc_request(
    amc_data: CreateAMCRequest,
    current_user: dict = Depends(require_customer)
):
    """Create an AMC request"""
    amc_collection = await get_collection("amc")
    
    new_amc = AMC(
        customer_id=str(current_user["_id"]),
        company_name=amc_data.company_name,
        contact_person=amc_data.contact_person,
        contact_email=amc_data.contact_email,
        contact_phone=amc_data.contact_phone,
        address=amc_data.address,
        service_types=amc_data.service_types,
        description=amc_data.description,
        duration_months=amc_data.duration_months,
        frequency=amc_data.frequency,
        preferred_days=amc_data.preferred_days,
        preferred_time=amc_data.preferred_time,
        estimated_budget=amc_data.estimated_budget,
        status=AMCStatus.PENDING,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    result = await amc_collection.insert_one(new_amc.dict(by_alias=True, exclude={"id"}))
    
    # Notify all superadmins
    users_collection = await get_collection("users")
    superadmins = users_collection.find({"role": "superadmin"})
    
    async for admin in superadmins:
        await create_notification(
            user_id=str(admin["_id"]),
            notification_type=NotificationType.AMC_REQUEST,
            title="New AMC Request",
            message=f"New AMC request from {amc_data.company_name}",
            link=f"/admin/amc/{result.inserted_id}"
        )
    
    created_amc = await amc_collection.find_one({"_id": result.inserted_id})
    created_amc["_id"] = str(created_amc["_id"])
    
    return created_amc

@router.get("/my-requests")
async def get_my_amc_requests(current_user: dict = Depends(require_customer)):
    """Get AMC requests by current customer"""
    amc_collection = await get_collection("amc")
    
    cursor = amc_collection.find({"customer_id": str(current_user["_id"])}).sort("created_at", -1)
    amc_requests = await cursor.to_list(length=100)
    
    for amc in amc_requests:
        amc["_id"] = str(amc["_id"])
    
    return amc_requests

@router.get("/all")
async def get_all_amc_requests(
    status: Optional[AMCStatus] = None,
    current_user: dict = Depends(require_superadmin)
):
    """Get all AMC requests (SuperAdmin only)"""
    amc_collection = await get_collection("amc")
    
    query = {}
    if status:
        query["status"] = status.value
    
    cursor = amc_collection.find(query).sort("created_at", -1)
    amc_requests = await cursor.to_list(length=200)
    
    # Get customer details
    users_collection = await get_collection("users")
    
    for amc in amc_requests:
        amc["_id"] = str(amc["_id"])
        
        customer = await users_collection.find_one({"_id": ObjectId(amc["customer_id"])})
        if customer:
            amc["customer"] = {
                "_id": str(customer["_id"]),
                "name": customer["name"],
                "email": customer["email"],
                "phone": customer.get("phone")
            }
    
    return amc_requests

@router.get("/{amc_id}")
async def get_amc_request(
    amc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get AMC request details"""
    amc_collection = await get_collection("amc")
    
    try:
        amc = await amc_collection.find_one({"_id": ObjectId(amc_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid AMC ID")
    
    if not amc:
        raise HTTPException(status_code=404, detail="AMC request not found")
    
    # Check authorization
    if amc["customer_id"] != str(current_user["_id"]) and current_user["role"] != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized to view this AMC request")
    
    amc["_id"] = str(amc["_id"])
    
    # Get customer details
    users_collection = await get_collection("users")
    customer = await users_collection.find_one({"_id": ObjectId(amc["customer_id"])})
    if customer:
        amc["customer"] = {
            "_id": str(customer["_id"]),
            "name": customer["name"],
            "email": customer["email"],
            "phone": customer.get("phone")
        }
    
    return amc

@router.put("/{amc_id}/status")
async def update_amc_status(
    amc_id: str,
    status_data: UpdateAMCStatusRequest,
    current_user: dict = Depends(require_superadmin)
):
    """Update AMC request status (SuperAdmin only)"""
    amc_collection = await get_collection("amc")
    
    try:
        amc = await amc_collection.find_one({"_id": ObjectId(amc_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid AMC ID")
    
    if not amc:
        raise HTTPException(status_code=404, detail="AMC request not found")
    
    update_data = {
        "status": status_data.status.value,
        "updated_at": datetime.utcnow()
    }
    
    if status_data.quoted_price is not None:
        update_data["quoted_price"] = status_data.quoted_price
    
    if status_data.admin_notes:
        update_data["admin_notes"] = status_data.admin_notes
    
    if status_data.assigned_taskers:
        update_data["assigned_taskers"] = status_data.assigned_taskers
    
    if status_data.status == AMCStatus.ACTIVE:
        update_data["start_date"] = datetime.utcnow()
        # Calculate end date based on duration
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta
        update_data["end_date"] = datetime.utcnow() + relativedelta(months=amc["duration_months"])
    
    result = await amc_collection.update_one(
        {"_id": ObjectId(amc_id)},
        {"$set": update_data}
    )
    
    # Notify customer
    notification_type_map = {
        AMCStatus.APPROVED: NotificationType.AMC_APPROVED,
        AMCStatus.REJECTED: NotificationType.AMC_REJECTED,
    }
    
    if status_data.status in notification_type_map:
        await create_notification(
            user_id=amc["customer_id"],
            notification_type=notification_type_map[status_data.status],
            title=f"AMC Request {status_data.status.value.title()}",
            message=f"Your AMC request for {amc['company_name']} has been {status_data.status.value}",
            link=f"/customer/amc/{amc_id}"
        )
    
    updated_amc = await amc_collection.find_one({"_id": ObjectId(amc_id)})
    updated_amc["_id"] = str(updated_amc["_id"])
    
    return updated_amc
