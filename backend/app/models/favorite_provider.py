from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class FavoriteProvider(BaseModel):
    """Model for favorite service providers"""
    id: Optional[str] = Field(None, alias="_id")
    customer_id: str = Field(..., description="Customer who favorited the provider")
    provider_id: str = Field(..., description="Tasker/provider being favorited")
    added_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = Field(None, description="Personal notes about the provider")
    last_booked_at: Optional[datetime] = Field(None, description="Last time customer booked this provider")
    total_bookings: int = Field(default=0, description="Total number of bookings with this provider")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "customer_id": "507f1f77bcf86cd799439011",
                "provider_id": "507f1f77bcf86cd799439012",
                "notes": "Great plumber, very professional",
                "total_bookings": 3
            }
        }


class SortBy(str, Enum):
    """Sorting options for providers"""
    RATING_HIGH = "rating_high"
    RATING_LOW = "rating_low"
    DISTANCE_NEAR = "distance_near"
    DISTANCE_FAR = "distance_far"
    AVAILABILITY_FAST = "availability_fast"
    PRICE_LOW = "price_low"
    PRICE_HIGH = "price_high"
    MOST_BOOKED = "most_booked"
    RECENTLY_HIRED = "recently_hired"


class FilterOptions(BaseModel):
    """Filter options for provider search"""
    min_rating: Optional[float] = Field(None, ge=0, le=5, description="Minimum rating filter")
    max_distance: Optional[float] = Field(None, ge=0, description="Maximum distance in km")
    availability_within_days: Optional[int] = Field(None, ge=0, description="Available within N days")
    previously_hired: Optional[bool] = Field(None, description="Filter only previously hired providers")
    favorites_only: Optional[bool] = Field(None, description="Show only favorite providers")
    verified_only: Optional[bool] = Field(None, description="Show only verified professionals")
    service_id: Optional[str] = Field(None, description="Filter by specific service ID")
    min_price: Optional[float] = Field(None, ge=0, description="Minimum price filter")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum price filter")
    categories: Optional[List[str]] = Field(None, description="Filter by service categories")
    gender_preference: Optional[str] = Field(None, description="Gender preference filter")
    
    class Config:
        json_schema_extra = {
            "example": {
                "min_rating": 4.0,
                "max_distance": 10.0,
                "availability_within_days": 7,
                "previously_hired": True,
                "favorites_only": False,
                "verified_only": True
            }
        }


class ProviderSearchRequest(BaseModel):
    """Request model for searching providers"""
    service_category: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sort_by: Optional[SortBy] = SortBy.RATING_HIGH
    filters: Optional[FilterOptions] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "service_category": "Plumbing",
                "location": "Mumbai",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "sort_by": "rating_high",
                "filters": {
                    "min_rating": 4.0,
                    "favorites_only": False
                },
                "page": 1,
                "limit": 20
            }
        }


class QuickRebookRequest(BaseModel):
    """Request model for quick rebooking a favorite provider"""
    provider_id: str
    service_id: str
    scheduled_date: str
    scheduled_time: str
    location: str
    notes: Optional[str] = ""
    use_previous_preferences: bool = Field(default=True, description="Use preferences from last booking")
    
    class Config:
        json_schema_extra = {
            "example": {
                "provider_id": "507f1f77bcf86cd799439012",
                "service_id": "507f1f77bcf86cd799439013",
                "scheduled_date": "2024-01-15",
                "scheduled_time": "10:00 AM - 12:00 PM",
                "location": "123 Main St, Mumbai",
                "use_previous_preferences": True
            }
        }
