"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData, addSite, updateSite, deleteSite } from '@/lib/db';
import { 
  Building2, 
  MapPin, 
  User, 
  Activity, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  IndianRupee,
  BarChart3,
  Users
} from 'lucide-react';
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
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

export default function SitesPage() {
  const { user } = useAuth();
  const [sites, setSites] = useState({});
  const [workers, setWorkers] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSiteId, setCurrentSiteId] = useState(null); // null for Add, siteId for Edit
  
  // Form fields
  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState('Active');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!user) return;

    // Listen to sites
    const unsubSites = listenData(user.uid, 'sites', (data) => {
      setSites(data || {});
      setLoading(false);
    });

    // Listen to workers to calculate distributions
    const unsubWorkers = listenData(user.uid, 'workers', (data) => {
      setWorkers(data || {});
    });

    return () => {
      unsubSites();
      unsubWorkers();
    };
  }, [user]);

  const openAddModal = () => {
    setCurrentSiteId(null);
    setSiteName('');
    setLocation('');
    setClientName('');
    setStatus('Active');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (id, site) => {
    setCurrentSiteId(id);
    setSiteName(site.siteName || '');
    setLocation(site.location || '');
    setClientName(site.clientName || '');
    setStatus(site.status || 'Active');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!siteName || !location || !clientName) {
      setFormError('All fields are required.');
      return;
    }

    const siteData = { siteName, location, clientName, status };

    try {
      if (currentSiteId) {
        await updateSite(user.uid, currentSiteId, siteData);
      } else {
        await addSite(user.uid, siteData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to save site data.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this site? All assigned workers will be unassigned.')) {
      try {
        await deleteSite(user.uid, id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete site.');
      }
    }
  };

  const siteList = Object.keys(sites).map(id => {
    const workerCount = Object.values(workers).filter(w => w.siteId === id).length;
    return {
      id,
      workerCount,
      ...sites[id]
    };
  });

  const grandTotalSalary = siteList.reduce((acc, curr) => acc + (curr.totalSalary || 0), 0);
  const totalWorkersCount = Object.keys(workers).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-amber-500" />
            <span>Project Sites</span>
          </h1>
          <p className="text-xs text-wood-text-muted mt-1">Create and manage your active carpentry workshop contracts and project sites.</p>
        </div>
        <button
          id="add-site-btn"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-md transition-all self-start sm:self-auto active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>New Work Site</span>
        </button>
      </div>

      {/* Analytics Charts */}
      {!loading && siteList.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Site Salary Shares */}
          <div className="glass-panel rounded-3xl p-6 bg-transparent border-wood-border/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                <span>Financial Share Analytics</span>
              </h3>
              <p className="text-[10px] text-wood-text-muted">Percentage allocation of total wages across active sites.</p>
            </div>
            
            <div className="my-5 space-y-3">
              {siteList.slice(0, 4).map(site => {
                const percent = grandTotalSalary > 0 
                  ? Math.round((site.totalSalary || 0) / grandTotalSalary * 100) 
                  : 0;
                return (
                  <div key={site.id} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-stone-300">
                      <span>{site.siteName}</span>
                      <span className="text-amber-500">₹{(site.totalSalary || 0).toLocaleString()} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-stone-950/20 h-2 rounded-full overflow-hidden border border-wood-border/10">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Worker distribution per site */}
          <div className="glass-panel rounded-3xl p-6 bg-transparent border-wood-border/10 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white mb-1.5 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                <span>Worker Distribution</span>
              </h3>
              <p className="text-[10px] text-wood-text-muted">Active carpentry staff assigned to each site contract.</p>
            </div>

            <div className="my-5 space-y-3">
              {siteList.slice(0, 4).map(site => {
                const percent = totalWorkersCount > 0 
                  ? Math.round(site.workerCount / totalWorkersCount * 100) 
                  : 0;
                return (
                  <div key={site.id} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-stone-300">
                      <span>{site.siteName}</span>
                      <span className="text-amber-500">{site.workerCount} workers ({percent}%)</span>
                    </div>
                    <div className="w-full bg-stone-950/20 h-2 rounded-full overflow-hidden border border-wood-border/10">
                      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-wood-amber"></div>
        </div>
      ) : siteList.length === 0 ? (
        /* Empty state */
        <div className="glass-panel rounded-2xl p-10 text-center max-w-md mx-auto bg-transparent border-wood-border/10">
          <Building2 className="h-12 w-12 text-wood-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-200">No Sites Found</h3>
          <p className="text-xs text-wood-text-muted mt-2 mb-6">You haven't registered any work sites yet. Create your first site to assign workers and log attendance.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-stone-950/20 border border-wood-border text-amber-500 hover:bg-amber-500/10 font-bold rounded-xl transition-all"
          >
            Create Work Site
          </button>
        </div>
      ) : (
        /* Site list grid */
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {siteList.map((site) => (
            <motion.div 
              key={site.id} 
              variants={itemVariants}
              className="glass-panel rounded-2xl p-5 bg-transparent border-wood-border/10 flex flex-col justify-between hover:border-wood-amber/35 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all duration-300 group"
            >
              <div>
                {/* Site Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-stone-950/20 border border-wood-border/10 rounded-xl text-amber-500">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-100 group-hover:text-amber-500 transition-colors">{site.siteName}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 ${
                        site.status === 'Active' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' 
                          : 'bg-stone-950 text-wood-text-muted border border-wood-border/10'
                      }`}>
                        <Activity className="h-3 w-3" />
                        {site.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`edit-site-${site.id}`}
                      onClick={() => openEditModal(site.id, site)}
                      className="p-1.5 rounded-lg border border-wood-border/10 text-wood-text-muted hover:text-amber-500 hover:bg-stone-950/20 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`delete-site-${site.id}`}
                      onClick={() => handleDelete(site.id)}
                      className="p-1.5 rounded-lg border border-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2 border-t border-wood-border/10 pt-3.5 mb-4 text-xs">
                  <div className="flex items-center gap-2.5 text-wood-text-muted">
                    <MapPin className="h-4 w-4 text-amber-500/70" />
                    <span>Location: <strong className="text-stone-300 font-semibold">{site.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 text-wood-text-muted">
                    <User className="h-4 w-4 text-amber-500/70" />
                    <span>Client: <strong className="text-stone-300 font-semibold">{site.clientName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 text-wood-text-muted">
                    <Users className="h-4 w-4 text-amber-500/70" />
                    <span>Staff count: <strong className="text-stone-300 font-semibold">{site.workerCount} workers</strong></span>
                  </div>
                </div>
              </div>

              {/* Total Salary summary footer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/20 border border-wood-border/10">
                <span className="text-[10px] text-wood-text-muted uppercase font-bold tracking-wider">Payroll Share</span>
                <div className="flex items-center text-amber-500 font-extrabold text-sm">
                  <IndianRupee className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{site.totalSalary ? site.totalSalary.toLocaleString() : '0'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add/Edit Modal */}
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
            
            {/* Modal Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-wood-dark border border-wood-border/40 rounded-3xl p-6 shadow-2xl wood-grain"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-wood-border/20 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  {currentSiteId ? 'Edit Work Site' : 'Create Work Site'}
                </h3>
                <button 
                  id="close-site-modal"
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

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="site-name">
                    Site Name
                  </label>
                  <input
                    id="site-name"
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Apartment Project"
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="site-location">
                    Location
                  </label>
                  <input
                    id="site-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Chennai"
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="site-client">
                    Client Name
                  </label>
                  <input
                    id="site-client"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="site-status">
                    Status
                  </label>
                  <select
                    id="site-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    id="cancel-site-btn"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-wood-border/20 text-stone-300 font-semibold rounded-xl hover:bg-stone-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-site-btn"
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                  >
                    Save Site
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
