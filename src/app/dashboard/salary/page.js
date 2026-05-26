"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData } from '@/lib/db';
import { 
  Banknote, 
  Building2, 
  User, 
  Calendar, 
  HelpCircle,
  TrendingUp,
  Receipt,
  IndianRupee 
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// Animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

export default function SalaryPage() {
  const { user, isSimulation } = useAuth();
  const [workers, setWorkers] = useState({});
  const [sites, setSites] = useState({});
  const [attendance, setAttendance] = useState({});
  const [advances, setAdvances] = useState({});
  const [loading, setLoading] = useState(true);

  // Billing Cycle Filter: defaults to the current month
  const [billingMonth, setBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  });

  useEffect(() => {
    if (!user) return;

    const unsubWorkers = listenData(user.uid, 'workers', (data) => {
      setWorkers(data || {});
    });

    const unsubSites = listenData(user.uid, 'sites', (data) => {
      setSites(data || {});
    });

    const unsubAttendance = listenData(user.uid, 'attendance', (data) => {
      setAttendance(data || {});
    });

    const unsubAdvances = listenData(user.uid, 'advances', (data) => {
      setAdvances(data || {});
      setLoading(false);
    });

    return () => {
      unsubWorkers();
      unsubSites();
      unsubAttendance();
      unsubAdvances();
    };
  }, [user]);

  // Helper: check if a date string falls inside the selected billing month (YYYY-MM)
  const isDateInSelectedMonth = (dateStr) => {
    return dateStr.startsWith(billingMonth);
  };

  // Perform dynamic calculations for each worker based on the selected month
  const getPayrollDetails = () => {
    const siteSummaries = {};
    let grandWorkingSalary = 0;
    let grandAdvances = 0;
    let grandPayable = 0;

    // Initialize site summaries
    Object.keys(sites).forEach(sId => {
      siteSummaries[sId] = {
        siteName: sites[sId].siteName,
        location: sites[sId].location,
        clientName: sites[sId].clientName,
        totalWorkers: 0,
        workingSalary: 0,
        advancesDeducted: 0,
        finalPayable: 0,
        workers: []
      };
    });
    // Add "Unassigned" site option
    siteSummaries['unassigned'] = {
      siteName: 'Unassigned Workers',
      location: 'None',
      clientName: 'N/A',
      totalWorkers: 0,
      workingSalary: 0,
      advancesDeducted: 0,
      finalPayable: 0,
      workers: []
    };

    // Calculate wages
    Object.keys(workers).forEach(wId => {
      const worker = workers[wId];
      const dailyWage = Number(worker.dailyWage) || 0;
      const sId = worker.siteId || 'unassigned';

      // Count attendance inside current billing month
      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;

      Object.keys(attendance).forEach(dateStr => {
        if (isDateInSelectedMonth(dateStr)) {
          const status = attendance[dateStr][wId];
          if (status === 'Present') presentCount++;
          else if (status === 'Half Day') halfDayCount++;
          else if (status === 'Absent') absentCount++;
        }
      });

      const totalDaysWorked = presentCount + (halfDayCount * 0.5);
      const workingSalary = totalDaysWorked * dailyWage;

      // Calculate advances:
      let advanceAmount = 0;
      const workerAdvanceObj = advances[wId];
      if (workerAdvanceObj) {
        if (workerAdvanceObj.history) {
          // Filter history items belonging to selected month
          Object.keys(workerAdvanceObj.history).forEach(hId => {
            const entry = workerAdvanceObj.history[hId];
            if (entry.date.startsWith(billingMonth)) {
              advanceAmount += Number(entry.amount) || 0;
            }
          });
        } else {
          // Fallback to flat amount if no history log is created
          advanceAmount = Number(workerAdvanceObj.amount) || 0;
        }
      }

      const finalPayable = Math.max(0, workingSalary - advanceAmount);

      const payrollItem = {
        id: wId,
        name: worker.name,
        photoUrl: worker.photoUrl,
        dailyWage,
        presentCount,
        halfDayCount,
        absentCount,
        daysWorked: totalDaysWorked,
        workingSalary,
        advanceAmount,
        finalPayable
      };

      if (siteSummaries[sId]) {
        siteSummaries[sId].workers.push(payrollItem);
        siteSummaries[sId].totalWorkers++;
        siteSummaries[sId].workingSalary += workingSalary;
        siteSummaries[sId].advancesDeducted += advanceAmount;
        siteSummaries[sId].finalPayable += finalPayable;
      }

      grandWorkingSalary += workingSalary;
      grandAdvances += advanceAmount;
      grandPayable += finalPayable;
    });

    // Remove empty sites from display, except active ones
    const activeSites = Object.keys(siteSummaries)
      .filter(sId => siteSummaries[sId].totalWorkers > 0 || (sId !== 'unassigned' && sites[sId]))
      .map(sId => ({
        id: sId,
        ...siteSummaries[sId]
      }));

    return {
      activeSites,
      grandWorkingSalary,
      grandAdvances,
      grandPayable
    };
  };

  const { activeSites, grandWorkingSalary, grandAdvances, grandPayable } = getPayrollDetails();

  // Formatting Month string (e.g. YYYY-MM -> "May 2026")
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Banknote className="h-6 w-6 text-amber-500" />
            <span>Salary Ledger</span>
          </h1>
          <p className="text-xs text-wood-text-muted mt-1">Review worked days, active advance deductions, and final payouts. Grouped by work site.</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2.5 bg-stone-950/20 border border-wood-border/10 py-2 px-4 rounded-xl shrink-0 self-start sm:self-auto focus-within:border-amber-500 transition-colors">
          <Calendar className="h-4.5 w-4.5 text-amber-500" />
          <input
            id="salary-month-picker"
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="bg-transparent border-none text-stone-200 focus:outline-none text-xs font-semibold cursor-pointer"
          />
        </div>
      </div>

      {/* Grand Totals Board (Minimalist floating style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl bg-transparent border-wood-border/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-wood-text-muted uppercase tracking-wider">Gross Worked Wages</span>
            <h3 className="text-xl font-extrabold text-white mt-1 flex items-center">
              <IndianRupee className="h-4.5 w-4.5 text-amber-500 mr-0.5" />
              <span>{grandWorkingSalary.toLocaleString()}</span>
            </h3>
          </div>
          <div className="p-3 bg-stone-950/20 border border-wood-border/10 rounded-xl text-amber-500">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl bg-transparent border-wood-border/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-wood-text-muted uppercase tracking-wider">Advances Deducted</span>
            <h3 className="text-xl font-extrabold text-red-400 mt-1 flex items-center">
              <IndianRupee className="h-4.5 w-4.5 text-red-500 mr-0.5" />
              <span>{grandAdvances.toLocaleString()}</span>
            </h3>
          </div>
          <div className="p-3 bg-stone-950/20 border border-wood-border/10 rounded-xl text-red-400">
            <TrendingUp className="h-5 w-5 rotate-180" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-emerald-500/10 bg-transparent flex items-center justify-between hover:shadow-[0_0_20px_rgba(16,185,129,0.03)] transition-all">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Net Payable Salary</span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1 flex items-center">
              <IndianRupee className="h-5 w-5 text-emerald-400 mr-0.5" />
              <span>{grandPayable.toLocaleString()}</span>
            </h3>
          </div>
          <div className="p-3 bg-stone-950/20 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Receipt className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Site-wise breakdown lists */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-wood-amber"></div>
        </div>
      ) : activeSites.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center max-w-md mx-auto animate-fade-in bg-transparent border-wood-border/10">
          <Banknote className="h-12 w-12 text-wood-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-200">No Ledger Data</h3>
          <p className="text-xs text-wood-text-muted mt-2">No workers are currently registered or active under the chosen month.</p>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {activeSites.map((site) => (
            <motion.div 
              key={site.id} 
              variants={itemVariants}
              className="glass-panel rounded-3xl p-6 bg-transparent border-wood-border/10 space-y-4 hover:border-wood-amber/20 transition-colors duration-300"
            >
              {/* Site Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-wood-border/10 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-950/20 border border-wood-border/10 rounded-xl text-amber-500 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-stone-100 text-md">{site.siteName}</h2>
                    <p className="text-[10px] text-wood-text-muted mt-0.5">Location: {site.location} • Client: {site.clientName}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[9px] text-wood-text-muted uppercase font-bold tracking-wider">Site Payroll Total</span>
                  <div className="text-amber-500 font-extrabold text-md flex items-center sm:justify-end">
                    <IndianRupee className="h-4 w-4 stroke-[2.5]" />
                    <span>{site.finalPayable.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Workers table */}
              {site.workers.length === 0 ? (
                <div className="text-center py-4 text-wood-text-muted text-xs">
                  No workers assigned to this site for {formatMonth(billingMonth)}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-wood-border/5 text-wood-text-muted font-bold">
                        <th className="pb-3 font-semibold">Worker</th>
                        <th className="pb-3 text-center font-semibold">Attendance</th>
                        <th className="pb-3 text-center font-semibold">Days Worked</th>
                        <th className="pb-3 text-center font-semibold">Working Salary</th>
                        <th className="pb-3 text-center font-semibold">Advances</th>
                        <th className="pb-3 text-right font-semibold">Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-wood-border/5">
                      {site.workers.map((worker) => (
                        <tr key={worker.id} className="hover:bg-stone-950/10 transition-colors">
                          {/* Worker Profile */}
                          <td className="py-3 flex items-center gap-2.5">
                            <div className="relative h-7 w-7 rounded-lg overflow-hidden border border-wood-border/10 bg-transparent shrink-0">
                              <Image
                                src={worker.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(worker.name)}`}
                                alt={worker.name}
                                fill
                                sizes="28px"
                                className="object-cover"
                                unoptimized={isSimulation}
                              />
                            </div>
                            <div>
                              <p className="font-bold text-stone-200">{worker.name}</p>
                              <p className="text-[10px] text-wood-text-muted">₹{worker.dailyWage}/day</p>
                            </div>
                          </td>

                          {/* Attendance breakdown */}
                          <td className="py-3 text-center font-semibold">
                            <div className="flex items-center justify-center gap-1.5 text-[10px]">
                              <span className="text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded-md border border-emerald-500/10" title="Present Days">{worker.presentCount}P</span>
                              <span className="text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded-md border border-amber-500/10" title="Half Days">{worker.halfDayCount}H</span>
                              <span className="text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded-md border border-red-500/10" title="Absent Days">{worker.absentCount}A</span>
                            </div>
                          </td>

                          {/* Days worked */}
                          <td className="py-3 text-center text-stone-300 font-semibold">{worker.daysWorked} days</td>

                          {/* Working Salary */}
                          <td className="py-3 text-center text-stone-200">₹{worker.workingSalary.toLocaleString()}</td>

                          {/* Advances */}
                          <td className="py-3 text-center text-red-400">- ₹{worker.advanceAmount.toLocaleString()}</td>

                          {/* Payable */}
                          <td className="py-3 text-right text-emerald-400 font-bold">₹{worker.finalPayable.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Ledger help banner */}
      <div className="glass-panel p-4.5 rounded-2xl bg-transparent border-wood-border/10 flex items-start gap-3.5 text-xs text-wood-text-muted">
        <HelpCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-stone-300">Accounting Policy & Formulas</h4>
          <p>Wages are calculated as: <code>(Present Days * Wage) + (Half Days * 0.5 * Wage)</code>. Recorded advances for the selected month are subtracted to determine the net payable amount. Cumulative grand totals synchronize automatically with the core dashboard nodes.</p>
        </div>
      </div>
    </div>
  );
}
