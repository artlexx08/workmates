"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData } from '@/lib/db';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  CalendarCheck, 
  HandCoins, 
  Banknote, 
  TrendingUp, 
  BarChart3, 
  IndianRupee,
  ChevronRight,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

// Container animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

export default function DashboardOverview() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalSites: 0,
    totalWorkers: 0,
    todayAttendance: 0,
    grandTotalSalary: 0,
    totalAdvances: 0
  });
  const [sites, setSites] = useState({});
  const [workers, setWorkers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to dashboard aggregates node
    const unsubDashboard = listenData(user.uid, 'dashboard', (data) => {
      if (data) {
        setDashboardData(data);
      }
    });

    // Listen to sites to show distribution lists
    const unsubSites = listenData(user.uid, 'sites', (data) => {
      setSites(data || {});
    });

    // Listen to workers list
    const unsubWorkers = listenData(user.uid, 'workers', (data) => {
      setWorkers(data || {});
      setLoading(false);
    });

    return () => {
      unsubDashboard();
      unsubSites();
      unsubWorkers();
    };
  }, [user]);

  // Compute attendance percentage
  const totalWorkersCount = dashboardData.totalWorkers || 0;
  const attendanceRate = totalWorkersCount > 0 
    ? Math.round((dashboardData.todayAttendance / totalWorkersCount) * 100) 
    : 0;

  // Compile site list sorted by salary size
  const siteList = Object.keys(sites).map(id => ({
    id,
    ...sites[id]
  })).sort((a, b) => (b.totalSalary || 0) - (a.totalSalary || 0));

  const stats = [
    { 
      name: 'Total Workers', 
      value: dashboardData.totalWorkers, 
      icon: Users, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/5',
      border: 'hover:border-amber-500/30',
      shadow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.04)]',
      link: '/dashboard/workers'
    },
    { 
      name: 'Present Today', 
      value: `${dashboardData.todayAttendance} Workers`, 
      icon: CalendarCheck, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/5',
      border: 'hover:border-emerald-500/30',
      shadow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.04)]',
      link: '/dashboard/attendance'
    },
    { 
      name: 'Total Salary (Gross)', 
      value: `₹${((dashboardData.grandTotalSalary || 0) + (dashboardData.totalAdvances || 0)).toLocaleString()}`, 
      icon: Banknote, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/5',
      border: 'hover:border-blue-500/30',
      shadow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.04)]',
      link: '/dashboard/salary'
    },
    { 
      name: 'Total Advances', 
      value: `₹${(dashboardData.totalAdvances || 0).toLocaleString()}`, 
      icon: HandCoins, 
      color: 'text-red-400', 
      bg: 'bg-red-500/5',
      border: 'hover:border-red-500/30',
      shadow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.04)]',
      link: '/dashboard/advance'
    },
    { 
      name: 'Site Count', 
      value: dashboardData.totalSites, 
      icon: Building2, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/5',
      border: 'hover:border-cyan-500/30',
      shadow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.04)]',
      link: '/dashboard/sites'
    },
    { 
      name: 'Pending Payments (Net)', 
      value: `₹${(dashboardData.grandTotalSalary || 0).toLocaleString()}`, 
      icon: Receipt, 
      color: 'text-orange-400', 
      bg: 'bg-orange-500/5',
      border: 'hover:border-orange-500/30',
      shadow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.04)]',
      link: '/dashboard/salary'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Welcome back, <span className="text-amber-500">{user?.companyName || 'Manager'}</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Here is a real-time summary of your carpentry workshops, workers, and payroll metrics today.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-wood-amber"></div>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div 
                  key={stat.name}
                  variants={itemVariants}
                  whileHover={{ y: -1 }}
                  className={`glass-panel p-5 rounded-2xl bg-zinc-900/10 flex flex-col justify-between border border-white/[0.02] ${stat.border} ${stat.shadow} transition-all duration-300 group`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{stat.name}</span>
                      <h3 className="text-lg font-bold text-zinc-100 mt-1">{stat.value}</h3>
                    </div>
                    <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} border border-white/[0.03]`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <Link href={stat.link} className="flex items-center gap-1 text-[9px] font-bold text-amber-500 hover:text-amber-400 mt-5 pt-3 border-t border-white/[0.04] transition-colors uppercase tracking-widest w-full">
                    <span>Manage</span>
                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Large summary metrics */}
          <motion.div 
            variants={itemVariants}
            className="glass-panel p-6 rounded-2xl border border-white/[0.02] bg-transparent relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 text-amber-500/[0.02] pointer-events-none">
              <Banknote className="h-64 w-64" />
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold bg-amber-500/5 text-amber-500 border border-amber-500/10 self-start w-fit uppercase tracking-widest">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Grand Total Net Payroll</span>
                </span>
                <h2 className="text-3xl font-extrabold text-emerald-400 flex items-center tracking-tight">
                  <IndianRupee className="h-6 w-6 text-emerald-400 stroke-[2.5] mr-0.5" />
                  <span>{(dashboardData.grandTotalSalary || 0).toLocaleString()}</span>
                </h2>
                <p className="text-xs text-zinc-500">Combined net payable payroll across all active workshop sites, including advance deductions.</p>
              </div>

              <div className="flex gap-4 shrink-0">
                <Link href="/dashboard/salary" className="px-4.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] text-xs">
                  Salary Ledger
                </Link>
                <Link href="/dashboard/reports" className="px-4.5 py-2.5 bg-zinc-900/60 border border-white/5 text-zinc-200 hover:bg-zinc-900 font-semibold rounded-xl transition-all text-xs">
                  Generate Reports
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Two Columns: Attendance Stats and Site Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Today Attendance Gauge Widget */}
            <motion.div variants={itemVariants} className="lg:col-span-5 glass-panel rounded-2xl p-6 bg-transparent border border-white/[0.02] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-amber-500" />
                  <span>Attendance Analytics</span>
                </h3>
                <p className="text-[10px] text-zinc-500">Today's active workforce attendance percentage.</p>
              </div>

              {/* Progress Gauge */}
              <div className="flex flex-col items-center py-6">
                <div className="relative flex items-center justify-center">
                  {/* SVG Circle Gauge */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      className="stroke-zinc-900 fill-none stroke-[6]"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="52"
                      className="stroke-amber-500 fill-none stroke-[6] transition-all duration-1000 ease-out"
                      strokeDasharray={326.7}
                      strokeDashoffset={326.7 - (326.7 * attendanceRate) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-white">{attendanceRate}%</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-bold mt-0.5">Active Rate</span>
                  </div>
                </div>

                <div className="text-center mt-5 space-y-1">
                  <p className="text-xs font-semibold text-zinc-200">
                    {dashboardData.todayAttendance} of {totalWorkersCount} workers present today
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Mark attendance for remaining staff to compute daily wages.
                  </p>
                </div>
              </div>

              <Link href="/dashboard/attendance" className="w-full text-center py-2.5 bg-zinc-900/40 border border-white/[0.04] hover:bg-zinc-900 rounded-xl text-xs text-amber-500 font-bold transition-all">
                Mark Today's Attendance
              </Link>
            </motion.div>

            {/* Site Distribution progress bars */}
            <motion.div variants={itemVariants} className="lg:col-span-7 glass-panel rounded-2xl p-6 bg-transparent border border-white/[0.02] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  <span>Site Payroll Distribution</span>
                </h3>
                <p className="text-[10px] text-zinc-500">Payroll allocation size per contract site.</p>
              </div>

              {/* Progress bars list */}
              <div className="my-6 space-y-4 max-h-[180px] overflow-y-auto pr-1">
                {siteList.length === 0 ? (
                  <div className="text-center text-xs text-zinc-500 py-8">
                    No active sites registered.
                  </div>
                ) : (
                  siteList.map(site => {
                    const percentage = dashboardData.grandTotalSalary > 0 
                      ? Math.round((site.totalSalary / dashboardData.grandTotalSalary) * 100) 
                      : 0;

                    return (
                      <div key={site.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-zinc-300">{site.siteName}</span>
                          <span className="text-amber-500 font-bold">
                            ₹{(site.totalSalary || 0).toLocaleString()} ({percentage}%)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/[0.03]">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Link href="/dashboard/sites" className="w-full text-center py-2.5 bg-zinc-900/40 border border-white/[0.04] hover:bg-zinc-900 rounded-xl text-xs text-amber-500 font-bold transition-all">
                View Site Details
              </Link>
            </motion.div>

          </div>
        </motion.div>
      )}
    </div>
  );
}
