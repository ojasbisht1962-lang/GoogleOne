from app.database import get_collection
from app.models.notification import Notification, NotificationType
from datetime import datetime
from bson import ObjectId

async def create_notification(
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    link: str = None
):
    """Create a new notification"""
    notifications_collection = await get_collection("notifications")
    
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        link=link,
        is_read=False,
        created_at=datetime.utcnow()
    )
    
    result = await notifications_collection.insert_one(notification.dict(by_alias=True, exclude={"id"}))
    return str(result.inserted_id)

async def get_user_notifications(user_id: str, unread_only: bool = False, limit: int = 50):
    """Get notifications for a user"""
    notifications_collection = await get_collection("notifications")
    
    query = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
    
    cursor = notifications_collection.find(query).sort("created_at", -1).limit(limit)
    notifications = await cursor.to_list(length=limit)
    
    for notification in notifications:
        notification["_id"] = str(notification["_id"])
    
    return notifications

async def mark_notification_as_read(notification_id: str):
    """Mark a notification as read"""
    notifications_collection = await get_collection("notifications")
    
    result = await notifications_collection.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"is_read": True}}
    )
    
    return result.modified_count > 0

async def mark_all_as_read(user_id: str):
    """Mark all notifications as read for a user"""
    notifications_collection = await get_collection("notifications")
    
    result = await notifications_collection.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return result.modified_count
