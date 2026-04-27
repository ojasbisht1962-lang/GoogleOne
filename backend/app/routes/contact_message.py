from fastapi import APIRouter, HTTPException, status, Request
from app.models.contact_message import ContactMessage
from app.database import get_collection
from datetime import datetime

router = APIRouter()

@router.post("/contact-message", status_code=status.HTTP_201_CREATED)
async def create_contact_message(msg: ContactMessage):
    """Create a support ticket from anonymous contact form submission"""
    try:
        # Create a support ticket instead of just storing contact message
        tickets_collection = await get_collection("support_tickets")
        
        ticket_data = {
            "user_id": None,  # Anonymous
            "user_name": msg.name,
            "user_email": msg.email,
            "user_role": "guest",
            "category": "general",
            "subject": msg.subject,
            "description": msg.message,
            "status": "open",
            "priority": "low",
            "tier": "human",  # Route to human agents
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_complaint": False,
            "is_anonymous": True,  # Flag for anonymous submissions
            "allow_replies": False,  # No chat interface for anonymous users
            "messages": []
        }
        
        result = await tickets_collection.insert_one(ticket_data)
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create support ticket")
        
        return {
            "message": "Your message has been received. Our support team will contact you soon.",
            "ticket_id": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/contact-messages", status_code=status.HTTP_200_OK)
async def get_contact_messages():
    collection = await get_collection("contact_messages")
    messages = await collection.find({}, {"_id": 0}).to_list(length=1000)
    return {"messages": messages}
