from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserOut


class ChatRoomCreate(BaseModel):
    name: str
    description: str | None = None


class ChatRoomOut(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageOut(BaseModel):
    id: int
    room_id: int
    content: str
    created_at: datetime
    sender: UserOut

    model_config = {"from_attributes": True}


class WSMessage(BaseModel):
    type: str  # "message" | "join" | "leave"
    content: str | None = None
    room_id: int | None = None
