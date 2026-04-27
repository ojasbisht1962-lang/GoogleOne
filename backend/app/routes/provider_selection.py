from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from app.middleware.auth import get_current_user, require_customer
from app.services.provider_selection_service import ProviderSelectionService
from app.models.favorite_provider import (
    ProviderSearchRequest, 
    SortBy, 
    FilterOptions,
    QuickRebookRequest
)
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/provider-selection", tags=["Provider Selection"])


class AddFavoriteRequest(BaseModel):
    provider_id: str
    notes: Optional[str] = None


class RemoveFavoriteRequest(BaseModel):
    provider_id: str


@router.post("/favorites/add")
async def add_favorite_provider(
    request: AddFavoriteRequest,
    current_user: dict = Depends(require_customer)
):
    """Add a provider to favorites"""
    try:
        service = ProviderSelectionService()
        result = await service.add_favorite_provider(
            customer_id=str(current_user["_id"]),
            provider_id=request.provider_id,
            notes=request.notes
        )
        return result
    except Exception as e:
        logger.error(f"Error adding favorite: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/favorites/remove")
async def remove_favorite_provider(
    request: RemoveFavoriteRequest,
    current_user: dict = Depends(require_customer)
):
    """Remove a provider from favorites"""
    try:
        service = ProviderSelectionService()
        result = await service.remove_favorite_provider(
            customer_id=str(current_user["_id"]),
            provider_id=request.provider_id
        )
        return result
    except Exception as e:
        logger.error(f"Error removing favorite: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/favorites")
async def get_favorite_providers(
    current_user: dict = Depends(require_customer)
):
    """Get all favorite providers with details"""
    try:
        service = ProviderSelectionService()
        favorites = await service.get_favorite_providers(
            customer_id=str(current_user["_id"])
        )
        return {
            "favorites": favorites,
            "total": len(favorites)
        }
    except Exception as e:
        logger.error(f"Error getting favorites: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/favorites/check/{provider_id}")
async def check_is_favorite(
    provider_id: str,
    current_user: dict = Depends(require_customer)
):
    """Check if a provider is in favorites"""
    try:
        service = ProviderSelectionService()
        is_fav = await service.is_favorite(
            customer_id=str(current_user["_id"]),
            provider_id=provider_id
        )
        return {"is_favorite": is_fav}
    except Exception as e:
        logger.error(f"Error checking favorite: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search")
async def search_providers(
    search_request: ProviderSearchRequest,
    current_user: dict = Depends(require_customer)
):
    """
    Search and filter providers with advanced options:
    - Sort by: rating, distance, availability, previously hired
    - Filter by: rating, distance, verification, favorites, etc.
    """
    try:
        service = ProviderSelectionService()
        providers, total = await service.search_and_filter_providers(
            customer_id=str(current_user["_id"]),
            search_request=search_request
        )
        
        return {
            "providers": providers,
            "total": total,
            "page": search_request.page,
            "limit": search_request.limit,
            "total_pages": (total + search_request.limit - 1) // search_request.limit
        }
    except Exception as e:
        logger.error(f"Error searching providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quick-rebook")
async def quick_rebook_provider(
    rebook_request: QuickRebookRequest,
    current_user: dict = Depends(require_customer)
):
    """Quick rebook a favorite provider with previous preferences"""
    try:
        from app.routes.bookings import create_booking, CreateBookingRequest
        
        service = ProviderSelectionService()
        
        # Prepare booking data
        booking_data = {
            "service_id": rebook_request.service_id,
            "tasker_id": rebook_request.provider_id,
            "scheduled_date": rebook_request.scheduled_date,
            "scheduled_time": rebook_request.scheduled_time,
            "location": rebook_request.location,
            "notes": rebook_request.notes,
            "use_previous_preferences": rebook_request.use_previous_preferences
        }
        
        # Process quick rebook
        result = await service.quick_rebook(
            customer_id=str(current_user["_id"]),
            provider_id=rebook_request.provider_id,
            service_id=rebook_request.service_id,
            booking_data=booking_data
        )
        
        if result["success"]:
            # Create the actual booking
            booking_request = CreateBookingRequest(
                service_id=rebook_request.service_id,
                tasker_id=rebook_request.provider_id,
                scheduled_date=rebook_request.scheduled_date,
                scheduled_time=rebook_request.scheduled_time,
                location=rebook_request.location,
                notes=result["booking_data"].get("notes", ""),
                total_price=0.0,  # Will be calculated
                gender_preference=result["booking_data"].get("gender_preference"),
                household_type=result["booking_data"].get("household_type")
            )
            
            booking = await create_booking(booking_request, current_user)
            
            return {
                "success": True,
                "message": "Quick rebook successful",
                "booking": booking
            }
        
        return result
        
    except Exception as e:
        logger.error(f"Error in quick rebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sorting-options")
async def get_sorting_options():
    """Get available sorting options"""
    return {
        "options": [
            {"value": "rating_high", "label": "Highest Rating"},
            {"value": "rating_low", "label": "Lowest Rating"},
            {"value": "distance_near", "label": "Nearest Location"},
            {"value": "distance_far", "label": "Farthest Location"},
            {"value": "availability_fast", "label": "Fastest Availability"},
            {"value": "most_booked", "label": "Most Booked"},
            {"value": "recently_hired", "label": "Recently Hired"},
            {"value": "price_low", "label": "Lowest Price"},
            {"value": "price_high", "label": "Highest Price"}
        ]
    }


@router.get("/filter-options")
async def get_filter_options():
    """Get available filter options"""
    return {
        "filters": {
            "rating": {
                "type": "range",
                "min": 0,
                "max": 5,
                "step": 0.5,
                "label": "Minimum Rating"
            },
            "distance": {
                "type": "range",
                "min": 0,
                "max": 50,
                "step": 1,
                "unit": "km",
                "label": "Maximum Distance"
            },
            "availability": {
                "type": "number",
                "min": 1,
                "max": 30,
                "unit": "days",
                "label": "Available Within Days"
            },
            "boolean_filters": [
                {"key": "previously_hired", "label": "Previously Hired"},
                {"key": "favorites_only", "label": "Favorites Only"},
                {"key": "verified_only", "label": "Verified Professionals Only"}
            ]
        }
    }
