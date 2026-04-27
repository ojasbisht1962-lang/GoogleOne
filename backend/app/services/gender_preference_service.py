"""
Gender Preference Service Layer
Handles business logic for gender-based matching and filtering
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.models.gender_preference import (
    Gender,
    GenderPreference,
    HouseholdType,
    UserGenderProfile,
    is_gender_preference_mandatory,
    get_matching_priority,
    MANDATORY_GENDER_MATCHING_RULES
)

class GenderPreferenceService:
    """Service class for gender preference operations"""
    
    def __init__(self, db):
        """
        Initialize the service with database connection
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.users_collection = db.users
        self.gender_profiles_collection = db.gender_profiles
        self.services_collection = db.services
        self.bookings_collection = db.bookings
    
    async def create_gender_profile(
        self,
        user_id: str,
        gender: Optional[str] = None,
        gender_preference: str = "no_preference",
        household_type: Optional[str] = None,
        mandatory_gender_matching: bool = False
    ) -> Dict[str, Any]:
        """
        Create or update gender profile for a user
        
        Args:
            user_id: User's ID
            gender: User's gender
            gender_preference: Preferred gender for service providers
            household_type: Type of household
            mandatory_gender_matching: Force gender matching for all services
            
        Returns:
            Created/updated gender profile
        """
        profile_data = {
            "user_id": user_id,
            "gender": gender,
            "gender_preference": gender_preference,
            "household_type": household_type,
            "mandatory_gender_matching": mandatory_gender_matching,
            "updated_at": datetime.utcnow()
        }
        
        # Check if profile exists
        existing = await self.gender_profiles_collection.find_one({"user_id": user_id})
        
        if existing:
            # Update existing profile
            await self.gender_profiles_collection.update_one(
                {"user_id": user_id},
                {"$set": profile_data}
            )
            result = await self.gender_profiles_collection.find_one({"user_id": user_id})
        else:
            # Create new profile
            profile_data["created_at"] = datetime.utcnow()
            result = await self.gender_profiles_collection.insert_one(profile_data)
            result = await self.gender_profiles_collection.find_one({"_id": result.inserted_id})
        
        # Also update user document with gender
        if gender:
            await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"gender": gender, "updated_at": datetime.utcnow()}}
            )
        
        return result
    
    async def get_gender_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get gender profile for a user
        
        Args:
            user_id: User's ID
            
        Returns:
            Gender profile or None
        """
        return await self.gender_profiles_collection.find_one({"user_id": user_id})
    
    async def update_tasker_gender(self, user_id: str, gender: str) -> bool:
        """
        Update tasker's gender information
        
        Args:
            user_id: Tasker's user ID
            gender: Gender value
            
        Returns:
            Success status
        """
        result = await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "gender": gender,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Also update gender profile
        await self.create_gender_profile(user_id=user_id, gender=gender)
        
        return result.modified_count > 0
    
    async def filter_taskers_by_gender(
        self,
        tasker_ids: List[str],
        gender_preference: str,
        category: str,
        household_type: Optional[str] = None
    ) -> List[str]:
        """
        Filter taskers based on gender preference
        
        Args:
            tasker_ids: List of tasker IDs to filter
            gender_preference: Preferred gender
            category: Service category
            household_type: Type of household (optional)
            
        Returns:
            Filtered list of tasker IDs
        """
        # If no preference or "any", return all
        if gender_preference in ["no_preference", "any", None]:
            # But check if it's mandatory for this category/household
            if not is_gender_preference_mandatory(category, household_type):
                return tasker_ids
        
        # Convert to ObjectIds
        object_ids = [ObjectId(tid) for tid in tasker_ids]
        
        # Query users with matching gender
        query = {
            "_id": {"$in": object_ids},
            "gender": gender_preference
        }
        
        matching_users = await self.users_collection.find(query).to_list(length=None)
        filtered_ids = [str(user["_id"]) for user in matching_users]
        
        return filtered_ids
    
    async def validate_gender_requirement(
        self,
        customer_id: str,
        category: str,
        gender_preference: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate if gender preference is required for a booking
        
        Args:
            customer_id: Customer's user ID
            category: Service category
            gender_preference: Provided gender preference (optional)
            
        Returns:
            Validation result with is_required and message
        """
        # Get customer's gender profile
        profile = await self.get_gender_profile(customer_id)
        
        household_type = profile.get("household_type") if profile else None
        mandatory_matching = profile.get("mandatory_gender_matching", False) if profile else False
        
        # Check if mandatory for this category/household
        is_mandatory = is_gender_preference_mandatory(category, household_type) or mandatory_matching
        
        result = {
            "is_required": is_mandatory,
            "household_type": household_type,
            "priority_score": get_matching_priority(category, household_type),
            "message": ""
        }
        
        if is_mandatory:
            if not gender_preference or gender_preference == "no_preference":
                result["message"] = (
                    f"Gender preference is required for {category} services "
                    f"based on your household type ({household_type or 'safety settings'})"
                )
                result["valid"] = False
            else:
                result["message"] = "Gender preference validated successfully"
                result["valid"] = True
        else:
            result["valid"] = True
            result["message"] = "Gender preference is optional for this service"
        
        return result
    
    async def get_compatible_taskers(
        self,
        service_id: str,
        customer_id: str,
        gender_preference: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get list of taskers compatible with gender preference
        
        Args:
            service_id: Service ID
            customer_id: Customer's user ID
            gender_preference: Preferred gender (optional)
            
        Returns:
            List of compatible taskers with compatibility scores
        """
        # Get service details
        service = await self.services_collection.find_one({"_id": ObjectId(service_id)})
        if not service:
            return []
        
        category = service.get("category")
        tasker_id = service.get("tasker_id")
        
        # Get tasker details
        tasker = await self.users_collection.find_one({"_id": ObjectId(tasker_id)})
        if not tasker:
            return []
        
        # Get customer's gender profile
        customer_profile = await self.get_gender_profile(customer_id)
        household_type = customer_profile.get("household_type") if customer_profile else None
        
        # Calculate compatibility
        tasker_gender = tasker.get("gender")
        compatibility_score = 100  # Base score
        
        if gender_preference and gender_preference != "no_preference":
            if tasker_gender == gender_preference:
                compatibility_score += 20  # Bonus for gender match
            else:
                compatibility_score -= 30  # Penalty for mismatch
        
        # Check mandatory requirements
        is_mandatory = is_gender_preference_mandatory(category, household_type)
        if is_mandatory:
            if not gender_preference or gender_preference == "no_preference":
                compatibility_score = 0  # Not compatible
            elif tasker_gender != gender_preference:
                compatibility_score = 0  # Not compatible
        
        priority = get_matching_priority(category, household_type)
        
        return [{
            "tasker_id": str(tasker["_id"]),
            "tasker_name": tasker.get("name"),
            "tasker_gender": tasker_gender,
            "compatibility_score": compatibility_score,
            "is_compatible": compatibility_score > 0,
            "priority": priority,
            "is_mandatory_match": is_mandatory
        }]
    
    async def get_matching_rules_for_category(self, category: str) -> List[Dict[str, Any]]:
        """
        Get all matching rules for a specific service category
        
        Args:
            category: Service category
            
        Returns:
            List of matching rules
        """
        return [
            rule for rule in MANDATORY_GENDER_MATCHING_RULES
            if rule["category"] == category
        ]
    
    async def get_all_matching_rules(self) -> List[Dict[str, Any]]:
        """
        Get all predefined gender matching rules
        
        Returns:
            List of all matching rules
        """
        return MANDATORY_GENDER_MATCHING_RULES
    
    async def update_household_type(self, user_id: str, household_type: str) -> bool:
        """
        Update household type for a customer
        
        Args:
            user_id: Customer's user ID
            household_type: New household type
            
        Returns:
            Success status
        """
        profile = await self.get_gender_profile(user_id)
        
        if profile:
            result = await self.gender_profiles_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "household_type": household_type,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        else:
            await self.create_gender_profile(
                user_id=user_id,
                household_type=household_type
            )
            result = type('obj', (object,), {'modified_count': 1})()
        
        return result.modified_count > 0 or True
    
    async def toggle_mandatory_matching(self, user_id: str, enabled: bool) -> bool:
        """
        Toggle mandatory gender matching for all services
        
        Args:
            user_id: Customer's user ID
            enabled: Enable or disable mandatory matching
            
        Returns:
            Success status
        """
        result = await self.gender_profiles_collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "mandatory_gender_matching": enabled,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return True
