"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData, saveAttendance } from '@/lib/db';
import { 
  Calendar, 
  Search, 
  Filter, 
  Check, 
  Clock, 
  X as CloseIcon, 
  RotateCcw, 
  User, 
  IndianRupee 
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// Animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

export default function AttendancePage() {
  const { user, isSimulation } = useAuth();
  const [workers, setWorkers] = useState({});
  const [sites, setSites] = useState({});
  const [attendance, setAttendance] = useState({}); // Stores the selected date's attendance: { workerId: status }
  const [loading, setLoading] = useState(true);
  
  // Date, Search, Filters
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');

  useEffect(() => {
    if (!user) return;

    // Listen to workers
    const unsubWorkers = listenData(user.uid, 'workers', (data) => {
      setWorkers(data || {});
    });

    // Listen to sites
    const unsubSites = listenData(user.uid, 'sites', (data) => {
      setSites(data || {});
      setLoading(false);
    });

    return () => {
      unsubWorkers();
      unsubSites();
    };
  }, [user]);

  // Load selected date's attendance
  useEffect(() => {
    if (!user || !selectedDate) return;

    const unsubAttendance = listenData(user.uid, `attendance/${selectedDate}`, (data) => {
      setAttendance(data || {});
    });

    return () => unsubAttendance();
  }, [user, selectedDate]);

  const handleMarkAttendance = async (workerId, status) => {
    try {
      await saveAttendance(user.uid, selectedDate, workerId, status);
    } catch (err) {
      console.error("Failed to save attendance:", err);
      alert("Error logging attendance. Please try again.");
    }
  };

  // Calculations for summary stats on the selected date
  const workerList = Object.keys(workers)
    .map(id => ({
      id,
      ...workers[id],
      siteName: sites[workers[id].siteId]?.siteName || 'Unassigned'
    }))
    .filter(worker => {
      const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            worker.phone.includes(searchTerm);
      const matchesSite = siteFilter === 'all' || worker.siteId === siteFilter;
      return matchesSearch && matchesSite;
    });

  const stats = {
    present: 0,
    halfDay: 0,
    absent: 0,
    unmarked: 0
  };

  workerList.forEach(worker => {
    const status = attendance[worker.id];
    if (status === 'Present') stats.present++;
    else if (status === 'Half Day') stats.halfDay++;
    else if (status === 'Absent') stats.absent++;
    else stats.unmarked++;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-amber-500" />
            <span>Daily Attendance Tracker</span>
          </h1>
          <p className="text-xs text-wood-text-muted mt-1">Tap status to mark daily records. Updates immediately with live database sync.</p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2.5 bg-stone-950/20 border border-wood-border/10 py-2 px-4 rounded-xl shrink-0 self-start md:self-auto focus-within:border-amber-500 transition-colors">
          <Calendar className="h-4.5 w-4.5 text-amber-500" />
          <input
            id="attendance-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-stone-200 focus:outline-none text-xs font-semibold cursor-pointer"
          />
        </div>
      </div>

      {/* Stats Summary cards (Borderless, Floating Glass Look) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl bg-transparent border-emerald-500/10 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-all">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Present</span>
          <span className="text-2xl font-black text-white mt-1">{stats.present}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl bg-transparent border-amber-500/10 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Half Day</span>
          <span className="text-2xl font-black text-white mt-1">{stats.halfDay}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl bg-transparent border-red-500/10 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(239,68,68,0.05)] transition-all">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Absent</span>
          <span className="text-2xl font-black text-white mt-1">{stats.absent}</span>
        </div>
        <div className="glass-panel p-4 rounded-2xl bg-transparent border-wood-border/10 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(140,134,128,0.05)] transition-all">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Unmarked</span>
          <span className="text-2xl font-black text-white mt-1">{stats.unmarked}</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 bg-transparent border-wood-border/10">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            id="attendance-search"
            type="text"
            placeholder="Search workers by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-950/20 border border-wood-border/10 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0">
          <Filter className="h-4 w-4 text-amber-500/70" />
          <span className="text-xs text-wood-text-muted">Filter by Site:</span>
          <select
            id="attendance-site-filter"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="px-3 py-2 bg-stone-950/20 border border-wood-border/10 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Sites</option>
            <option value="">Unassigned</option>
            {Object.keys(sites).map(siteId => (
              <option key={siteId} value={siteId}>{sites[siteId].siteName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Workers Attendance List (Highly Transparent cards) */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-wood-amber"></div>
        </div>
      ) : workerList.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center max-w-md mx-auto bg-transparent">
          <User className="h-12 w-12 text-wood-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-200">No Workers Available</h3>
          <p className="text-xs text-wood-text-muted mt-2">Create worker profiles and assign them to sites to take attendance.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {workerList.map((worker) => {
            const currentStatus = attendance[worker.id] || 'Reset';

            return (
              <motion.div 
                key={worker.id}
                variants={itemVariants}
                className={`glass-panel rounded-2xl p-4.5 transition-all duration-300 bg-transparent ${
                  currentStatus === 'Present' ? 'border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.02)]' :
                  currentStatus === 'Half Day' ? 'border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.02)]' :
                  currentStatus === 'Absent' ? 'border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.02)]' :
                  'border-wood-border/10'
                }`}
              >
                {/* Worker basic details */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-11 w-11 rounded-xl overflow-hidden border border-wood-border/10 bg-transparent">
                    <Image
                      src={worker.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(worker.name)}`}
                      alt={worker.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                      unoptimized={isSimulation}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-100 text-sm truncate">{worker.name}</h3>
                    <p className="text-[10px] text-wood-text-muted truncate mt-0.5">{worker.siteName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-wood-text-muted uppercase font-bold">Daily Wage</p>
                    <p className="text-stone-200 font-bold text-xs flex items-center justify-end">
                      <IndianRupee className="h-3 w-3 stroke-[2.5]" />
                      <span>{Number(worker.dailyWage).toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {/* Attendance status toggler */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-wood-border/10">
                  <button
                    id={`present-${worker.id}`}
                    onClick={() => handleMarkAttendance(worker.id, 'Present')}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl border text-[10px] font-bold gap-1 transition-all ${
                      currentStatus === 'Present'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-transparent border-wood-border/10 text-emerald-500/60 hover:bg-emerald-500/5'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Present</span>
                  </button>

                  <button
                    id={`halfday-${worker.id}`}
                    onClick={() => handleMarkAttendance(worker.id, 'Half Day')}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl border text-[10px] font-bold gap-1 transition-all ${
                      currentStatus === 'Half Day'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-transparent border-wood-border/10 text-amber-500/60 hover:bg-amber-500/5'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Half Day</span>
                  </button>

                  <button
                    id={`absent-${worker.id}`}
                    onClick={() => handleMarkAttendance(worker.id, 'Absent')}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl border text-[10px] font-bold gap-1 transition-all ${
                      currentStatus === 'Absent'
                        ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'bg-transparent border-wood-border/10 text-red-500/60 hover:bg-red-500/5'
                    }`}
                  >
                    <CloseIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Absent</span>
                  </button>

                  <button
                    id={`reset-${worker.id}`}
                    onClick={() => handleMarkAttendance(worker.id, 'Reset')}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl border border-dashed text-[10px] font-bold gap-1 transition-all ${
                      currentStatus === 'Reset'
                        ? 'bg-stone-950/20 border-stone-800 text-stone-400'
                        : 'bg-transparent border-wood-border/10 text-wood-text-muted hover:bg-stone-950/20 hover:text-stone-300'
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
