from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from app.middleware.auth import get_current_user
from app.services.payment_service import payment_service
from app.models.payment import (
    InitiatePaymentRequest,
    VerifyPaymentRequest,
    ReleasePaymentRequest,
    RefundPaymentRequest,
    PaymentSettings
)

router = APIRouter(prefix="/payments", tags=["payments"])

@router.post("/initiate")
async def initiate_payment(
    request: InitiatePaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Initiate payment for a booking"""
    try:
        # Get booking details
        from app.database import get_collection
        from bson import ObjectId
        
        bookings_collection = await get_collection("bookings")
        booking = await bookings_collection.find_one({"_id": ObjectId(request.booking_id)})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Verify user is the customer
        if str(booking["customer_id"]) != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        payment = await payment_service.initiate_payment(
            booking_id=request.booking_id,
            customer_id=str(booking["customer_id"]),
            provider_id=str(booking["tasker_id"]),
            amount=booking.get("total_amount", booking.get("total_price", 0)),
            payment_method=request.payment_method
        )
        
        return {
            "success": True,
            "message": "Payment initiated successfully",
            "payment": payment
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify")
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Verify payment and lock in escrow"""
    try:
        payment = await payment_service.verify_payment(
            payment_id=request.payment_id,
            upi_transaction_id=request.upi_transaction_id,
            upi_reference_number=request.upi_reference_number,
            verified_by=str(current_user["_id"])
        )
        
        return {
            "success": True,
            "message": "Payment verified and locked in escrow",
            "payment": payment
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-verify/{payment_id}")
async def auto_verify_payment(
    payment_id: str,
    upi_transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Auto-verify payment (simulated)"""
    try:
        payment = await payment_service.auto_verify_payment(
            payment_id=payment_id,
            upi_transaction_id=upi_transaction_id
        )
        
        return {
            "success": True,
            "message": "Payment verified automatically",
            "payment": payment
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/release")
async def release_payment(
    request: ReleasePaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Release payment from escrow to provider (Admin or Customer after completion)"""
    try:
        # Verify authorization (admin or customer who booked)
        payment = await payment_service.get_payment_by_id(request.payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        is_admin = current_user.get("role") == "superadmin"
        is_customer = str(payment["customer_id"]) == str(current_user["_id"])
        
        if not (is_admin or is_customer):
            raise HTTPException(status_code=403, detail="Not authorized to release payment")
        
        released_payment = await payment_service.release_payment(
            payment_id=request.payment_id,
            release_notes=request.release_notes
        )
        
        return {
            "success": True,
            "message": "Payment released to provider",
            "payment": released_payment
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refund")
async def refund_payment(
    request: RefundPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Refund payment to customer (Admin only)"""
    try:
        # Only admin can refund
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Only admin can process refunds")
        
        refunded_payment = await payment_service.refund_payment(
            payment_id=request.payment_id,
            refund_reason=request.refund_reason
        )
        
        return {
            "success": True,
            "message": "Payment refunded to customer",
            "payment": refunded_payment
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/booking/{booking_id}")
async def get_payment_by_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payment details for a booking"""
    try:
        payment = await payment_service.get_payment_by_booking(booking_id)
        if not payment:
            return {"success": True, "payment": None}
        
        return {
            "success": True,
            "payment": payment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{payment_id}")
async def get_payment_details(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payment details by ID"""
    try:
        payment = await payment_service.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        return {
            "success": True,
            "payment": payment
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{payment_id}")
async def check_payment_status(
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check payment status"""
    try:
        status = await payment_service.check_payment_status(payment_id)
        return {
            "success": True,
            "status": status
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Admin routes for payment settings
@router.get("/settings/current")
async def get_payment_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get current payment settings"""
    try:
        settings = await payment_service.get_payment_settings()
        
        # Return default settings if none configured
        if not settings:
            settings = {
                "admin_upi_id": "admin@upi",
                "admin_qr_code_url": None,
                "is_configured": False
            }
        else:
            settings["is_configured"] = True
            
        return {
            "success": True,
            "settings": settings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings/update")
async def update_payment_settings(
    settings: PaymentSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update payment settings (Admin only)"""
    try:
        # Only admin can update settings
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Only admin can update payment settings")
        
        settings_dict = settings.dict(exclude={"id", "created_at"})
        updated_settings = await payment_service.update_payment_settings(settings_dict)
        
        return {
            "success": True,
            "message": "Payment settings updated successfully",
            "settings": updated_settings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
