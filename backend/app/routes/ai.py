"""
AI Routes for image analysis and service suggestion
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from typing import Optional
from app.services.ai_service import get_ai_service
from app.middleware.auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/analyze-image")
async def analyze_service_image(
    file: UploadFile = File(...)
):
    """
    Analyze an uploaded image to suggest the appropriate service category
    
    Args:
        file: Uploaded image file
    
    Returns:
        Suggested service category and analysis details
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image"
            )
        
        # Read image data
        image_data = await file.read()
        
        # Check file size (max 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Image file size must be less than 10MB"
            )
        
        # Get AI service instance
        ai_service = get_ai_service()
        
        # Analyze the image
        logger.info(f"Analyzing image: {file.filename}")
        try:
            result = await ai_service.analyze_issue_image(image_data)
        except Exception as analysis_error:
            logger.error(f"AI analysis exception: {str(analysis_error)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"AI analysis exception: {str(analysis_error)}"
            )
        
        if not result.get("success", False):
            logger.error(f"AI analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"AI analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        # Add display name
        category = result.get("category", "other")
        result["category_display"] = ai_service.get_category_display_name(category)
        
        logger.info(f"Image analysis successful: {category} (confidence: {result.get('confidence')})")
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze image: {str(e)}"
        )

@router.get("/categories")
async def get_service_categories():
    """
    Get all available service categories
    """
    categories = [
        {"value": "electrician", "label": "Electrician"},
        {"value": "plumber", "label": "Plumber"},
        {"value": "carpenter", "label": "Carpenter"},
        {"value": "ac_servicing", "label": "AC Servicing"},
        {"value": "ro_servicing", "label": "RO Servicing"},
        {"value": "appliance_repair", "label": "Appliance Repair"},
        {"value": "painting", "label": "Painting"},
        {"value": "pest_control", "label": "Pest Control"},
        {"value": "car_washing", "label": "Car Washing"},
        {"value": "bathroom_cleaning", "label": "Bathroom Cleaning"},
        {"value": "home_cleaning", "label": "Home Cleaning"},
        {"value": "assignment_writing", "label": "Assignment Writing"},
        {"value": "project_making", "label": "Project Making"},
        {"value": "tutoring", "label": "Tutoring"},
        {"value": "pet_care", "label": "Pet Care"},
        {"value": "gardening", "label": "Gardening"},
        {"value": "delivery", "label": "Delivery"},
        {"value": "other", "label": "Other"}
    ]
    
    return {
        "success": True,
        "categories": categories
    }
