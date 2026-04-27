from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from bson import ObjectId

class Message(BaseModel):
    sender_id: str
    content: str
    original_language: Optional[str] = 'en'  # ISO 639-1 code of original message
    translations: Optional[Dict[str, str]] = {}  # Cached translations: {"hi": "translated text"}
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False

class Chat(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    customer_id: str
    tasker_id: str
    messages: List[Message] = []
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
