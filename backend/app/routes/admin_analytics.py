from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import require_superadmin
from app.database import get_collection
from datetime import datetime, timedelta
from bson import ObjectId

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

@router.get("/dashboard")
async def get_dashboard_analytics(current_user: dict = Depends(require_superadmin)):
    """Get overall dashboard statistics"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        users_collection = await get_collection("users")
        bookings_collection = await get_collection("bookings")
        payments_collection = await get_collection("payments")
        
        # Total users by role
        total_customers = await users_collection.count_documents({"role": "customer"})
        total_taskers = await users_collection.count_documents({"role": "tasker"})
        total_users = await users_collection.count_documents({})
        
        logger.info(f"Users - Total: {total_users}, Customers: {total_customers}, Taskers: {total_taskers}")
        
        # Total bookings
        total_bookings = await bookings_collection.count_documents({})
        completed_bookings = await bookings_collection.count_documents({"status": "completed"})
        pending_bookings = await bookings_collection.count_documents({"status": "pending"})
        active_bookings = await bookings_collection.count_documents({"status": {"$in": ["pending", "accepted", "in_progress"]}})
        
        logger.info(f"Bookings - Total: {total_bookings}, Completed: {completed_bookings}, Active: {active_bookings}")
        
        # Revenue calculation from completed bookings
        all_completed = await bookings_collection.find({"status": "completed"}).to_list(length=None)
        
        logger.info(f"Found {len(all_completed)} completed bookings for revenue calculation")
        if all_completed:
            logger.info(f"Sample booking fields: {list(all_completed[0].keys())}")
            logger.info(f"Sample booking total_amount: {all_completed[0].get('total_amount')}")
            logger.info(f"Sample booking total_price: {all_completed[0].get('total_price')}")
        
        # Check both total_amount (backend field) and total_price (frontend field) for compatibility
        total_revenue = sum(booking.get("total_amount") or booking.get("total_price", 0) for booking in all_completed)
        platform_commission = total_revenue * 0.1  # 10% commission
        
        logger.info(f"Calculated revenue: {total_revenue}, commission: {platform_commission}")
        
        # Average order value
        avg_order_value = total_revenue / completed_bookings if completed_bookings > 0 else 0
        
        # This month's data
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Count all bookings created this month
        month_bookings = await bookings_collection.count_documents({
            "created_at": {"$gte": month_start}
        })
        
        # Calculate revenue from completed bookings this month
        # Check for both completed_at and created_at (for older bookings)
        month_completed_bookings = await bookings_collection.find({
            "status": "completed",
            "$or": [
                {"completed_at": {"$gte": month_start}},
                {"created_at": {"$gte": month_start}}
            ]
        }).to_list(length=None)
        
        month_revenue = sum(booking.get("total_amount", 0) or booking.get("total_price", 0) for booking in month_completed_bookings)
        month_commission = month_revenue * 0.1
        
        # Pending actions
        verifications_collection = await get_collection("document_verifications")
        badges_collection = await get_collection("badge_applications")
        tickets_collection = await get_collection("support_tickets")
        
        pending_verifications = await verifications_collection.count_documents({"status": "pending"})
        pending_badges = await badges_collection.count_documents({"status": "pending"})
        open_tickets = await tickets_collection.count_documents({"status": {"$nin": ["closed", "resolved"]}})
        
        return {
            "overview": {
                "total_revenue": total_revenue,
                "platform_commission": platform_commission,
                "total_users": total_users,
                "total_customers": total_customers,
                "total_taskers": total_taskers,
                "total_bookings": total_bookings,
                "completed_bookings": completed_bookings,
                "active_bookings": active_bookings,
                "avg_order_value": avg_order_value
            },
            "this_month": {
                "bookings": month_bookings,
                "revenue": month_revenue,
                "commission": month_commission
            },
            "pending_actions": {
                "verifications": pending_verifications,
                "badge_applications": pending_badges,
                "open_complaints": open_tickets
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/revenue-trends")
async def get_revenue_trends(period: str = "month", current_user: dict = Depends(require_superadmin)):
    """Get revenue trends for specified period"""
    try:
        bookings_collection = await get_collection("bookings")
        
        # Determine date range based on period
        end_date = datetime.utcnow()
        if period == "week":
            start_date = end_date - timedelta(days=6)
            days = 7
        elif period == "month":
            start_date = end_date - timedelta(days=29)
            days = 30
        else:
            start_date = end_date - timedelta(days=6)
            days = 7
        
        # Get all completed bookings in the period
        completed_bookings = await bookings_collection.find({
            "status": "completed",
            "$or": [
                {"completed_at": {"$gte": start_date, "$lte": end_date}},
                {"created_at": {"$gte": start_date, "$lte": end_date}}
            ]
        }).to_list(length=None)
        
        # Group by date manually
        revenue_by_date = {}
        for booking in completed_bookings:
            # Use completed_at if exists, otherwise created_at
            booking_date = booking.get("completed_at") or booking.get("created_at")
            if booking_date:
                date_str = booking_date.strftime("%Y-%m-%d")
                if date_str not in revenue_by_date:
                    revenue_by_date[date_str] = {"revenue": 0, "commission": 0}
                
                amount = booking.get("total_amount", 0) or booking.get("total_price", 0)
                revenue_by_date[date_str]["revenue"] += amount
                revenue_by_date[date_str]["commission"] += amount * 0.1
        
        # Fill in missing days with 0
        trends = []
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            date_str = date.strftime("%Y-%m-%d")
            if date_str in revenue_by_date:
                trends.append({
                    "date": date_str,
                    "revenue": revenue_by_date[date_str]["revenue"],
                    "commission": revenue_by_date[date_str]["commission"]
                })
            else:
                trends.append({
                    "date": date_str,
                    "revenue": 0,
                    "commission": 0
                })
        
        return {"data": trends}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/booking-stats")
async def get_booking_stats(current_user: dict = Depends(require_superadmin)):
    """Get booking statistics by status"""
    try:
        bookings_collection = await get_collection("bookings")
        
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await bookings_collection.aggregate(pipeline).to_list(length=None)
        
        stats = {r["_id"]: r["count"] for r in results}
        
        return {
            "stats": stats,
            "total": sum(stats.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-taskers")
async def get_top_taskers(limit: int = 10, current_user: dict = Depends(require_superadmin)):
    """Get top performing taskers"""
    try:
        bookings_collection = await get_collection("bookings")
        users_collection = await get_collection("users")
        
        pipeline = [
            {"$match": {"status": "completed"}},
            {
                "$group": {
                    "_id": "$tasker_id",
                    "completed_jobs": {"$sum": 1},
                    "total_earned": {"$sum": "$tasker_payment"}
                }
            },
            {"$sort": {"completed_jobs": -1}},
            {"$limit": limit}
        ]
        
        results = await bookings_collection.aggregate(pipeline).to_list(length=None)
        
        # Fetch tasker details
        top_taskers = []
        for r in results:
            if r["_id"]:
                tasker = await users_collection.find_one({"_id": ObjectId(r["_id"])})
                if tasker:
                    # Ensure badges is always an array
                    badges = tasker.get("badges", [])
                    if not isinstance(badges, list):
                        badges = []
                    
                    top_taskers.append({
                        "id": str(tasker["_id"]),
                        "name": tasker.get("name", "Unknown"),
                        "email": tasker.get("email", ""),
                        "completed_jobs": r["completed_jobs"],
                        "total_earned": r.get("total_earned", 0),
                        "rating": tasker.get("rating", 0.0),
                        "badges": badges
                    })
        
        return {"top_taskers": top_taskers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent-activities")
async def get_recent_activities(limit: int = 20, current_user: dict = Depends(require_superadmin)):
    """Get recent platform activities"""
    try:
        bookings_collection = await get_collection("bookings")
        users_collection = await get_collection("users")
        
        # Get recent bookings
        recent_bookings = await bookings_collection.find({}).sort("created_at", -1).limit(limit).to_list(length=None)
        
        activities = []
        for booking in recent_bookings:
            activities.append({
                "type": "booking",
                "id": str(booking["_id"]),
                "status": booking.get("status", "unknown"),
                "created_at": booking.get("created_at"),
                "amount": booking.get("total_price", 0)
            })
        
        return {"activities": activities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/booking-status-distribution")
async def get_booking_distribution(current_user: dict = Depends(require_superadmin)):
    """Get booking distribution by status"""
    try:
        bookings_collection = await get_collection("bookings")
        
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await bookings_collection.aggregate(pipeline).to_list(length=None)
        
        # Convert to array format for frontend
        distribution = []
        for r in results:
            status = r["_id"] if r["_id"] else "unknown"
            distribution.append({
                "status": status,
                "count": r["count"]
            })
        
        return {"distribution": distribution}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-performing-taskers")
async def get_top_performing_taskers(limit: int = 5, current_user: dict = Depends(require_superadmin)):
    """Get top performing taskers"""
    try:
        bookings_collection = await get_collection("bookings")
        users_collection = await get_collection("users")
        
        pipeline = [
            {"$match": {"status": "completed"}},
            {
                "$group": {
                    "_id": "$tasker_id",
                    "completed_jobs": {"$sum": 1},
                    "total_earned": {"$sum": {"$ifNull": ["$tasker_payment", "$total_amount"]}}
                }
            },
            {"$sort": {"completed_jobs": -1}},
            {"$limit": limit}
        ]
        
        results = await bookings_collection.aggregate(pipeline).to_list(length=None)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Top taskers aggregation results: {results}")
        
        # Fetch tasker details
        top_taskers = []
        for r in results:
            if r["_id"]:
                try:
                    tasker = await users_collection.find_one({"_id": ObjectId(r["_id"])})
                    if tasker:
                        # Ensure badges is always an array
                        badges = tasker.get("badges", [])
                        if not isinstance(badges, list):
                            badges = []
                        
                        total_rev = r.get("total_earned", 0)
                        if total_rev is None:
                            total_rev = 0
                        
                        tasker_data = {
                            "id": str(tasker["_id"]),
                            "tasker_id": str(tasker["_id"]),
                            "name": tasker.get("name", "Unknown"),
                            "email": tasker.get("email", ""),
                            "total_bookings": r["completed_jobs"],
                            "total_revenue": total_rev,
                            "avg_rating": tasker.get("rating", 0.0),
                            "badges": badges
                        }
                        logger.info(f"Adding tasker: {tasker_data}")
                        top_taskers.append(tasker_data)
                except Exception as e:
                    logger.error(f"Error processing tasker {r.get('_id')}: {e}")
                    continue
        
        logger.info(f"Final top_taskers response: {top_taskers}")
        return {"top_taskers": top_taskers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
