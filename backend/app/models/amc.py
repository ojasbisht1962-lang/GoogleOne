from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

class AMCStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class AMCServiceType(str, Enum):
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    SECURITY = "security"
    LANDSCAPING = "landscaping"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    AC_SERVICING = "ac_servicing"
    PEST_CONTROL = "pest_control"
    OTHER = "other"

class AMC(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    customer_id: str
    
    # Company/Society Details
    company_name: str
    contact_person: str
    contact_email: str
    contact_phone: str
    address: str
    
    # AMC Details
    service_types: List[AMCServiceType]
    description: str
    duration_months: int = 12  # Default 1 year
    frequency: str  # e.g., "weekly", "bi-weekly", "monthly"
    preferred_days: Optional[List[str]] = []
    preferred_time: Optional[str] = None
    
    # Pricing
    estimated_budget: Optional[float] = None
    quoted_price: Optional[float] = None
    
    # Status and tracking
    status: AMCStatus = AMCStatus.PENDING
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Admin notes
    admin_notes: Optional[str] = None
    assigned_taskers: Optional[List[str]] = []  # List of tasker IDs
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "customer_id": "507f1f77bcf86cd799439011",
                "company_name": "Tech Corp Ltd",
                "contact_person": "John Doe",
                "contact_email": "john@techcorp.com",
                "contact_phone": "+1234567890",
                "address": "123 Business Park",
                "service_types": ["cleaning", "electrical"],
                "description": "Regular office maintenance",
                "duration_months": 12,
                "frequency": "weekly"
            }
        }
