"""
Gender Preference API Routes
Handles HTTP requests for gender preference functionality
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.gender_preference import (
    Gender,
    GenderPreference,
    HouseholdType,
    UserGenderProfile
)
from app.services.gender_preference_service import GenderPreferenceService
from app.database import get_database

router = APIRouter(prefix="/api/gender-preference", tags=["Gender Preference"])

# Request/Response Models
class CreateGenderProfileRequest(BaseModel):
    gender: Optional[Gender] = None
    gender_preference: GenderPreference = GenderPreference.NO_PREFERENCE
    household_type: Optional[HouseholdType] = None
    mandatory_gender_matching: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "gender": "female",
                "gender_preference": "female",
                "household_type": "single_woman",
                "mandatory_gender_matching": True
            }
        }

class UpdateGenderPreferenceRequest(BaseModel):
    gender_preference: GenderPreference
    
    class Config:
        json_schema_extra = {
            "example": {
                "gender_preference": "female"
            }
        }

class UpdateHouseholdTypeRequest(BaseModel):
    household_type: HouseholdType
    
    class Config:
        json_schema_extra = {
            "example": {
                "household_type": "single_woman"
            }
        }

class UpdateTaskerGenderRequest(BaseModel):
    gender: Gender
    
    class Config:
        json_schema_extra = {
            "example": {
                "gender": "male"
            }
        }

class ToggleMandatoryMatchingRequest(BaseModel):
    enabled: bool
    
    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True
            }
        }

class ValidateGenderRequirementRequest(BaseModel):
    category: str
    gender_preference: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "category": "home_cleaning",
                "gender_preference": "female"
            }
        }

class FilterTaskersRequest(BaseModel):
    tasker_ids: List[str]
    gender_preference: str
    category: str
    household_type: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "tasker_ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
                "gender_preference": "female",
                "category": "home_cleaning",
                "household_type": "single_woman"
            }
        }

@router.post("/profile", status_code=status.HTTP_201_CREATED)
async def create_or_update_gender_profile(
    request: CreateGenderProfileRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Create or update gender profile for current user
    
    - **gender**: User's gender (optional)
    - **gender_preference**: Preferred gender for service providers
    - **household_type**: Type of household (optional)
    - **mandatory_gender_matching**: Force gender matching for all services
    """
    service = GenderPreferenceService(db)
    
    profile = await service.create_gender_profile(
        user_id=str(current_user.id),
        gender=request.gender,
        gender_preference=request.gender_preference,
        household_type=request.household_type,
        mandatory_gender_matching=request.mandatory_gender_matching
    )
    
    return {
        "message": "Gender profile created/updated successfully",
        "profile": profile
    }

