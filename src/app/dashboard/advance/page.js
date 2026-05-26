"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData, addAdvance, clearAdvancesForWorker } from '@/lib/db';
import { 
  HandCoins, 
  Plus, 
  RotateCcw, 
  User, 
  Calendar, 
  FileText, 
  History,
  TrendingDown, 
  IndianRupee,
  X
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function AdvancePage() {
  const { user, isSimulation } = useAuth();
  const [workers, setWorkers] = useState({});
  const [sites, setSites] = useState({});
  const [advances, setAdvances] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal open state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form fields
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active viewing state for worker history
  const [viewWorkerId, setViewWorkerId] = useState('');

  useEffect(() => {
    if (!user) return;

    // Listen to workers
    const unsubWorkers = listenData(user.uid, 'workers', (data) => {
      setWorkers(data || {});
    });

    // Listen to sites
    const unsubSites = listenData(user.uid, 'sites', (data) => {
      setSites(data || {});
    });

    // Listen to advances
    const unsubAdvances = listenData(user.uid, 'advances', (data) => {
      setAdvances(data || {});
      setLoading(false);
    });

    return () => {
      unsubWorkers();
      unsubSites();
      unsubAdvances();
    };
  }, [user]);

  const handleSaveAdvance = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedWorkerId) {
      setFormError('Please select a worker.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFormError('Please enter a valid advance amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      await addAdvance(user.uid, selectedWorkerId, Number(amount), notes);
      setAmount('');
      setNotes('');
      // Set the viewing worker history to the one we just added to show update
      setViewWorkerId(selectedWorkerId);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to record advance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearAdvances = async (workerId) => {
    if (confirm('Are you sure you want to clear/reset all advances for this worker?')) {
      try {
        await clearAdvancesForWorker(user.uid, workerId);
        if (viewWorkerId === workerId) {
          setViewWorkerId('');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to clear advances.');
      }
    }
  };

  // Compile list of workers with advances
  const workerList = Object.keys(workers).map(id => {
    const worker = workers[id];
    const advanceInfo = advances[id] || { amount: 0, history: {} };
    return {
      id,
      name: worker.name,
      photoUrl: worker.photoUrl,
      dailyWage: worker.dailyWage,
      siteName: sites[worker.siteId]?.siteName || 'Unassigned',
      advanceAmount: advanceInfo.amount || 0,
      history: advanceInfo.history ? Object.keys(advanceInfo.history).map(hId => ({
        hId,
        ...advanceInfo.history[hId]
      })).sort((a, b) => new Date(b.date) - new Date(a.date)) : [],
      finalSalary: worker.finalSalary || 0
    };
  });

  const selectedWorkerHistory = workerList.find(w => w.id === viewWorkerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-amber-500" />
            <span>Salary Advances</span>
          </h1>
          <p className="text-xs text-wood-text-muted mt-1">Issue and track advance payouts. Records auto-deduct from workers' payroll summary ledger.</p>
        </div>
        
        <button
          id="open-advance-modal-btn"
          onClick={() => {
            setFormError('');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Give Advance</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-wood-amber"></div>
        </div>
      ) : workerList.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center max-w-md mx-auto bg-transparent border-wood-border/10">
          <HandCoins className="h-12 w-12 text-wood-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-200">No Workers Registered</h3>
          <p className="text-xs text-wood-text-muted mt-2 mb-6">Register workers in the directory first to issue advances.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Ledger Table */}
          <div className={`${selectedWorkerHistory ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all duration-300`}>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="glass-panel rounded-3xl p-6 bg-transparent border-wood-border/10"
            >
              <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-500" />
                <span>Advance Ledger</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-wood-border/10 text-wood-text-muted font-bold uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Worker</th>
                      <th className="pb-3 font-semibold">Assigned Site</th>
                      <th className="pb-3 font-semibold text-center">Total Advance</th>
                      <th className="pb-3 font-semibold text-center">Rem. Payable</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wood-border/5">
                    {workerList.map((worker) => (
                      <tr 
                        key={worker.id}
                        className={`hover:bg-stone-950/10 transition-colors ${viewWorkerId === worker.id ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="py-3">
                          <button
                            onClick={() => setViewWorkerId(worker.id)}
                            className="flex items-center gap-2.5 text-left font-bold text-stone-200 hover:text-amber-500 transition-colors"
                          >
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
                            <span>{worker.name}</span>
                          </button>
                        </td>
                        <td className="py-3 text-wood-text-muted">{worker.siteName}</td>
                        <td className="py-3 text-center text-red-400 font-bold">
                          ₹{worker.advanceAmount.toLocaleString()}
                        </td>
                        <td className="py-3 text-center text-emerald-400 font-bold">
                          ₹{worker.finalSalary.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              id={`view-history-${worker.id}`}
                              onClick={() => setViewWorkerId(worker.id)}
                              className="px-2.5 py-1 text-[10px] font-bold border border-wood-border/20 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-stone-950 transition-colors"
                            >
                              Ledger
                            </button>
                            {worker.advanceAmount > 0 && (
                              <button
                                id={`clear-advance-${worker.id}`}
                                onClick={() => handleClearAdvances(worker.id)}
                                className="p-1 rounded-lg border border-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                title="Clear All Advances"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Ledger History */}
          <AnimatePresence>
            {selectedWorkerHistory && (
              <motion.div 
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="lg:col-span-5 space-y-6"
              >
                <div className="glass-panel rounded-3xl p-6 bg-transparent border border-amber-500/20">
                  <div className="flex items-center justify-between pb-3 border-b border-wood-border/10 mb-4">
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                      <History className="h-5 w-5 text-amber-500" />
                      <span>Ledger: {selectedWorkerHistory.name}</span>
                    </h3>
                    <button
                      id="close-history-btn"
                      onClick={() => setViewWorkerId('')}
                      className="p-1 rounded-lg border border-wood-border/15 text-wood-text-muted hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {selectedWorkerHistory.history.length === 0 ? (
                    <div className="text-center py-6 text-wood-text-muted text-xs">
                      No advance payments logged for this worker.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                      {selectedWorkerHistory.history.map((log) => (
                        <div 
                          key={log.hId}
                          className="flex items-start justify-between p-3 rounded-xl bg-stone-950/20 border border-wood-border/10 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-stone-400">
                              <Calendar className="h-3.5 w-3.5 text-amber-500/70" />
                              <span>{new Date(log.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-stone-200 font-semibold pl-0.5">
                              <FileText className="h-3.5 w-3.5 text-stone-500" />
                              <span>{log.notes}</span>
                            </div>
                          </div>
                          <div className="text-red-400 font-bold text-sm bg-red-950/10 border border-red-500/10 py-1 px-2.5 rounded-lg shrink-0">
                            - ₹{log.amount.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Give Advance Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-wood-dark border border-wood-border/40 rounded-3xl p-6 shadow-2xl wood-grain"
            >
              <div className="flex items-center justify-between pb-4 border-b border-wood-border/20 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-amber-500" />
                  <span>Give Advance Salary</span>
                </h3>
                <button 
                  id="close-advance-modal"
                  className="p-1 rounded-lg border border-wood-border/15 text-wood-text-muted hover:text-white"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveAdvance} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="advance-worker-select">
                    Select Worker
                  </label>
                  <select
                    id="advance-worker-select"
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  >
                    <option value="">Choose a worker...</option>
                    {workerList.map(worker => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name} ({worker.siteName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="advance-amount">
                    Advance Amount (₹)
                  </label>
                  <input
                    id="advance-amount"
                    type="number"
                    placeholder="e.g. 3000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="advance-notes">
                    Notes / Description
                  </label>
                  <textarea
                    id="advance-notes"
                    placeholder="e.g. Festival advance, emergency cash..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all resize-none"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    id="cancel-advance-btn"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-wood-border/20 text-stone-300 font-semibold rounded-xl hover:bg-stone-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-advance-btn"
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Record Payout'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
