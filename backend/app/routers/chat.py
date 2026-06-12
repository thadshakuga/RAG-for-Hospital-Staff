import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db, AsyncSessionLocal
from app.models.chat import ChatRoom, ChatMessage
from app.models.user import User
from app.schemas.chat import ChatRoomCreate, ChatRoomOut, ChatMessageOut
from app.services.auth import get_current_user, verify_password
from jose import jwt, JWTError
from app.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])

# room_id -> set of websockets
_connections: dict[int, set[WebSocket]] = {}


@router.get("/rooms", response_model=list[ChatRoomOut])
async def list_rooms(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(ChatRoom).order_by(ChatRoom.name))
    return result.scalars().all()


@router.post("/rooms", response_model=ChatRoomOut, status_code=201)
async def create_room(data: ChatRoomCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    room = ChatRoom(name=data.name, description=data.description)
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room


@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageOut])
async def get_messages(room_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .options(selectinload(ChatMessage.sender))
        .order_by(ChatMessage.created_at)
        .limit(100)
    )
    return result.scalars().all()


@router.websocket("/ws/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: int, token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        await websocket.close(code=4001)
        return

    await websocket.accept()
    _connections.setdefault(room_id, set()).add(websocket)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            await websocket.close(code=4001)
            return

        try:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                content = data.get("content", "").strip()
                if not content:
                    continue

                msg = ChatMessage(room_id=room_id, sender_id=user.id, content=content)
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

                broadcast = json.dumps({
                    "id": msg.id,
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat(),
                    "sender": {"id": user.id, "full_name": user.full_name, "role": user.role},
                })
                dead = set()
                for ws in _connections.get(room_id, set()):
                    try:
                        await ws.send_text(broadcast)
                    except Exception:
                        dead.add(ws)
                _connections[room_id] -= dead

        except WebSocketDisconnect:
            _connections[room_id].discard(websocket)
