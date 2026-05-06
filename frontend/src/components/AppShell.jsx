import {
  BarChart3,
  Bell,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Shield,
  ShieldAlert,
  X,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navGroups = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/policyholders", label: "Policy Holders", icon: Users },
      { to: "/predict", label: "Churn Prediction", icon: ShieldAlert },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/register-policy", label: "Register Policyholder", icon: UserPlus },
      { to: "/file-claim", label: "File a Claim", icon: FilePlus2 },
      { to: "/claims-management", label: "Claims Management", icon: ClipboardList },
      { to: "/matured-policies", label: "Matured Policies", icon: CalendarClock },
      { to: "/payment-updates", label: "Payment Updates", icon: CreditCard },
    ],
  },
];

function SidebarContent({ user, onLogout, onNavigate }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-6 lg:py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3c65d] text-[#152240]">
            <Shield size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-white">NYARADZO</p>
            <p className="text-[11px] text-slate-300">Policy Management System</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 lg:py-6">
        <div className="space-y-7 lg:space-y-8">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {group.label}
              </p>
              <nav className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      ["sidebar-link", isActive ? "sidebar-link-active" : "sidebar-link-idle"].join(" ")
                    }
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span className="min-w-0 truncate">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="mb-3 rounded-lg bg-white/5 px-4 py-3 text-xs text-slate-300">
          <div className="font-semibold text-white">{user?.full_name || "Analyst"}</div>
          <div className="mt-1 truncate">{user?.email}</div>
        </div>
        <button type="button" onClick={onLogout} className="sidebar-link sidebar-link-idle w-full">
          <LogOut size={16} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}

export default function AppShell({ user, onLogout }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell h-screen overflow-hidden">
      <div className="grid h-screen lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="sidebar hidden h-screen flex-col overflow-hidden lg:flex">
          <SidebarContent user={user} onLogout={onLogout} />
        </aside>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation backdrop"
              className="absolute inset-0 bg-slate-950/50"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="sidebar relative flex h-full w-[min(82vw,320px)] flex-col overflow-hidden shadow-2xl">
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
                  aria-label="Close navigation"
                >
                  <X size={19} />
                </button>
              </div>
              <SidebarContent user={user} onLogout={onLogout} onNavigate={() => setMobileNavOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="content-shell flex h-screen min-w-0 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:px-7 md:py-4">
            <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={19} />
                </button>
                <label className="relative hidden min-w-0 flex-1 md:block lg:max-w-[360px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#16264a] focus:ring-2 focus:ring-[#16264a]/10"
                    placeholder="Search policies, claims, holders..."
                  />
                </label>
                <div className="min-w-0 lg:hidden">
                  <p className="truncate text-sm font-bold text-slate-900">Nyaradzo</p>
                  <p className="truncate text-xs text-slate-500">Policy Management</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 md:gap-4">
                <button type="button" className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600">
                  <Bell size={18} />
                  <span className="absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    3
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18264b] text-sm font-bold text-white md:h-11 md:w-11">
                    {user?.full_name
                      ?.split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2) || "NA"}
                  </div>
                  <div className="hidden text-right md:block">
                    <div className="text-sm font-semibold text-slate-900">{user?.full_name || "Nyaradzo Admin"}</div>
                    <div className="text-xs text-slate-500">System Administrator</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 py-4 md:px-7 md:py-6">
            <div className="mx-auto max-w-[1280px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
