from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from bson import ObjectId

class BookingStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Booking(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    customer_id: str
    tasker_id: str
    service_id: str
    
    # Booking details
    address: str
    address_id: Optional[str] = None  # Reference to saved address
    time_slot: str
    date: datetime
    additional_notes: Optional[str] = None
    
    # Gender preference for safety
    gender_preference: Optional[str] = None
    household_type: Optional[str] = None
    
    # Status and tracking
    status: BookingStatus = BookingStatus.PENDING
    total_amount: float
    payment_status: str = "pending"  # pending, paid, refunded
    
    # Ratings and reviews
    customer_rating: Optional[float] = None
    customer_review: Optional[str] = None
    tasker_rating: Optional[float] = None
    tasker_review: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        use_enum_values = True  # Serialize enums as their values instead of enum objects
        json_schema_extra = {
            "example": {
                "customer_id": "507f1f77bcf86cd799439011",
                "tasker_id": "507f1f77bcf86cd799439012",
                "service_id": "507f1f77bcf86cd799439013",
                "address": "123 Main St, City",
                "time_slot": "10:00 AM - 12:00 PM",
                "date": "2025-10-25T10:00:00",
                "total_amount": 500
            }
        }
