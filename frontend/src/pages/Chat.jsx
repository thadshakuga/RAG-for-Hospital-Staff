import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { Send, Plus, Hash } from "lucide-react";

export default function Chat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get("/chat/rooms").then((r) => setRooms(r.data));
  }, []);

  useEffect(() => {
    if (!activeRoom) return;
    api.get(`/chat/rooms/${activeRoom.id}/messages`).then((r) => setMessages(r.data));

    const token = localStorage.getItem("token");
    const ws = new WebSocket(`ws://localhost:8000/chat/ws/${activeRoom.id}?token=${token}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      setMessages((prev) => [...prev, msg]);
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!input.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ content: input.trim() }));
    setInput("");
  }

  async function createRoom() {
    if (!newRoom.trim()) return;
    const { data } = await api.post("/chat/rooms", { name: newRoom.trim() });
    setRooms((prev) => [...prev, data]);
    setNewRoom("");
    setActiveRoom(data);
  }

  const ROLE_COLORS = { doctor: "bg-blue-100 text-blue-700", nurse: "bg-green-100 text-green-700", admin: "bg-purple-100 text-purple-700", pharmacist: "bg-orange-100 text-orange-700" };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 bg-gray-800 text-white flex flex-col shrink-0">
        <div className="p-4 font-semibold text-gray-300 text-xs uppercase tracking-wider">Channels</div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map((r) => (
            <button key={r.id}
              onClick={() => setActiveRoom(r)}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 text-sm hover:bg-gray-700 transition ${activeRoom?.id === r.id ? "bg-gray-600" : ""}`}>
              <Hash size={14} className="text-gray-400" />{r.name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-700 flex gap-2">
          <input
            className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1 placeholder-gray-400 outline-none"
            placeholder="New channel"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createRoom()}
          />
          <button onClick={createRoom} className="text-gray-300 hover:text-white"><Plus size={16} /></button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col bg-white">
        {activeRoom ? (
          <>
            <div className="border-b px-6 py-3 flex items-center gap-2">
              <Hash size={18} className="text-gray-500" />
              <span className="font-semibold text-gray-800">{activeRoom.name}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((m, i) => {
                const sender = m.sender || {};
                const isMe = sender.id === user?.id;
                return (
                  <div key={m.id ?? i} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLORS[sender.role] || "bg-gray-100 text-gray-600"}`}>
                      {(sender.full_name || "?")[0]}
                    </div>
                    <div className={`max-w-sm ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      <div className="text-xs text-gray-400 mb-1">{isMe ? "You" : sender.full_name}</div>
                      <div className={`rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="border-t px-4 py-3 flex gap-3">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Message #${activeRoom.name}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button onClick={send} disabled={!input.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg px-4 py-2 transition">
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a channel or create one to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
