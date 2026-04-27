from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Annotated
from datetime import datetime
from enum import Enum
from bson import ObjectId
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema

class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.chain_schema([
                core_schema.str_schema(),
                core_schema.no_info_plain_validator_function(cls.validate),
            ])
        ],
        serialization=core_schema.plain_serializer_function_ser_schema(
            lambda x: str(x)
        ))

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

class UserRole(str, Enum):
    CUSTOMER = "customer"
    TASKER = "tasker"
    SUPERADMIN = "superadmin"

class TaskerType(str, Enum):
    HELPER = "helper"
    PROFESSIONAL = "professional"

class VerificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NOT_APPLIED = "not_applied"

class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    google_id: Optional[str] = None
    email: EmailStr
    password: Optional[str] = None  # Hashed password for email/password auth
    name: str
    profile_picture: Optional[str] = None
    role: UserRole  # Primary/current role for compatibility
    roles: Optional[List[UserRole]] = []  # All roles user has access to
    
    # Common fields
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None  # Gender for safety matching
    preferred_language: Optional[str] = 'en'  # ISO 639-1 code for chat translation
    is_blocked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Tasker specific fields
    tasker_type: Optional[TaskerType] = None
    age: Optional[int] = None
    languages_spoken: Optional[List[str]] = []
    criminal_record: Optional[bool] = None
    work_as_professional: Optional[bool] = False
    verification_status: Optional[VerificationStatus] = VerificationStatus.NOT_APPLIED
    referral_code: Optional[str] = None
    referred_by: Optional[str] = None  # Professional's user ID
    professional_badge: Optional[str] = None  # bronze, silver, gold, or None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    skills: Optional[List[str]] = []
    rating: Optional[float] = 0.0
    total_jobs: Optional[int] = 0
    
    # Service location fields (for taskers)
    service_location: Optional[dict] = None  # {"address": str, "coordinates": {"lat": float, "lng": float}}
    
    # Customer location fields (separate from tasker location)
    customer_location: Optional[dict] = None  # {"address": str, "coordinates": {"lat": float, "lng": float}, "city": str}
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "google_id": "123456789",
                "email": "user@example.com",
                "name": "John Doe",
                "role": "customer"
            }
        }
