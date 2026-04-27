from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
from app.middleware.auth import get_current_user
from app.database import get_database
from app.models.badge import BadgeApplication, BADGE_CRITERIA, BADGE_INFO
from bson import ObjectId

router = APIRouter(prefix="/badges", tags=["badges"])

async def calculate_tasker_stats(tasker_id: str, db):
    """Calculate tasker statistics for badge eligibility"""
    
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(tasker_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Tasker not found")
    
    # Calculate account age
    created_at = user.get("created_at", datetime.utcnow())
    account_age_days = (datetime.utcnow() - created_at).days
    
    # Get bookings statistics
    total_bookings = await db.bookings.count_documents({
        "tasker_id": tasker_id,
        "status": "completed"
    })
    
    # Calculate cancellation rate
    cancelled_bookings = await db.bookings.count_documents({
        "tasker_id": tasker_id,
        "status": "cancelled",
        "cancelled_by": "tasker"
    })
    all_bookings = await db.bookings.count_documents({"tasker_id": tasker_id})
    cancellation_rate = (cancelled_bookings / all_bookings * 100) if all_bookings > 0 else 0
    
    # Calculate average rating and total reviews
    services = await db.services.find({"tasker_id": tasker_id}).to_list(length=None)
    total_rating = 0
    total_reviews = 0
    for service in services:
        reviews = service.get("reviews", [])
        total_reviews += len(reviews)
        for review in reviews:
            total_rating += review.get("rating", 0)
    
    average_rating = (total_rating / total_reviews) if total_reviews > 0 else 0
    
    # Calculate repeat customer rate
    completed_bookings = await db.bookings.find({
        "tasker_id": tasker_id,
        "status": "completed"
    }).to_list(length=None)
    
    customer_booking_count = {}
    for booking in completed_bookings:
        customer_id = booking.get("customer_id")
        customer_booking_count[customer_id] = customer_booking_count.get(customer_id, 0) + 1
    
    repeat_customers = sum(1 for count in customer_booking_count.values() if count > 1)
    repeat_customer_rate = (repeat_customers / len(customer_booking_count) * 100) if customer_booking_count else 0
    
    # Calculate on-time completion rate
    on_time_bookings = await db.bookings.count_documents({
        "tasker_id": tasker_id,
        "status": "completed",
        "completed_on_time": True
    })
    on_time_completion_rate = (on_time_bookings / total_bookings * 100) if total_bookings > 0 else 0
    
    # Mock response time (in real app, track message response times)
    response_time_hours = 2.5  # Default mock value
    
    # Check verification status
    is_verified = user.get("verification_status") == "approved"
    
    return {
        "total_bookings": total_bookings,
        "average_rating": round(average_rating, 2),
        "total_reviews": total_reviews,
        "account_age_days": account_age_days,
        "cancellation_rate": round(cancellation_rate, 2),
        "response_time_hours": response_time_hours,
        "repeat_customer_rate": round(repeat_customer_rate, 2),
        "on_time_completion_rate": round(on_time_completion_rate, 2),
        "is_verified": is_verified
    }

async def check_badge_eligibility(stats: dict, badge_type: str):
    """Check if tasker meets criteria for specific badge"""
    criteria = BADGE_CRITERIA.get(badge_type)
    if not criteria:
        return False, {}
    
    checks = {
        "min_bookings": stats["total_bookings"] >= criteria.min_bookings,
        "min_rating": stats["average_rating"] >= criteria.min_rating,
        "min_reviews": stats["total_reviews"] >= criteria.min_reviews,
        "account_age": stats["account_age_days"] >= criteria.min_account_age_days,
        "cancellation_rate": stats["cancellation_rate"] <= criteria.max_cancellation_rate,
        "response_time": stats["response_time_hours"] <= criteria.max_response_time_hours,
        "repeat_customers": stats["repeat_customer_rate"] >= criteria.min_repeat_customer_rate,
        "on_time_completion": stats["on_time_completion_rate"] >= criteria.min_on_time_rate,
        "verification": stats["is_verified"] if criteria.background_verification_required else True
    }
    
    meets_all = all(checks.values())
    
    criteria_details = {
        "checks": checks,
        "required": {
            "bookings": f"{stats['total_bookings']}/{criteria.min_bookings}",
            "rating": f"{stats['average_rating']}/{criteria.min_rating}",
            "reviews": f"{stats['total_reviews']}/{criteria.min_reviews}",
            "account_age_days": f"{stats['account_age_days']}/{criteria.min_account_age_days}",
            "cancellation_rate": f"{stats['cancellation_rate']}% (max {criteria.max_cancellation_rate}%)",
            "response_time": f"{stats['response_time_hours']}h (max {criteria.max_response_time_hours}h)",
            "repeat_customers": f"{stats['repeat_customer_rate']}% (min {criteria.min_repeat_customer_rate}%)",
            "on_time_rate": f"{stats['on_time_completion_rate']}% (min {criteria.min_on_time_rate}%)",
            "verified": stats["is_verified"]
        }
    }
    
    return meets_all, criteria_details

@router.get("/check-eligibility/{badge_type}")
async def check_eligibility(
    badge_type: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Check if current tasker is eligible for a badge"""
    if badge_type not in BADGE_CRITERIA:
        raise HTTPException(status_code=400, detail="Invalid badge type")
    
    if "tasker" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only taskers can apply for badges")
    
    stats = await calculate_tasker_stats(str(current_user["_id"]), db)
    meets_criteria, criteria_details = await check_badge_eligibility(stats, badge_type)
    
    return {
        "badge_type": badge_type,
        "badge_info": BADGE_INFO[badge_type],
        "meets_criteria": meets_criteria,
        "stats": stats,
        "criteria_details": criteria_details,
        "criteria": BADGE_CRITERIA[badge_type].dict()
    }

@router.post("/apply/{badge_type}")
async def apply_for_badge(
    badge_type: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Apply for a professional badge"""
    if badge_type not in BADGE_CRITERIA:
        raise HTTPException(status_code=400, detail="Invalid badge type")
    
    if "tasker" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only taskers can apply for badges")
    
    tasker_id = str(current_user["_id"])
    
    # Check if already has this badge or higher
    current_badge = current_user.get("professional_badge")
    badge_hierarchy = ["bronze", "silver", "gold"]
    if current_badge:
        current_level = badge_hierarchy.index(current_badge) if current_badge in badge_hierarchy else -1
        requested_level = badge_hierarchy.index(badge_type)
        if current_level >= requested_level:
            raise HTTPException(status_code=400, detail=f"You already have {current_badge} badge")
    
    # Check for pending application
    existing_application = await db.badge_applications.find_one({
        "tasker_id": tasker_id,
        "badge_type": badge_type,
        "status": "pending"
    })
    
    if existing_application:
        raise HTTPException(status_code=400, detail="You already have a pending application for this badge")
    
    # Calculate stats and check eligibility
    stats = await calculate_tasker_stats(tasker_id, db)
    meets_criteria, criteria_details = await check_badge_eligibility(stats, badge_type)
    
    # Create application
    application = {
        "tasker_id": tasker_id,
        "badge_type": badge_type,
        "application_date": datetime.utcnow(),
        "status": "pending",
        "meets_criteria": meets_criteria,
        "criteria_details": criteria_details,
        **stats
    }
    
    result = await db.badge_applications.insert_one(application)
    application["_id"] = result.inserted_id
    
    return {
        "message": "Badge application submitted successfully",
        "application": application,
        "meets_criteria": meets_criteria
    }

@router.get("/my-applications")
async def get_my_applications(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all badge applications for current tasker"""
    if "tasker" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Only taskers can view badge applications")
    
    applications = await db.badge_applications.find({
        "tasker_id": str(current_user["_id"])
    }).sort("application_date", -1).to_list(length=100)
    
    for app in applications:
        app["_id"] = str(app["_id"])
        app["badge_info"] = BADGE_INFO.get(app["badge_type"])
    
    return applications

@router.get("/admin/applications")
async def get_all_applications(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get all badge applications (admin only)"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    
    applications = await db.badge_applications.find(query).sort("application_date", -1).to_list(length=1000)
    
    for app in applications:
        app["_id"] = str(app["_id"])
        # Get tasker info
        tasker = await db.users.find_one({"_id": ObjectId(app["tasker_id"])})
        if tasker:
            app["tasker_name"] = tasker.get("full_name", "Unknown")
            app["tasker_email"] = tasker.get("email", "Unknown")
        app["badge_info"] = BADGE_INFO.get(app["badge_type"])
    
    return applications

@router.put("/admin/applications/{application_id}")
async def review_application(
    application_id: str,
    action: str,  # approve or reject
    admin_notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Approve or reject a badge application (admin only)"""
    if current_user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    application = await db.badge_applications.find_one({"_id": ObjectId(application_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if application["status"] != "pending":
        raise HTTPException(status_code=400, detail="Application already processed")
    
    # Update application
    update_data = {
        "status": "approved" if action == "approve" else "rejected",
        "reviewed_by": str(current_user["_id"]),
        "reviewed_at": datetime.utcnow(),
        "admin_notes": admin_notes
    }
    
    await db.badge_applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": update_data}
    )
    
    # If approved, update user's badge
    if action == "approve":
        await db.users.update_one(
            {"_id": ObjectId(application["tasker_id"])},
            {"$set": {"professional_badge": application["badge_type"]}}
        )
    
    return {
        "message": f"Application {action}d successfully",
        "application_id": application_id,
        "status": update_data["status"]
    }

@router.get("/badge-info")
async def get_badge_info():
    """Get information about all badge types"""
    result = []
    for badge_type, info in BADGE_INFO.items():
        criteria = BADGE_CRITERIA[badge_type]
        result.append({
            "badge_type": badge_type,
            "info": info,
            "criteria": criteria.dict()
        })
    return result
