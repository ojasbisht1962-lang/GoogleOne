from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from app.middleware.auth import get_current_user
from app.database import get_collection
from app.models.chat import Chat, Message
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
from app.services.translation_service import get_translation_service
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/chat", tags=["Chat"])

class SendMessageRequest(BaseModel):
    recipient_id: str
    content: str

@router.post("/send")
async def send_message(
    message_data: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a chat message with automatic language detection"""
    chats_collection = await get_collection("chats")
    users_collection = await get_collection("users")
    bookings_collection = await get_collection("bookings")
    
    # Verify recipient exists
    try:
        recipient = await users_collection.find_one({"_id": ObjectId(message_data.recipient_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid recipient ID")
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Determine customer and tasker IDs
    if current_user["role"] == "customer":
        customer_id = str(current_user["_id"])
        tasker_id = message_data.recipient_id
    elif current_user["role"] == "tasker":
        customer_id = message_data.recipient_id
        tasker_id = str(current_user["_id"])
    else:
        raise HTTPException(status_code=403, detail="Invalid user role for chat")
    
    # Check if there's a completed booking between these users
    completed_booking = await bookings_collection.find_one({
        "customer_id": customer_id,
        "tasker_id": tasker_id,
        "status": "completed"
    })
    
    if completed_booking:
        raise HTTPException(
            status_code=403, 
            detail="Cannot send new messages after the booking is completed. You can still view your chat history."
        )
    
    # Detect language of the message
    translation_service = get_translation_service()
    detected_language = await translation_service.detect_language(message_data.content)
    
    # Find or create chat
    chat = await chats_collection.find_one({
        "customer_id": customer_id,
        "tasker_id": tasker_id
    })
    
    new_message = Message(
        sender_id=str(current_user["_id"]),
        content=message_data.content,
        original_language=detected_language,
        translations={},
        timestamp=datetime.utcnow(),
        is_read=False
    )
    
    if chat:
        # Update existing chat
        result = await chats_collection.update_one(
            {"_id": chat["_id"]},
            {
                "$push": {"messages": new_message.dict()},
                "$set": {
                    "last_message": message_data.content,
                    "last_message_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        chat_id = str(chat["_id"])
    else:
        # Create new chat
        new_chat = Chat(
            customer_id=customer_id,
            tasker_id=tasker_id,
            messages=[new_message],
            last_message=message_data.content,
            last_message_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await chats_collection.insert_one(new_chat.dict(by_alias=True, exclude={"id"}))
        chat_id = str(result.inserted_id)
    
    # Create notification for recipient
    await create_notification(
        user_id=message_data.recipient_id,
        notification_type=NotificationType.CHAT_MESSAGE,
        title="New Message",
        message=f"{current_user['name']}: {message_data.content[:50]}...",
        link=f"/chat/{chat_id}"
    )
    
    return {"chat_id": chat_id, "message": new_message.dict()}

@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all chat conversations for current user"""
    chats_collection = await get_collection("chats")
    bookings_collection = await get_collection("bookings")
    
    if current_user["role"] == "customer":
        query = {"customer_id": str(current_user["_id"])}
    elif current_user["role"] == "tasker":
        query = {"tasker_id": str(current_user["_id"])}
    else:
        raise HTTPException(status_code=403, detail="Invalid user role for chat")
    
    cursor = chats_collection.find(query).sort("last_message_at", -1)
    chats = await cursor.to_list(length=100)
    
    # Get user details for each chat
    users_collection = await get_collection("users")
    
    for chat in chats:
        chat["_id"] = str(chat["_id"])
        
        # Check if messaging is disabled for this chat
        completed_booking = await bookings_collection.find_one({
            "customer_id": chat["customer_id"],
            "tasker_id": chat["tasker_id"],
            "status": "completed"
        })
        chat["is_messaging_disabled"] = bool(completed_booking)
        
        # Get other participant details
        other_user_id = chat["tasker_id"] if current_user["role"] == "customer" else chat["customer_id"]
        other_user = await users_collection.find_one({"_id": ObjectId(other_user_id)})
        
        if other_user:
            chat["other_user"] = {
                "_id": str(other_user["_id"]),
                "name": other_user["name"],
                "profile_picture": other_user.get("profile_picture"),
                "role": other_user["role"]
            }
        
        # Count unread messages
        unread_count = sum(1 for msg in chat.get("messages", []) 
                          if not msg.get("is_read", False) and msg["sender_id"] != str(current_user["_id"]))
        chat["unread_count"] = unread_count
    
    return chats

@router.get("/{chat_id}")
async def get_chat(
    chat_id: str,
    translate_to: Optional[str] = Query(None, description="ISO 639-1 language code to translate messages to"),
    current_user: dict = Depends(get_current_user)
):
    """Get chat messages with optional translation"""
    chats_collection = await get_collection("chats")
    users_collection = await get_collection("users")
    bookings_collection = await get_collection("bookings")
    
    try:
        chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check authorization
    if chat["customer_id"] != str(current_user["_id"]) and chat["tasker_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")
    
    chat["_id"] = str(chat["_id"])
    
    # Check if there's a completed booking (disable new messages)
    completed_booking = await bookings_collection.find_one({
        "customer_id": chat["customer_id"],
        "tasker_id": chat["tasker_id"],
        "status": "completed"
    })
    chat["is_messaging_disabled"] = bool(completed_booking)
    chat["messaging_disabled_reason"] = "Booking completed - Chat history is read-only" if completed_booking else None
    
    # Get other participant details
    other_user_id = chat["tasker_id"] if current_user["role"] == "customer" else chat["customer_id"]
    other_user = await users_collection.find_one({"_id": ObjectId(other_user_id)})
    
    if other_user:
        chat["other_user"] = {
            "_id": str(other_user["_id"]),
            "name": other_user["name"],
            "profile_picture": other_user.get("profile_picture"),
            "role": other_user["role"],
            "preferred_language": other_user.get("preferred_language", "en")
        }
    
    # Translate messages if requested
    if translate_to and translate_to != 'original':
        translation_service = get_translation_service()
        messages = chat.get("messages", [])
        
        print(f"Translating {len(messages)} messages to {translate_to}")
        
        for message in messages:
            original_lang = message.get("original_language", "en")
            
            print(f"Message: '{message['content'][:50]}...' from {original_lang} to {translate_to}")
            
            if original_lang != translate_to:
                # Check if translation is cached
                translations = message.get("translations", {})
                if translate_to in translations:
                    message["translated_text"] = translations[translate_to]
                    print(f"Using cached translation: {message['translated_text'][:50]}...")
                else:
                    # Translate and cache
                    print(f"Calling translation service...")
                    result = await translation_service.translate_text(
                        message["content"],
                        translate_to,
                        original_lang
                    )
                    message["translated_text"] = result["translated_text"]
                    print(f"Translation result: {message['translated_text'][:50]}...")
                    
                    # Update cache in database
                    await chats_collection.update_one(
                        {"_id": ObjectId(chat_id), "messages.timestamp": message["timestamp"]},
                        {"$set": {f"messages.$[elem].translations.{translate_to}": result["translated_text"]}},
                        array_filters=[{"elem.timestamp": message["timestamp"]}]
                    )
            else:
                message["translated_text"] = message["content"]
                print(f"Same language, using original text")
    
    # Mark messages as read
    await chats_collection.update_many(
        {
            "_id": ObjectId(chat_id),
            "messages.sender_id": {"$ne": str(current_user["_id"])}
        },
        {"$set": {"messages.$[elem].is_read": True}},
        array_filters=[{"elem.sender_id": {"$ne": str(current_user["_id"])}}]
    )
    
    return chat

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chat conversation"""
    chats_collection = await get_collection("chats")
    
    try:
        chat = await chats_collection.find_one({"_id": ObjectId(chat_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check authorization
    if chat["customer_id"] != str(current_user["_id"]) and chat["tasker_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this chat")
    
    result = await chats_collection.delete_one({"_id": ObjectId(chat_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Failed to delete chat")
    
    return {"message": "Chat deleted successfully"}
