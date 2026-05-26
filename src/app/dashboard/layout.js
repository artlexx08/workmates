"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import BottomNav from '@/components/BottomNav';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Map paths to section titles
  const getTitle = () => {
    if (pathname.includes('/sites')) return 'Work Sites Management';
    if (pathname.includes('/workers')) return 'Workers Directory';
    if (pathname.includes('/attendance')) return 'Daily Attendance Tracker';
    if (pathname.includes('/salary')) return 'Salary Ledger & Payroll';
    if (pathname.includes('/advance')) return 'Advance Salary Payments';
    if (pathname.includes('/reports')) return 'PDF Report Generator';
    return 'Workshop Dashboard';
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-wood-radial wood-grain">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-wood-amber mx-auto mb-4"></div>
          <p className="text-wood-text-muted text-sm tracking-wider font-semibold animate-pulse-slow">SECURE AUTHENTICATION...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-wood-gradient wood-grain">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main app panel */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300">
        <Topbar setIsOpen={setSidebarOpen} setCollapsed={setSidebarCollapsed} title={getTitle()} />
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-6 relative">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
