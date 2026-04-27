from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from app.middleware.auth import get_current_user
from app.database import get_database
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter(prefix="/admin/bookings", tags=["admin-bookings"])

async def verify_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

class PaymentAction(BaseModel):
    action: str  # hold, release, refund
    amount: Optional[float] = None
    reason: Optional[str] = None

@router.get("/active")
async def get_active_bookings(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: dict = Depends(verify_admin)
):
    """Get all active bookings"""
    db = await get_database()
    
    query = {"status": {"$in": ["pending", "confirmed", "in_progress"]}}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.bookings.count_documents(query)
    
    # Enrich with user and service details
    enriched_bookings = []
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
        
        # Get customer info
        customer = await db.users.find_one({"_id": ObjectId(booking["customer_id"])})
        booking["customer_name"] = customer.get("name") if customer else "Unknown"
        booking["customer_email"] = customer.get("email") if customer else "Unknown"
        
        # Get tasker info
        tasker = await db.users.find_one({"_id": ObjectId(booking["tasker_id"])})
        booking["tasker_name"] = tasker.get("name") if tasker else "Unknown"
        booking["tasker_email"] = tasker.get("email") if tasker else "Unknown"
        
        # Get service info
        if "service_id" in booking:
            service = await db.services.find_one({"_id": ObjectId(booking["service_id"])})
            booking["service_title"] = service.get("title") if service else "Unknown"
            booking["service_category"] = service.get("category") if service else "Unknown"
        
        enriched_bookings.append(booking)
    
    return {"bookings": enriched_bookings, "total": total, "skip": skip, "limit": limit}

@router.get("/all")
async def get_all_bookings(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(verify_admin)
):
    """Get all bookings with advanced filtering"""
    db = await get_database()
    
    query = {}
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    
    bookings = await db.bookings.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.bookings.count_documents(query)
    
    # Enrich with details
    enriched_bookings = []
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
        
        customer = await db.users.find_one({"_id": ObjectId(booking["customer_id"])})
        tasker = await db.users.find_one({"_id": ObjectId(booking["tasker_id"])})
        
        booking["customer_name"] = customer.get("name") if customer else "Unknown"
        booking["tasker_name"] = tasker.get("name") if tasker else "Unknown"
        
        enriched_bookings.append(booking)
    
    return {"bookings": enriched_bookings, "total": total, "skip": skip, "limit": limit}

@router.get("/{booking_id}")
async def get_booking_details(booking_id: str, current_user: dict = Depends(verify_admin)):
    """Get detailed booking information"""
    db = await get_database()
    
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking["_id"] = str(booking["_id"])
    
    # Get full user details
    customer = await db.users.find_one({"_id": ObjectId(booking["customer_id"])})
    tasker = await db.users.find_one({"_id": ObjectId(booking["tasker_id"])})
    
    if customer:
        customer["_id"] = str(customer["_id"])
        customer.pop("password", None)
    if tasker:
        tasker["_id"] = str(tasker["_id"])
        tasker.pop("password", None)
    
    # Get service details
    service = None
    if "service_id" in booking:
        service = await db.services.find_one({"_id": ObjectId(booking["service_id"])})
        if service:
            service["_id"] = str(service["_id"])
    
    # Get payment history
    payments = await db.payments.find({"booking_id": booking_id}).to_list(length=None)
    for payment in payments:
        payment["_id"] = str(payment["_id"])
    
    return {
        "booking": booking,
        "customer": customer,
        "tasker": tasker,
        "service": service,
        "payments": payments
    }

@router.post("/{booking_id}/payment")
async def manage_payment(
    booking_id: str,
    action_request: PaymentAction,
    current_user: dict = Depends(verify_admin)
):
    """Manage payment for a booking (hold/release/refund)"""
    db = await get_database()
    
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if action_request.action == "hold":
        if booking.get("payment_status") != "completed":
            raise HTTPException(status_code=400, detail="Payment not completed yet")
        update_data["payment_status"] = "held"
        update_data["payment_held_at"] = datetime.utcnow()
        update_data["payment_held_by"] = current_user["_id"]
        update_data["payment_hold_reason"] = action_request.reason
        
    elif action_request.action == "release":
        if booking.get("payment_status") != "held":
            raise HTTPException(status_code=400, detail="Payment not on hold")
        update_data["payment_status"] = "released"
        update_data["payment_released_at"] = datetime.utcnow()
        update_data["payment_released_by"] = current_user["_id"]
        
    elif action_request.action == "refund":
        refund_amount = action_request.amount or booking.get("total_price", 0)
        update_data["payment_status"] = "refunded"
        update_data["refund_amount"] = refund_amount
        update_data["refunded_at"] = datetime.utcnow()
        update_data["refunded_by"] = current_user["_id"]
        update_data["refund_reason"] = action_request.reason
        
        # Create refund record
        await db.payments.insert_one({
            "booking_id": booking_id,
            "type": "refund",
            "amount": refund_amount,
            "status": "processed",
            "processed_by": current_user["_id"],
            "reason": action_request.reason,
            "created_at": datetime.utcnow()
        })
    else:
        raise HTTPException(status_code=400, detail="Invalid payment action")
    
    await db.bookings.update_one({"_id": ObjectId(booking_id)}, {"$set": update_data})
    
    return {"message": f"Payment {action_request.action} successful", "booking_id": booking_id}

@router.get("/analytics/timeline")
async def get_booking_timeline(days: int = 30, current_user: dict = Depends(verify_admin)):
    """Get booking analytics over time"""
    db = await get_database()
    
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {
            "$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "status": "$status"
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id.date": 1}}
    ]
    
    results = await db.bookings.aggregate(pipeline).to_list(length=None)
    
    return {
        "timeline": [
            {
                "date": item["_id"]["date"],
                "status": item["_id"]["status"],
                "count": item["count"]
            }
            for item in results
        ]
    }

@router.post("/{booking_id}/cancel")
async def admin_cancel_booking(
    booking_id: str,
    reason: str,
    current_user: dict = Depends(verify_admin)
):
    """Admin cancels a booking"""
    db = await get_database()
    
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.get("status") in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_by": "admin",
                "admin_id": current_user["_id"],
                "cancellation_reason": reason,
                "cancelled_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Booking cancelled successfully"}
