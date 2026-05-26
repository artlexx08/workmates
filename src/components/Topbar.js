"use client";
import React from 'react';
import { Menu, Calendar, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Topbar({ setIsOpen, title }) {
  const { user, isSimulation } = useAuth();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-[#09090b]/75 backdrop-blur-md border-b border-zinc-900 text-zinc-100">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger menu */}
        <button
          id="open-sidebar-btn"
          className="lg:hidden p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        {/* Dashboard Title */}
        <div>
          <h2 className="text-md font-bold text-white tracking-tight">{title || 'Dashboard'}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status Badge */}
        <div className="hidden sm:flex items-center">
          {isSimulation ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/5 text-amber-500 border border-amber-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Offline Sim</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Firebase Connected</span>
            </div>
          )}
        </div>

        {/* Calendar Widget */}
        <div className="flex items-center gap-2 text-zinc-300 text-[10px] bg-zinc-900/40 border border-zinc-900 py-1.5 px-3 rounded-lg font-bold">
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          <span>{today}</span>
        </div>
      </div>
    </header>
  );
}
