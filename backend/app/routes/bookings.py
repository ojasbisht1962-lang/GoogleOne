from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.middleware.auth import get_current_user, require_customer, require_tasker
from app.database import get_collection
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
import logging
logger = logging.getLogger(__name__)
from bson import ObjectId

router = APIRouter(prefix="/bookings", tags=["Bookings"])

class CreateBookingRequest(BaseModel):
    service_id: str
    tasker_id: str
    scheduled_date: str
    scheduled_time: str
    location: str
    address_id: Optional[str] = None  # Reference to saved address
    notes: Optional[str] = ""
    total_price: float
    gender_preference: Optional[str] = None
    household_type: Optional[str] = None
    
    class Config:
        str_strip_whitespace = True

class UpdateBookingStatusRequest(BaseModel):
    status: BookingStatus

class RateBookingRequest(BaseModel):
    rating: float = Field(..., ge=1, le=5)  # Rating must be between 1 and 5
    review: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "rating": 4.5,
                "review": "Great service!"
            }
        }

@router.post("/")
async def create_booking(
    booking_data: CreateBookingRequest,
    current_user: dict = Depends(require_customer)
):
    """Create a new booking"""
    try:
        logger.info(f"Creating booking with data: {booking_data.dict()}")
        
        services_collection = await get_collection("services")
        
        try:
            service = await services_collection.find_one({"_id": ObjectId(booking_data.service_id)})
        except Exception as e:
            logger.error(f"Invalid service ID: {booking_data.service_id}, Error: {e}")
            raise HTTPException(status_code=400, detail="Invalid service ID")
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
        
        if not service.get("is_active", False):
            raise HTTPException(status_code=400, detail="Service is not available")
        
        # Validate gender preference if provided
        if booking_data.gender_preference or booking_data.household_type:
            from app.services.gender_preference_service import GenderPreferenceService
            
            gender_service = GenderPreferenceService()
            
            # Validate gender requirement for this service
            is_valid, message = await gender_service.validate_gender_requirement(
                service_category=service.get("category", ""),
                household_type=booking_data.household_type,
                gender_preference=booking_data.gender_preference
            )
            
            if not is_valid:
                raise HTTPException(status_code=400, detail=message)
            
            # Validate tasker matches gender preference
            users_collection = await get_collection("users")
            tasker = await users_collection.find_one({"_id": ObjectId(booking_data.tasker_id)})
            
            if not tasker:
                raise HTTPException(status_code=404, detail="Tasker not found")
            
            tasker_gender = tasker.get("gender", "")
            
            if booking_data.gender_preference and tasker_gender:
                if booking_data.gender_preference == "male_only" and tasker_gender != "male":
                    raise HTTPException(
                        status_code=400, 
                        detail="Selected tasker does not match your gender preference (Male only)"
                    )
                elif booking_data.gender_preference == "female_only" and tasker_gender != "female":
                    raise HTTPException(
                        status_code=400, 
                        detail="Selected tasker does not match your gender preference (Female only)"
                    )
        
        bookings_collection = await get_collection("bookings")
        
        # Parse the date string to datetime
        try:
            scheduled_datetime = datetime.fromisoformat(booking_data.scheduled_date.replace('Z', '+00:00'))
        except:
            # If it's just a date string, combine with a default time
            try:
                scheduled_datetime = datetime.strptime(booking_data.scheduled_date, "%Y-%m-%d")
            except Exception as e:
                logger.error(f"Failed to parse date: {booking_data.scheduled_date}, Error: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid date format: {booking_data.scheduled_date}")
        
        new_booking = Booking(
            customer_id=str(current_user["_id"]),
            tasker_id=booking_data.tasker_id,
            service_id=booking_data.service_id,
            address=booking_data.location,
            address_id=booking_data.address_id,
            time_slot=booking_data.scheduled_time,
            date=scheduled_datetime,
            additional_notes=booking_data.notes or "",
            total_amount=booking_data.total_price,
            status=BookingStatus.PENDING,
            gender_preference=booking_data.gender_preference,
            household_type=booking_data.household_type,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await bookings_collection.insert_one(new_booking.dict(by_alias=True, exclude={"id"}))
        
        # Create notification for tasker
        await create_notification(
            user_id=booking_data.tasker_id,
            notification_type=NotificationType.BOOKING_REQUEST,
            title="New Booking Request",
            message=f"You have a new booking request from {current_user['name']}",
            link=f"/tasker/bookings/{result.inserted_id}"
        )
        
        created_booking = await bookings_collection.find_one({"_id": result.inserted_id})
        created_booking["_id"] = str(created_booking["_id"])
        
        logger.info(f"Booking created successfully: {created_booking['_id']}")
        return created_booking
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create booking: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {str(e)}")

@router.get("/my-bookings")
async def get_my_bookings(
    status: Optional[BookingStatus] = None,
    view_as: Optional[str] = None,  # 'customer' or 'tasker'
    current_user: dict = Depends(get_current_user)
):
    """Get current user's bookings"""
    bookings_collection = await get_collection("bookings")
    
    # Check both 'role' (single) and 'roles' (array) for backwards compatibility
    user_role = current_user.get("role")
    user_roles = current_user.get("roles", [])
    
    # Determine if user is customer or tasker
    is_customer = user_role == "customer" or "customer" in user_roles
    is_tasker = user_role == "tasker" or "tasker" in user_roles
    
    # If view_as is specified, use that; otherwise use role priority (customer first)
    if view_as == "tasker" and is_tasker:
        query = {"tasker_id": str(current_user["_id"])}
    elif view_as == "customer" and is_customer:
        query = {"customer_id": str(current_user["_id"])}
    elif is_customer:
        query = {"customer_id": str(current_user["_id"])}
    elif is_tasker:
        query = {"tasker_id": str(current_user["_id"])}
    else:
        raise HTTPException(status_code=403, detail="Invalid user role")
    
    if status:
        query["status"] = status.value
    
    cursor = bookings_collection.find(query).sort("created_at", -1)
    bookings = await cursor.to_list(length=100)
    
    # Get additional details
    users_collection = await get_collection("users")
    services_collection = await get_collection("services")
    
    for booking in bookings:
        booking["_id"] = str(booking["_id"])
        
        # Get customer details
        customer = await users_collection.find_one({"_id": ObjectId(booking["customer_id"])})
        if customer:
            booking["customer"] = {
                "_id": str(customer["_id"]),
                "name": customer["name"],
                "email": customer["email"],
                "phone": customer.get("phone")
            }
            # Add flattened fields for frontend compatibility
            booking["customer_name"] = customer["name"]
            booking["customer_phone"] = customer.get("phone")
        
        # Get tasker details
        tasker = await users_collection.find_one({"_id": ObjectId(booking["tasker_id"])})
        if tasker:
            booking["tasker"] = {
                "_id": str(tasker["_id"]),
                "name": tasker["name"],
                "phone": tasker.get("phone"),
                "rating": tasker.get("rating", 0.0)
            }
            # Add flattened fields for frontend compatibility
            booking["tasker_name"] = tasker["name"]
            booking["tasker_phone"] = tasker.get("phone")
        
        # Get service details
        service = await services_collection.find_one({"_id": ObjectId(booking["service_id"])})
        if service:
            booking["service"] = {
                "_id": str(service["_id"]),
                "title": service["title"],
                "category": service["category"]
            }
            # Add flattened fields for frontend compatibility
            booking["service_name"] = service["title"]
            booking["service_category"] = service["category"]
        
        # Map backend fields to frontend expected fields (both old and new naming)
        booking["total_price"] = booking.get("total_amount", 0)
        booking["booking_date"] = booking.get("date")
        booking["booking_time"] = booking.get("time_slot")
        booking["description"] = booking.get("additional_notes", "")
        
        # Also add the fields with original naming for compatibility
        booking["scheduled_date"] = booking.get("date")
        booking["scheduled_time"] = booking.get("time_slot")
        booking["location"] = booking.get("address")
        booking["notes"] = booking.get("additional_notes", "")
        
        # Add rating info - for customers, use customer_rating
        user_role = current_user.get("role")
        user_roles = current_user.get("roles", [])
        
        if user_role == "customer" or "customer" in user_roles:
            booking["rating"] = booking.get("customer_rating")
            booking["review"] = booking.get("customer_review")
        elif user_role == "tasker" or "tasker" in user_roles:
            booking["rating"] = booking.get("tasker_rating")
            booking["review"] = booking.get("tasker_review")
    
    return bookings

@router.get("/{booking_id}")
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get booking details"""
    bookings_collection = await get_collection("bookings")
    
    try:
        booking = await bookings_collection.find_one({"_id": ObjectId(booking_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    user_role = current_user.get("role")
    user_roles = current_user.get("roles", [])
    is_superadmin = user_role == "superadmin" or "superadmin" in user_roles
    
    if booking["customer_id"] != str(current_user["_id"]) and booking["tasker_id"] != str(current_user["_id"]) and not is_superadmin:
        raise HTTPException(status_code=403, detail="Not authorized to view this booking")
    
    booking["_id"] = str(booking["_id"])
    
    return booking

@router.put("/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_data: UpdateBookingStatusRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update booking status"""
    bookings_collection = await get_collection("bookings")
    
    try:
        booking = await bookings_collection.find_one({"_id": ObjectId(booking_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    user_role = current_user.get("role")
    user_roles = current_user.get("roles", [])
    is_tasker = user_role == "tasker" or "tasker" in user_roles
    is_customer = user_role == "customer" or "customer" in user_roles
    is_superadmin = user_role == "superadmin" or "superadmin" in user_roles
    user_id = str(current_user["_id"])
    
    # Allow if user is the tasker OR the customer of this booking, or superadmin
    is_booking_tasker = booking["tasker_id"] == user_id
    is_booking_customer = booking["customer_id"] == user_id
    
    if not (is_booking_tasker or is_booking_customer or is_superadmin):
        raise HTTPException(status_code=403, detail="Not authorized to update this booking")
    
    update_data = {
        "status": status_data.status.value,
        "updated_at": datetime.utcnow()
    }
    
    # Handle payment status updates based on booking status
    payments_collection = await get_collection("payments")
    
    if status_data.status == BookingStatus.ACCEPTED:
        # When tasker accepts, lock the payment (escrow)
        await payments_collection.update_one(
            {"booking_id": booking_id, "status": "pending"},
            {"$set": {
                "status": "locked",
                "locked_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
    
    if status_data.status == BookingStatus.COMPLETED:
        update_data["completed_at"] = datetime.utcnow()
        
        # Update tasker's total jobs
        users_collection = await get_collection("users")
        await users_collection.update_one(
            {"_id": ObjectId(booking["tasker_id"])},
            {"$inc": {"total_jobs": 1}}
        )
        
        # Release payment from escrow to tasker
        payments_collection = await get_collection("payments")
        payment = await payments_collection.find_one({"booking_id": booking_id})
        
        if payment and payment.get("status") == "locked":
            # Import and use payment service to release funds
            from app.services.payment_service import payment_service
            
            try:
                # Release payment - this will transfer funds from customer to tasker
                await payment_service.release_payment(
                    payment_id=str(payment["_id"]),
                    release_notes="Automatic release on booking completion"
                )
                logger.info(f"Payment released for completed booking {booking_id}")
            except Exception as e:
                logger.error(f"Failed to release payment for booking {booking_id}: {str(e)}")
                # Continue with booking completion even if payment release fails
        elif payment and payment.get("status") == "pending":
            # If payment is still pending, just mark as completed (no funds to release)
            await payments_collection.update_one(
                {"booking_id": booking_id, "status": "pending"},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
    
    if status_data.status == BookingStatus.REJECTED:
        # When tasker rejects, refund the locked payment back to customer
        payment = await payments_collection.find_one({"booking_id": booking_id})
        
        if payment:
            logger.info(f"Processing rejection refund for booking {booking_id}, payment status: {payment.get('status')}")
            
            if payment.get("status") in ["locked", "pending"]:
                # Import and use payment service to refund
                from app.services.payment_service import payment_service
                
                try:
                    # Refund payment - this will unlock funds and return to customer
                    await payment_service.refund_payment(
                        payment_id=str(payment["_id"]),
                        refund_reason="Booking rejected by tasker"
                    )
                    logger.info(f"✅ Payment refunded successfully for rejected booking {booking_id}")
                except Exception as e:
                    logger.error(f"❌ Failed to refund payment for booking {booking_id}: {str(e)}", exc_info=True)
                    # Continue with booking rejection even if refund fails
            else:
                logger.warning(f"Cannot refund payment with status: {payment.get('status')} for booking {booking_id}")
        else:
            logger.warning(f"No payment found for rejected booking {booking_id}")
    
    if status_data.status == BookingStatus.CANCELLED:
        # When booking is cancelled, refund the locked payment back to customer
        payment = await payments_collection.find_one({"booking_id": booking_id})
        
        if payment and payment.get("status") == "locked":
            # Import and use payment service to refund
            from app.services.payment_service import payment_service
            
            try:
                # Refund payment - this will unlock funds and return to customer
                await payment_service.refund_payment(
                    payment_id=str(payment["_id"]),
                    refund_reason="Booking cancelled"
                )
                logger.info(f"Payment refunded for cancelled booking {booking_id}")
            except Exception as e:
                logger.error(f"Failed to refund payment for booking {booking_id}: {str(e)}")
                # Continue with booking cancellation even if refund fails
        elif payment and payment.get("status") == "pending":
            # If payment was still pending, just mark as cancelled
            await payments_collection.update_one(
                {"booking_id": booking_id, "status": "pending"},
                {"$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
    
    result = await bookings_collection.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": update_data}
    )
    
    # Create notification
    notification_type_map = {
        BookingStatus.ACCEPTED: NotificationType.BOOKING_ACCEPTED,
        BookingStatus.REJECTED: NotificationType.BOOKING_REJECTED,
        BookingStatus.COMPLETED: NotificationType.BOOKING_COMPLETED,
        BookingStatus.CANCELLED: NotificationType.BOOKING_CANCELLED
    }
    
    if status_data.status in notification_type_map:
        user_role = current_user.get("role")
        user_roles = current_user.get("roles", [])
        is_tasker = user_role == "tasker" or "tasker" in user_roles
        recipient_id = booking["customer_id"] if is_tasker else booking["tasker_id"]
        await create_notification(
            user_id=recipient_id,
            notification_type=notification_type_map[status_data.status],
            title=f"Booking {status_data.status.value.title()}",
            message=f"Your booking has been {status_data.status.value}",
            link=f"/bookings/{booking_id}"
        )
    
    updated_booking = await bookings_collection.find_one({"_id": ObjectId(booking_id)})
    updated_booking["_id"] = str(updated_booking["_id"])
    
    return updated_booking

@router.post("/{booking_id}/rate")
async def rate_booking(
    booking_id: str,
    rating_data: RateBookingRequest,
    current_user: dict = Depends(get_current_user)
):
    """Rate a completed booking"""
    try:
        logger.info(f"Rating booking {booking_id} by user {current_user['_id']} with rating {rating_data.rating}")
        
        bookings_collection = await get_collection("bookings")
        
        try:
            booking = await bookings_collection.find_one({"_id": ObjectId(booking_id)})
        except Exception as e:
            logger.error(f"Invalid booking ID: {booking_id}, Error: {e}")
            raise HTTPException(status_code=400, detail="Invalid booking ID")
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["status"] != BookingStatus.COMPLETED.value:
            raise HTTPException(status_code=400, detail="Can only rate completed bookings")
        
        # Check authorization and determine rating field
        user_role = current_user.get("role")
        user_roles = current_user.get("roles", [])
        is_customer = (user_role == "customer" or "customer" in user_roles) and booking["customer_id"] == str(current_user["_id"])
        is_tasker = (user_role == "tasker" or "tasker" in user_roles) and booking["tasker_id"] == str(current_user["_id"])
        
        if is_customer:
            # Check if already rated
            if booking.get("customer_rating"):
                raise HTTPException(status_code=400, detail="You have already rated this booking")
            
            rating_field = "customer_rating"
            review_field = "customer_review"
            rated_user_id = booking["tasker_id"]
        elif is_tasker:
            # Check if already rated
            if booking.get("tasker_rating"):
                raise HTTPException(status_code=400, detail="You have already rated this booking")
            
            rating_field = "tasker_rating"
            review_field = "tasker_review"
            rated_user_id = booking["customer_id"]
        else:
            raise HTTPException(status_code=403, detail="Not authorized to rate this booking")
        
        # Update booking with rating
        update_data = {
            rating_field: rating_data.rating,
            review_field: rating_data.review,
            "updated_at": datetime.utcnow()
        }
        
        await bookings_collection.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": update_data}
        )
        
        logger.info(f"Updated booking {booking_id} with {rating_field}={rating_data.rating}")
        
        # Update user's average rating
        users_collection = await get_collection("users")
        
        # Get all ratings for the user
        if is_customer:
            all_bookings = bookings_collection.find({
                "tasker_id": rated_user_id,
                "customer_rating": {"$exists": True}
            })
        else:
            all_bookings = bookings_collection.find({
                "customer_id": rated_user_id,
                "tasker_rating": {"$exists": True}
            })
        
        ratings = []
        async for b in all_bookings:
            if is_customer and b.get("customer_rating"):
                ratings.append(b["customer_rating"])
            elif is_tasker and b.get("tasker_rating"):
                ratings.append(b["tasker_rating"])
        
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            await users_collection.update_one(
                {"_id": ObjectId(rated_user_id)},
                {"$set": {"rating": round(avg_rating, 2)}}
            )
            logger.info(f"Updated user {rated_user_id} average rating to {round(avg_rating, 2)}")
        
        # Create notification
        await create_notification(
            user_id=rated_user_id,
            notification_type=NotificationType.REVIEW_RECEIVED,
            title="New Review Received",
            message=f"You received a {rating_data.rating}-star rating",
            link=f"/bookings/{booking_id}"
        )
        
        updated_booking = await bookings_collection.find_one({"_id": ObjectId(booking_id)})
        updated_booking["_id"] = str(updated_booking["_id"])
        
        # Add the simplified rating field for frontend
        if is_customer:
            updated_booking["rating"] = updated_booking.get("customer_rating")
            updated_booking["review"] = updated_booking.get("customer_review")
        
        logger.info(f"Rating completed successfully for booking {booking_id}")
        return updated_booking
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to rate booking {booking_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to rate booking: {str(e)}")
