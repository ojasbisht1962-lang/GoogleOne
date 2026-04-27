from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

class ServiceCategory(str, Enum):
    # Commission rates:
    #   Technical job categories: 15% commission
    #   Non-Technical job categories: 10% commission
    #
    # Technical Services
    ELECTRICIAN = "electrician"
    PLUMBER = "plumber"
    CARPENTER = "carpenter"
    AC_SERVICING = "ac_servicing"
    RO_SERVICING = "ro_servicing"
    APPLIANCE_REPAIR = "appliance_repair"
    PAINTING = "painting"
    PEST_CONTROL = "pest_control"
    
    # Non-Technical Services
    CAR_WASHING = "car_washing"
    BATHROOM_CLEANING = "bathroom_cleaning"
    HOME_CLEANING = "home_cleaning"
    ASSIGNMENT_WRITING = "assignment_writing"
    PROJECT_MAKING = "project_making"
    TUTORING = "tutoring"
    PET_CARE = "pet_care"
    GARDENING = "gardening"
    DELIVERY = "delivery"
    OTHER = "other"

class ServiceType(str, Enum):
    TECHNICAL = "technical"
    NON_TECHNICAL = "non_technical"

# Mapping of categories to types
CATEGORY_TYPE_MAP = {
    ServiceCategory.ELECTRICIAN: ServiceType.TECHNICAL,
    ServiceCategory.PLUMBER: ServiceType.TECHNICAL,
    ServiceCategory.CARPENTER: ServiceType.TECHNICAL,
    ServiceCategory.AC_SERVICING: ServiceType.TECHNICAL,
    ServiceCategory.RO_SERVICING: ServiceType.TECHNICAL,
    ServiceCategory.APPLIANCE_REPAIR: ServiceType.TECHNICAL,
    ServiceCategory.PAINTING: ServiceType.TECHNICAL,
    ServiceCategory.PEST_CONTROL: ServiceType.TECHNICAL,
    ServiceCategory.CAR_WASHING: ServiceType.NON_TECHNICAL,
    ServiceCategory.BATHROOM_CLEANING: ServiceType.NON_TECHNICAL,
    ServiceCategory.HOME_CLEANING: ServiceType.NON_TECHNICAL,
    ServiceCategory.ASSIGNMENT_WRITING: ServiceType.NON_TECHNICAL,
    ServiceCategory.PROJECT_MAKING: ServiceType.NON_TECHNICAL,
    ServiceCategory.TUTORING: ServiceType.NON_TECHNICAL,
    ServiceCategory.PET_CARE: ServiceType.NON_TECHNICAL,
    ServiceCategory.GARDENING: ServiceType.NON_TECHNICAL,
    ServiceCategory.DELIVERY: ServiceType.NON_TECHNICAL,
}

class Service(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    tasker_id: str
    title: str
    description: str
    category: ServiceCategory
    service_type: ServiceType
    price: float
    price_unit: str = "per hour"  # per hour, per job, per day
    images: Optional[List[str]] = []
    location: Optional[str] = None
    service_location: Optional[dict] = None  # {"address": str, "coordinates": {"lat": float, "lng": float}}
    availability: Optional[List[str]] = []  # e.g., ["Monday", "Tuesday"]
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    customer_commission: Optional[float] = None  # % commission charged from customer
    tasker_commission: Optional[float] = None    # % commission charged from tasker
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "tasker_id": "507f1f77bcf86cd799439011",
                "title": "Professional Electrician Services",
                "description": "Expert electrical repairs and installations",
                "category": "electrician",
                "service_type": "technical",
                "price": 500,
                "price_unit": "per hour"
            }
        }

class PriceRange(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    category: ServiceCategory
    min_price: float
    max_price: float
    recommended_price: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
