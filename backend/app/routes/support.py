from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from app.middleware.auth import get_current_user
from app.services.support_service import support_service
from app.models.support_ticket import (
    CreateTicketRequest,
    CreateComplaintRequest,
    UpdateTicketRequest,
    ReviewComplaintRequest,
    AddMessageRequest,
    RateTicketRequest
)

router = APIRouter(prefix="/support", tags=["Customer Support"])


@router.post("/tickets/create")
async def create_support_ticket(
    request: CreateTicketRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new support ticket with auto-escalation logic"""
    try:
        ticket = await support_service.create_ticket(
            user_id=str(current_user["_id"]),
            user_name=current_user.get("name", "Unknown"),
            user_email=current_user.get("email", ""),
            user_role=current_user.get("role", "customer"),
            category=request.category,
            subject=request.subject,
            description=request.description,
            booking_id=request.booking_id,
            payment_id=request.payment_id,
            is_complaint=request.is_complaint,
            complaint_against_id=request.complaint_against_id,
            evidence_urls=request.evidence_urls,
            evidence_description=request.evidence_description
        )
        
        return {
            "success": True,
            "message": "Support ticket created successfully",
            "ticket": ticket,
            "escalated": ticket.get("auto_escalated", False),
            "escrow_frozen": ticket.get("escrow_frozen", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complaints/create")
async def create_complaint(
    request: CreateComplaintRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a complaint/dispute with automatic escrow freeze"""
    try:
        # Get payment ID from booking if not provided
        payment_id = request.payment_id
        if not payment_id and request.booking_id:
            from app.database import get_collection
            from bson import ObjectId
            
            payments_collection = await get_collection("payments")
            payment = await payments_collection.find_one({"booking_id": request.booking_id})
            if payment:
                payment_id = str(payment["_id"])
        
        ticket = await support_service.create_ticket(
            user_id=str(current_user["_id"]),
            user_name=current_user.get("name", "Unknown"),
            user_email=current_user.get("email", ""),
            user_role=current_user.get("role", "customer"),
            category=request.category,
            subject=request.subject,
            description=request.description,
            booking_id=request.booking_id,
            payment_id=payment_id,
            is_complaint=True,
            complaint_against_id=request.complaint_against_id,
            evidence_urls=request.evidence_urls,
            evidence_description=request.evidence_description
        )
        
        return {
            "success": True,
            "message": "Complaint filed successfully. Escrow payment has been frozen pending review.",
            "ticket": ticket,
            "escrow_frozen": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets/my-tickets")
async def get_my_tickets(
    current_user: dict = Depends(get_current_user)
):
    """Get all tickets created by current user"""
    try:
        tickets = await support_service.get_user_tickets(str(current_user["_id"]))
        return {
            "success": True,
            "tickets": tickets
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get ticket details by ID"""
    try:
        ticket = await support_service.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check authorization
        is_owner = str(ticket["user_id"]) == str(current_user["_id"])
        is_admin = current_user.get("role") == "superadmin"
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {
            "success": True,
            "ticket": ticket
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tickets/{ticket_id}/messages")
async def get_ticket_messages(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a ticket"""
    try:
        ticket = await support_service.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check authorization
        is_owner = str(ticket["user_id"]) == str(current_user["_id"])
        is_admin = current_user.get("role") == "superadmin"
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        messages = await support_service.get_ticket_messages(ticket_id)
        return {
            "success": True,
            "messages": messages
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tickets/add-message")
async def add_ticket_message(
    request: AddMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add a message to ticket conversation"""
    try:
        ticket = await support_service.get_ticket_by_id(request.ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check authorization
        is_owner = str(ticket["user_id"]) == str(current_user["_id"])
        is_admin = current_user.get("role") == "superadmin"
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        sender_type = "agent" if is_admin else "customer"
        
        message = await support_service.add_message(
            ticket_id=request.ticket_id,
            sender_id=str(current_user["_id"]),
            sender_name=current_user.get("name", "Unknown"),
            sender_type=sender_type,
            message=request.message,
            attachments=request.attachments
        )
        
        return {
            "success": True,
            "message": message
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tickets/{ticket_id}/escalate")
async def escalate_ticket(
    ticket_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Manually escalate ticket to human agent"""
    try:
        ticket = await support_service.get_ticket_by_id(ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Check authorization (owner or admin)
        is_owner = str(ticket["user_id"]) == str(current_user["_id"])
        is_admin = current_user.get("role") == "superadmin"
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        escalated_ticket = await support_service.escalate_to_human(ticket_id, reason)
        
        return {
            "success": True,
            "message": "Ticket escalated to human agent",
            "ticket": escalated_ticket
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tickets/rate")
async def rate_ticket(
    request: RateTicketRequest,
    current_user: dict = Depends(get_current_user)
):
    """Rate a resolved ticket"""
    try:
        ticket = await support_service.get_ticket_by_id(request.ticket_id)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Only owner can rate
        if str(ticket["user_id"]) != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if request.rating < 1 or request.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        rated_ticket = await support_service.rate_ticket(
            ticket_id=request.ticket_id,
            rating=request.rating,
            feedback=request.feedback
        )
        
        return {
            "success": True,
            "message": "Thank you for your feedback!",
            "ticket": rated_ticket
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== ADMIN ROUTES =====

@router.get("/admin/tickets/all")
async def get_all_tickets(
    tier: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all support tickets (Admin only)"""
    try:
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access only")
        
        tickets = await support_service.get_all_tickets(tier=tier, status=status)
        return {
            "success": True,
            "tickets": tickets
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/admin/tickets/{ticket_id}/update")
async def update_ticket(
    ticket_id: str,
    request: UpdateTicketRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update ticket status and details (Admin only)"""
    try:
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access only")
        
        ticket = await support_service.update_ticket(
            ticket_id=ticket_id,
            status=request.status,
            priority=request.priority,
            assigned_to=request.assigned_to,
            assigned_agent_name=current_user.get("name") if request.assigned_to else None,
            resolution_notes=request.resolution_notes,
            resolved_by=str(current_user["_id"]) if request.status == "resolved" else None
        )
        
        return {
            "success": True,
            "message": "Ticket updated successfully",
            "ticket": ticket
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/statistics")
async def get_support_statistics(
    current_user: dict = Depends(get_current_user)
):
    """Get support statistics (Admin only)"""
    try:
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access only")
        
        stats = await support_service.get_statistics()
        return {
            "success": True,
            "statistics": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complaints/{ticket_id}/ai-review")
async def trigger_ai_review(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Trigger AI review for a complaint (Admin only)"""
    try:
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access only")
        
        result = await support_service.perform_ai_review(ticket_id)
        return {
            "success": True,
            "message": "AI review completed",
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complaints/{ticket_id}/admin-review")
async def submit_admin_review(
    ticket_id: str,
    request: ReviewComplaintRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit admin review and resolve complaint with refund/penalty (Admin only)"""
    try:
        if current_user.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Admin access only")
        
        result = await support_service.admin_review_complaint(
            ticket_id=ticket_id,
            review_result=request.review_result,
            review_notes=request.review_notes,
            refund_amount=request.refund_amount,
            penalty_amount=request.penalty_amount,
            admin_id=str(current_user["_id"])
        )
        return {
            "success": True,
            "message": "Complaint reviewed and resolved successfully",
            "result": result,
            "escrow_unfrozen": True
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
