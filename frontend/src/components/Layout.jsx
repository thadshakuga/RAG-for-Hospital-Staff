import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Hospital, MessageSquare, BookOpen, FolderOpen, LogOut } from "lucide-react";

const NAV = [
  { to: "/chat", icon: MessageSquare, label: "Team Chat" },
  { to: "/ask", icon: BookOpen, label: "Ask AI" },
  { to: "/documents", icon: FolderOpen, label: "Documents" },
];

const ROLE_BADGE = { doctor: "bg-blue-100 text-blue-700", nurse: "bg-green-100 text-green-700", admin: "bg-purple-100 text-purple-700", pharmacist: "bg-orange-100 text-orange-700" };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b h-14 flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2 text-blue-600">
          <Hospital size={22} />
          <span className="font-bold text-gray-900 text-sm">ClinicalAssist</span>
        </div>
        <nav className="flex gap-1 ml-4">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`
              }>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-800">{user?.full_name}</p>
            <p className="text-xs text-gray-400">{user?.department}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user?.role] || "bg-gray-100 text-gray-600"}`}>
            {user?.role}
          </span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