@router.get("/profile")
async def get_gender_profile(
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get gender profile for current user
    """
    service = GenderPreferenceService(db)
    profile = await service.get_gender_profile(str(current_user.id))
    
    if not profile:
        return {
            "message": "No gender profile found",
            "profile": None
        }
    
    return {
        "message": "Gender profile retrieved successfully",
        "profile": profile
    }

@router.put("/preference")
async def update_gender_preference(
    request: UpdateGenderPreferenceRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Update gender preference for current user
    
    - **gender_preference**: New gender preference value
    """
    service = GenderPreferenceService(db)
    
    # Get existing profile or create new
    profile = await service.get_gender_profile(str(current_user.id))
    
    updated_profile = await service.create_gender_profile(
        user_id=str(current_user.id),
        gender=profile.get("gender") if profile else None,
        gender_preference=request.gender_preference,
        household_type=profile.get("household_type") if profile else None,
        mandatory_gender_matching=profile.get("mandatory_gender_matching", False) if profile else False
    )
    
    return {
        "message": "Gender preference updated successfully",
        "profile": updated_profile
    }

@router.put("/household-type")
async def update_household_type(
    request: UpdateHouseholdTypeRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Update household type for current user
    
    - **household_type**: New household type value
    """
    service = GenderPreferenceService(db)
    
    success = await service.update_household_type(
        user_id=str(current_user.id),
        household_type=request.household_type
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update household type"
        )
    
    return {
        "message": "Household type updated successfully",
        "household_type": request.household_type
    }

@router.put("/tasker/gender")
async def update_tasker_gender(
    request: UpdateTaskerGenderRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Update gender for tasker profile
    
    - **gender**: Tasker's gender
    """
    # Check if user is a tasker
    if "tasker" not in (current_user.roles or []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only taskers can update this information"
        )
    
    service = GenderPreferenceService(db)
    
    success = await service.update_tasker_gender(
        user_id=str(current_user.id),
        gender=request.gender
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tasker gender"
        )
    
    return {
        "message": "Tasker gender updated successfully",
        "gender": request.gender
    }

@router.put("/mandatory-matching")
async def toggle_mandatory_matching(
    request: ToggleMandatoryMatchingRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Toggle mandatory gender matching for all services
    
    - **enabled**: Enable or disable mandatory matching
    """
    service = GenderPreferenceService(db)
    
    success = await service.toggle_mandatory_matching(
        user_id=str(current_user.id),
        enabled=request.enabled
    )
    
    return {
        "message": f"Mandatory gender matching {'enabled' if request.enabled else 'disabled'}",
        "mandatory_matching": request.enabled
    }

@router.post("/validate")
async def validate_gender_requirement(
    request: ValidateGenderRequirementRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Validate if gender preference is required for a specific service category
    
    - **category**: Service category
    - **gender_preference**: Provided gender preference (optional)
    """
    service = GenderPreferenceService(db)
    
    validation_result = await service.validate_gender_requirement(
        customer_id=str(current_user.id),
        category=request.category,
        gender_preference=request.gender_preference
    )
    
    return validation_result

@router.post("/filter-taskers")
async def filter_taskers(
    request: FilterTaskersRequest,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Filter taskers based on gender preference
    
    - **tasker_ids**: List of tasker IDs to filter
    - **gender_preference**: Preferred gender
    - **category**: Service category
    - **household_type**: Household type (optional)
    """
    service = GenderPreferenceService(db)
    
    filtered_ids = await service.filter_taskers_by_gender(
        tasker_ids=request.tasker_ids,
        gender_preference=request.gender_preference,
        category=request.category,
        household_type=request.household_type
    )
    
    return {
        "message": "Taskers filtered successfully",
        "original_count": len(request.tasker_ids),
        "filtered_count": len(filtered_ids),
        "tasker_ids": filtered_ids
    }

@router.get("/compatible-taskers/{service_id}")
async def get_compatible_taskers(
    service_id: str,
    gender_preference: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get compatible taskers for a service based on gender preference
    
    - **service_id**: Service ID
    - **gender_preference**: Preferred gender (optional, query parameter)
    """
    service = GenderPreferenceService(db)
    
    compatible_taskers = await service.get_compatible_taskers(
        service_id=service_id,
        customer_id=str(current_user.id),
        gender_preference=gender_preference
    )
    
    return {
        "message": "Compatible taskers retrieved successfully",
        "taskers": compatible_taskers
    }

@router.get("/matching-rules/{category}")
async def get_matching_rules(category: str, db = Depends(get_database)):
    """
    Get gender matching rules for a specific service category
    
    - **category**: Service category
    """
    service = GenderPreferenceService(db)
    rules = await service.get_matching_rules_for_category(category)
    
    return {
        "message": "Matching rules retrieved successfully",
        "category": category,
        "rules": rules
    }

@router.get("/all-matching-rules")
async def get_all_matching_rules(db = Depends(get_database)):
    """
    Get all predefined gender matching rules
    """
    service = GenderPreferenceService(db)
    rules = await service.get_all_matching_rules()
    
    return {
        "message": "All matching rules retrieved successfully",
        "total_rules": len(rules),
        "rules": rules
    }

@router.get("/enums")
async def get_gender_enums():
    """
    Get all available gender-related enums for frontend forms
    """
    return {
        "genders": [g.value for g in Gender],
        "gender_preferences": [gp.value for gp in GenderPreference],
        "household_types": [ht.value for ht in HouseholdType]
    }
