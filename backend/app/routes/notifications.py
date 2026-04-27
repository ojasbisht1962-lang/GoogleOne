from fastapi import APIRouter, HTTPException, Depends
from app.middleware.auth import get_current_user
from app.database import get_collection
from app.services.notification_service import get_user_notifications, mark_notification_as_read, mark_all_as_read
from bson import ObjectId

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/")
async def get_notifications(unread_only: bool = False, limit: int = 50, current_user: dict = Depends(get_current_user)):
    return await get_user_notifications(user_id=str(current_user["_id"]), unread_only=unread_only, limit=limit)

@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    notifications_collection = await get_collection("notifications")
    
    count = await notifications_collection.count_documents({
        "user_id": str(current_user["_id"]),
        "is_read": False
    })
    
    return {"unread_count": count}

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    notifications_collection = await get_collection("notifications")
    
    try:
        notification = await notifications_collection.find_one({"_id": ObjectId(notification_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = await mark_notification_as_read(notification_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to mark notification as read")
    
    return {"message": "Notification marked as read"}

@router.put("/mark-all-read")
async def mark_all_notifications_as_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    count = await mark_all_as_read(str(current_user["_id"]))
    
    return {"message": f"Marked {count} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    notifications_collection = await get_collection("notifications")
    
    try:
        notification = await notifications_collection.find_one({"_id": ObjectId(notification_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await notifications_collection.delete_one({"_id": ObjectId(notification_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Failed to delete notification")
    
    return {"message": "Notification deleted successfully"}
