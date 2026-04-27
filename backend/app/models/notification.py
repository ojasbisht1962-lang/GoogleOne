from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId

class NotificationType(str, Enum):
    BOOKING_REQUEST = "booking_request"
    BOOKING_ACCEPTED = "booking_accepted"
    BOOKING_REJECTED = "booking_rejected"
    BOOKING_COMPLETED = "booking_completed"
    BOOKING_CANCELLED = "booking_cancelled"
    CHAT_MESSAGE = "chat_message"
    VERIFICATION_APPROVED = "verification_approved"
    VERIFICATION_REJECTED = "verification_rejected"
    AMC_REQUEST = "amc_request"
    AMC_APPROVED = "amc_approved"
    AMC_REJECTED = "amc_rejected"
    BADGE_APPROVED = "badge_approved"
    ACCOUNT_BLOCKED = "account_blocked"
    PAYMENT_RECEIVED = "payment_received"
    REVIEW_RECEIVED = "review_received"

class Notification(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None  # URL to navigate to
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "type": "booking_request",
                "title": "New Booking Request",
                "message": "You have a new booking request for Electrician service",
                "is_read": False
            }
        }
