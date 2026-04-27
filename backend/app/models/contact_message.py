from pydantic import BaseModel, EmailStr
from typing import Optional

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str
    created_at: Optional[str] = None
