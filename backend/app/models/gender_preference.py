"""
Gender Preference Models and Enums
Implements safety feature for gender-based service provider matching
"""

from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class Gender(str, Enum):
    """Gender options for users"""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class GenderPreference(str, Enum):
    """Gender preference options for service matching"""
    MALE = "male"
    FEMALE = "female"
    ANY = "any"
    NO_PREFERENCE = "no_preference"

class MandatoryGenderServices(str, Enum):
    """Services that require mandatory gender preference selection"""
    HOME_CLEANING = "home_cleaning"
    BATHROOM_CLEANING = "bathroom_cleaning"
    ELDERLY_CARE = "elderly_care"
    PERSONAL_CARE = "personal_care"
    BABYSITTING = "babysitting"

class HouseholdType(str, Enum):
    """Household types for enhanced safety matching"""
    SINGLE_WOMAN = "single_woman"
    ELDERLY_HOME = "elderly_home"
    FAMILY_WITH_CHILDREN = "family_with_children"
    MIXED = "mixed"
    OTHER = "other"

class UserGenderProfile(BaseModel):
    """Extended gender profile for users"""
    user_id: str
    gender: Optional[Gender] = None
    
    # For customers
    gender_preference: GenderPreference = GenderPreference.NO_PREFERENCE
    household_type: Optional[HouseholdType] = None
    mandatory_gender_matching: bool = False  # Force gender matching for all services
    
    # For taskers
    comfortable_serving: Optional[List[HouseholdType]] = None
    prefer_same_gender_clients: bool = False
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "gender": "female",
                "gender_preference": "female",
                "household_type": "single_woman",
                "mandatory_gender_matching": True
            }
        }

class ServiceGenderRequirement(BaseModel):
    """Gender requirements for specific services"""
    service_id: str
    category: str
    requires_gender_preference: bool = False
    allowed_genders: Optional[List[Gender]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "service_id": "507f1f77bcf86cd799439013",
                "category": "home_cleaning",
                "requires_gender_preference": True,
                "allowed_genders": ["female", "male"]
            }
        }

class GenderMatchingRule(BaseModel):
    """Rules for gender-based matching"""
    category: str
    household_type: Optional[HouseholdType] = None
    is_mandatory: bool = False
    priority_score: int = 0  # Higher score = higher priority in matching
    description: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "home_cleaning",
                "household_type": "single_woman",
                "is_mandatory": True,
                "priority_score": 10,
                "description": "Mandatory gender matching for single woman households"
            }
        }

# Predefined mandatory matching rules
MANDATORY_GENDER_MATCHING_RULES = [
    {
        "category": "home_cleaning",
        "household_type": "single_woman",
        "is_mandatory": True,
        "priority_score": 10,
        "description": "Mandatory gender preference for home cleaning in single woman households"
    },
    {
        "category": "bathroom_cleaning",
        "household_type": "single_woman",
        "is_mandatory": True,
        "priority_score": 10,
        "description": "Mandatory gender preference for bathroom cleaning in single woman households"
    },
    {
        "category": "home_cleaning",
        "household_type": "elderly_home",
        "is_mandatory": True,
        "priority_score": 9,
        "description": "Mandatory gender preference for elderly home cleaning"
    },
    {
        "category": "elderly_care",
        "household_type": None,
        "is_mandatory": True,
        "priority_score": 10,
        "description": "Mandatory gender preference for all elderly care services"
    },
    {
        "category": "personal_care",
        "household_type": None,
        "is_mandatory": True,
        "priority_score": 10,
        "description": "Mandatory gender preference for all personal care services"
    }
]

def is_gender_preference_mandatory(category: str, household_type: Optional[str] = None) -> bool:
    """
    Check if gender preference is mandatory for a given service category and household type
    
    Args:
        category: Service category
        household_type: Type of household (optional)
        
    Returns:
        bool: True if gender preference is mandatory
    """
    for rule in MANDATORY_GENDER_MATCHING_RULES:
        if rule["category"] == category and rule["is_mandatory"]:
            if rule["household_type"] is None:
                return True
            if household_type and rule["household_type"] == household_type:
                return True
    return False

def get_matching_priority(category: str, household_type: Optional[str] = None) -> int:
    """
    Get priority score for gender matching
    
    Args:
        category: Service category
        household_type: Type of household (optional)
        
    Returns:
        int: Priority score (higher = more important)
    """
    max_priority = 0
    for rule in MANDATORY_GENDER_MATCHING_RULES:
        if rule["category"] == category:
            if rule["household_type"] is None or rule["household_type"] == household_type:
                max_priority = max(max_priority, rule["priority_score"])
    return max_priority
