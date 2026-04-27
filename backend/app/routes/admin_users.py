from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from app.middleware.auth import get_current_user
from app.database import get_database
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

async def verify_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

class UserActionRequest(BaseModel):
    action: str  # block, unblock, verify, reject
    reason: Optional[str] = None

@router.get("/customers")
async def get_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    current_user: dict = Depends(verify_admin)
):
    """Get all customers with filtering"""
    db = await get_database()
    
    query = {"roles": "customer"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if is_blocked is not None:
        query["is_blocked"] = is_blocked
    
    customers = await db.users.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.users.count_documents(query)
    
    # Enrich with booking stats
    enriched_customers = []
    for customer in customers:
        customer["_id"] = str(customer["_id"])
        customer_id = customer["_id"]
        
        # Get booking stats
        total_bookings = await db.bookings.count_documents({"customer_id": customer_id})
        completed_bookings = await db.bookings.count_documents({"customer_id": customer_id, "status": "completed"})
        
        # Calculate total spent
        spent_pipeline = [
            {"$match": {"customer_id": customer_id, "status": "completed", "payment_status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
        ]
        spent_result = await db.bookings.aggregate(spent_pipeline).to_list(length=1)
        total_spent = spent_result[0]["total"] if spent_result else 0
        
        customer["stats"] = {
            "total_bookings": total_bookings,
            "completed_bookings": completed_bookings,
            "total_spent": total_spent
        }
        enriched_customers.append(customer)
    
    return {"customers": enriched_customers, "total": total, "skip": skip, "limit": limit}

@router.get("/taskers")
async def get_taskers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    verification_status: Optional[str] = None,
    current_user: dict = Depends(verify_admin)
):
    """Get all taskers with filtering"""
    db = await get_database()
    
    query = {"roles": "tasker"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if is_blocked is not None:
        query["is_blocked"] = is_blocked
    if verification_status:
        query["verification_status"] = verification_status
    
    taskers = await db.users.find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db.users.count_documents(query)
    
    # Enrich with performance stats
    enriched_taskers = []
    for tasker in taskers:
        tasker["_id"] = str(tasker["_id"])
        tasker_id = tasker["_id"]
        
        # Get booking stats
        total_bookings = await db.bookings.count_documents({"tasker_id": tasker_id})
        completed_bookings = await db.bookings.count_documents({"tasker_id": tasker_id, "status": "completed"})
        
        # Calculate total earnings
        earnings_pipeline = [
            {"$match": {"tasker_id": tasker_id, "status": "completed", "payment_status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
        ]
        earnings_result = await db.bookings.aggregate(earnings_pipeline).to_list(length=1)
        total_earnings = earnings_result[0]["total"] if earnings_result else 0
        
        # Get average rating
        rating_pipeline = [
            {"$match": {"tasker_id": tasker_id, "rating": {"$exists": True}}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
        ]
        rating_result = await db.bookings.aggregate(rating_pipeline).to_list(length=1)
        avg_rating = rating_result[0]["avg"] if rating_result else 0
        
        # Get badge info
        badges = await db.badge_applications.find(
            {"tasker_id": tasker_id, "status": "approved"}
        ).to_list(length=None)
        
        tasker["stats"] = {
            "total_bookings": total_bookings,
            "completed_bookings": completed_bookings,
            "total_earnings": total_earnings,
            "avg_rating": round(avg_rating, 2) if avg_rating else 0,
            "badges": [b["badge_type"] for b in badges]
        }
        enriched_taskers.append(tasker)
    
    return {"taskers": enriched_taskers, "total": total, "skip": skip, "limit": limit}

@router.post("/customers/{user_id}/action")
async def customer_action(
    user_id: str,
    request: UserActionRequest,
    current_user: dict = Depends(verify_admin)
):
    """Perform actions on customer account"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(user_id), "roles": "customer"})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if request.action == "block":
        update_data["is_blocked"] = True
        update_data["block_reason"] = request.reason
        update_data["blocked_at"] = datetime.utcnow()
        update_data["blocked_by"] = current_user["_id"]
    elif request.action == "unblock":
        update_data["is_blocked"] = False
        update_data["$unset"] = {"block_reason": "", "blocked_at": "", "blocked_by": ""}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    return {"message": f"Customer {request.action}ed successfully"}

@router.post("/taskers/{user_id}/action")
async def tasker_action(
    user_id: str,
    request: UserActionRequest,
    current_user: dict = Depends(verify_admin)
):
    """Perform actions on tasker account"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(user_id), "roles": "tasker"})
    if not user:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if request.action == "block":
        update_data["is_blocked"] = True
        update_data["block_reason"] = request.reason
        update_data["blocked_at"] = datetime.utcnow()
        update_data["blocked_by"] = current_user["_id"]
    elif request.action == "unblock":
        update_data["is_blocked"] = False
        update_data["$unset"] = {"block_reason": "", "blocked_at": "", "blocked_by": ""}
    elif request.action == "verify":
        update_data["verification_status"] = "verified"
        update_data["verified_at"] = datetime.utcnow()
        update_data["verified_by"] = current_user["_id"]
    elif request.action == "reject":
        update_data["verification_status"] = "rejected"
        update_data["rejection_reason"] = request.reason
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    return {"message": f"Tasker {request.action}ed successfully"}

@router.get("/customers/{user_id}/details")
async def get_customer_details(user_id: str, current_user: dict = Depends(verify_admin)):
    """Get detailed customer information"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(user_id), "roles": "customer"})
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    user["_id"] = str(user["_id"])
    
    # Get booking history
    bookings = await db.bookings.find({"customer_id": user_id}).sort("created_at", -1).limit(20).to_list(length=20)
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
    
    # Get complaints
    complaints = await db.support_tickets.find({"user_id": user_id}).sort("created_at", -1).to_list(length=None)
    for complaint in complaints:
        complaint["_id"] = str(complaint["_id"])
    
    return {
        "user": user,
        "recent_bookings": bookings,
        "complaints": complaints
    }

@router.get("/taskers/{user_id}/details")
async def get_tasker_details(user_id: str, current_user: dict = Depends(verify_admin)):
    """Get detailed tasker information"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(user_id), "roles": "tasker"})
    if not user:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    user["_id"] = str(user["_id"])
    
    # Get booking history
    bookings = await db.bookings.find({"tasker_id": user_id}).sort("created_at", -1).limit(20).to_list(length=20)
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
    
    # Get services
    services = await db.services.find({"tasker_id": user_id}).to_list(length=None)
    for service in services:
        service["_id"] = str(service["_id"])
    
    # Get complaints
    complaints = await db.support_tickets.find({"user_id": user_id}).sort("created_at", -1).to_list(length=None)
    for complaint in complaints:
        complaint["_id"] = str(complaint["_id"])
    
    # Get badge applications
    badge_apps = await db.badge_applications.find({"tasker_id": user_id}).sort("application_date", -1).to_list(length=None)
    for app in badge_apps:
        app["_id"] = str(app["_id"])
    
    return {
        "user": user,
        "recent_bookings": bookings,
        "services": services,
        "complaints": complaints,
        "badge_applications": badge_apps
    }
