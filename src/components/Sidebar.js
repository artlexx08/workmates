"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CalendarCheck, 
  Banknote, 
  HandCoins, 
  FileSpreadsheet, 
  LogOut, 
  Hammer, 
  Settings,
  X 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ isOpen, setIsOpen, collapsed, setCollapsed }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Work Sites', href: '/dashboard/sites', icon: Building2 },
    { name: 'Workers', href: '/dashboard/workers', icon: Users },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Advances', href: '/dashboard/advance', icon: HandCoins },
    { name: 'Salary Ledger', href: '/dashboard/salary', icon: Banknote },
    { name: 'PDF Reports', href: '/dashboard/reports', icon: FileSpreadsheet },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const SidebarContent = () => (
    <div className={`flex flex-col h-full bg-[#0c0c0e] border-r border-zinc-900 text-zinc-100 ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-900">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
            <Hammer className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center">
                Work<span className="text-amber-500">Mate</span>
              </h1>
              <p className="text-[9px] text-zinc-500 tracking-widest uppercase font-semibold">Workshop Suite</p>
            </div>
          )}
        </Link>
        {/* Mobile close button */}
        <button 
          id="close-sidebar-btn"
          className="lg:hidden p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group relative ${
                isActive 
                  ? 'text-amber-500 bg-amber-500/5 border-l-[3px] border-amber-500 pl-[13px] shadow-[inset_4px_0_12px_rgba(245,158,11,0.02)]' 
                  : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-amber-500' : 'text-zinc-500 group-hover:text-amber-500/80'
              }`} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-4 border-t border-zinc-900 bg-[#08080a]">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/30 border border-zinc-900 mb-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-zinc-950 font-bold text-xs">
            {user?.companyName ? user.companyName.charAt(0).toUpperCase() : 'W'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.companyName || 'My Workshop'}</p>
              <p className="text-[9px] text-zinc-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl border border-red-500/10 text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all text-xs font-semibold"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block ${collapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 shrink-0 transition-all duration-300`}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
        {/* Sliding Panel */}
        <div className={`absolute top-0 bottom-0 left-0 w-64 transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </div>
      </div>
    </>
  );
}
