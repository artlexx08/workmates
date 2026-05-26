"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Users, CalendarCheck, HandCoins, Banknote, FileSpreadsheet, Settings } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Work Sites', href: '/dashboard/sites', icon: Building2 },
    { name: 'Workers', href: '/dashboard/workers', icon: Users },
    { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck },
    { name: 'Advances', href: '/dashboard/advance', icon: HandCoins },
    { name: 'Salary', href: '/dashboard/salary', icon: Banknote },
    { name: 'Reports', href: '/dashboard/reports', icon: FileSpreadsheet },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <nav className="bottom-nav glass-panel flex lg:hidden items-center justify-between px-4">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center text-xs ${isActive ? 'text-amber-500' : 'text-wood-text-muted'} hover:text-amber-400`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
