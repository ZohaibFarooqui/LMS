"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useAuthController } from "@/controllers/useAuthController";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarPlus,
  ClipboardList,
  Clock,
  User,
  Users,
  UserCog,
  Briefcase,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leave/apply", label: "Apply Leave", icon: CalendarPlus },
  { href: "/leave/status", label: "Leave Status", icon: ClipboardList },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/profile", label: "Profile", icon: User },
];

const hrNavItems = [
  { href: "/hrms", label: "HRMS", icon: UserCog },
  { href: "/recruitment", label: "Recruitment", icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { handleLogout } = useAuthController();
  const [collapsed, setCollapsed] = useState(false);

  const allItems = user?.hr_admin ? [...navItems, ...hrNavItems] : navItems;

  return (
    <>
      {/* Mobile overlay */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-100 z-40 transition-all duration-300 flex flex-col",
          collapsed ? "w-20" : "w-64",
          "max-lg:-translate-x-full max-lg:data-[open=true]:translate-x-0"
        )}
        data-open={!collapsed}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <Image
              src="/LMS_Black.png"
              alt="LMS Logo"
              width={36}
              height={36}
              className="shrink-0"
            />
            {!collapsed && (
              <h1 className="text-xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                LMS Portal
              </h1>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-5 w-5 text-gray-400 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* User info */}
        <div className={cn("px-4 py-4 border-b border-gray-50", collapsed && "px-2")}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {user?.emp_name?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.emp_name || "User"}
                </p>
                <p className="text-xs text-gray-500">ID: {user?.card_no}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-600" : "text-gray-400")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full",
              collapsed && "justify-center px-2"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
