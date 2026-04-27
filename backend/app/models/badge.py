from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")

class BadgeApplication(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    tasker_id: str
    badge_type: str  # bronze, silver, gold
    application_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, approved, rejected
    admin_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    # Criteria met at time of application
    total_bookings: int = 0
    average_rating: float = 0.0
    total_reviews: int = 0
    account_age_days: int = 0
    cancellation_rate: float = 0.0
    response_time_hours: float = 0.0
    repeat_customer_rate: float = 0.0
    on_time_completion_rate: float = 0.0
    
    # Eligibility check
    meets_criteria: bool = False
    criteria_details: dict = {}

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class BadgeCriteria(BaseModel):
    """Criteria for each badge tier"""
    badge_type: str
    min_bookings: int
    min_rating: float
    min_reviews: int
    min_account_age_days: int
    max_cancellation_rate: float
    max_response_time_hours: float
    min_repeat_customer_rate: float
    min_on_time_rate: float
    background_verification_required: bool = True

# Define badge criteria
BADGE_CRITERIA = {
    "bronze": BadgeCriteria(
        badge_type="bronze",
        min_bookings=10,
        min_rating=4.0,
        min_reviews=5,
        min_account_age_days=30,
        max_cancellation_rate=10.0,
        max_response_time_hours=6.0,
        min_repeat_customer_rate=10.0,
        min_on_time_rate=85.0,
        background_verification_required=True
    ),
    "silver": BadgeCriteria(
        badge_type="silver",
        min_bookings=30,
        min_rating=4.3,
        min_reviews=15,
        min_account_age_days=90,
        max_cancellation_rate=7.0,
        max_response_time_hours=3.0,
        min_repeat_customer_rate=20.0,
        min_on_time_rate=90.0,
        background_verification_required=True
    ),
    "gold": BadgeCriteria(
        badge_type="gold",
        min_bookings=75,
        min_rating=4.7,
        min_reviews=40,
        min_account_age_days=180,
        max_cancellation_rate=5.0,
        max_response_time_hours=1.0,
        min_repeat_customer_rate=35.0,
        min_on_time_rate=95.0,
        background_verification_required=True
    )
}

BADGE_INFO = {
    "bronze": {
        "name": "Verified Professional",
        "icon": "🥉",
        "color": "#CD7F32",
        "benefits": [
            "Verified professional status",
            "Badge display on profile",
            "Increased customer trust"
        ]
    },
    "silver": {
        "name": "Trusted Expert",
        "icon": "🥈",
        "color": "#C0C0C0",
        "benefits": [
            "All Bronze benefits",
            "Priority in search results",
            "Featured in 'Trusted Experts' section",
            "Higher visibility to customers"
        ]
    },
    "gold": {
        "name": "Elite Professional",
        "icon": "🥇",
        "color": "#FFD700",
        "benefits": [
            "All Silver benefits",
            "Top priority in search rankings",
            "Featured on homepage",
            "Premium profile badge",
            "Exclusive promotional opportunities"
        ]
    }
}
