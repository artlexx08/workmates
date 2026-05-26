"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData, addWorker, updateWorker, deleteWorker } from '@/lib/db';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Phone, 
  Briefcase, 
  Banknote, 
  Camera, 
  Search, 
  Filter, 
  IndianRupee 
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// Animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

export default function WorkersPage() {
  const { user, isSimulation } = useAuth();
  const [workers, setWorkers] = useState({});
  const [sites, setSites] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWorkerId, setCurrentWorkerId] = useState(null); // null for Add, workerId for Edit
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dailyWage, setDailyWage] = useState('');
  const [siteId, setSiteId] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load workers
    const unsubWorkers = listenData(user.uid, 'workers', (data) => {
      setWorkers(data || {});
    });

    // Load sites for assignment and label matching
    const unsubSites = listenData(user.uid, 'sites', (data) => {
      setSites(data || {});
      setLoading(false);
    });

    return () => {
      unsubWorkers();
      unsubSites();
    };
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setCurrentWorkerId(null);
    setName('');
    setPhone('');
    setDailyWage('');
    setSiteId('');
    setPhotoFile(null);
    setPhotoPreview('');
    setExistingPhotoUrl('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (id, worker) => {
    setCurrentWorkerId(id);
    setName(worker.name || '');
    setPhone(worker.phone || '');
    setDailyWage(worker.dailyWage || '');
    setSiteId(worker.siteId || '');
    setPhotoFile(null);
    setPhotoPreview('');
    setExistingPhotoUrl(worker.photoUrl || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name || !phone || !dailyWage) {
      setFormError('Name, phone, and daily wage are required.');
      return;
    }

    setUploading(true);
    let photoUrl = existingPhotoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`;

    try {
      // 1. Upload photo if file selected
      if (photoFile) {
        if (isSimulation) {
          // Simulation: Use base64 preview or a custom seed URL
          photoUrl = photoPreview;
        } else {
          // Firebase Storage Upload
          const fileRef = storageRef(storage, `users/${user.uid}/workers/${Date.now()}_${photoFile.name}`);
          const uploadSnapshot = await uploadBytes(fileRef, photoFile);
          photoUrl = await getDownloadURL(uploadSnapshot.ref);
        }
      }

      // 2. Prepare Worker Object
      const workerData = {
        name,
        phone,
        dailyWage: Number(dailyWage),
        siteId,
        photoUrl
      };

      // 3. Save to database
      if (currentWorkerId) {
        await updateWorker(user.uid, currentWorkerId, workerData);
      } else {
        await addWorker(user.uid, workerData);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Failed to save worker.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this worker? This will delete their attendance records and advances.')) {
      try {
        await deleteWorker(user.uid, id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete worker.');
      }
    }
  };

  // Filter and search logic
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" />
            <span>Workers Directory</span>
          </h1>
          <p className="text-xs text-wood-text-muted mt-1">Register workers, update daily wages, and assign them to specific project sites.</p>
        </div>
        <button
          id="add-worker-btn"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-md transition-all self-start sm:self-auto active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>Add New Worker</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 bg-transparent">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            id="worker-search-input"
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
            id="worker-site-filter"
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

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-wood-amber"></div>
        </div>
      ) : workerList.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center max-w-md mx-auto bg-transparent">
          <Users className="h-12 w-12 text-wood-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-stone-200">No Workers Found</h3>
          <p className="text-xs text-wood-text-muted mt-2 mb-6">No workers match your filter or search query. Create a new worker profile to get started.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-stone-950/20 border border-wood-border/20 text-amber-500 hover:bg-amber-500/10 font-bold rounded-xl transition-all"
          >
            Add Worker
          </button>
        </div>
      ) : (
        /* Workers Grid */
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {workerList.map((worker) => (
            <motion.div 
              key={worker.id}
              variants={itemVariants}
              className="glass-panel rounded-2xl p-5 bg-transparent hover:border-wood-amber/35 hover:shadow-[0_0_15px_rgba(245,158,11,0.05)] transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-wood-border/10 bg-transparent">
                      <Image
                        src={worker.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(worker.name)}`}
                        alt={worker.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized={isSimulation}
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-100 group-hover:text-amber-500 transition-colors">{worker.name}</h3>
                      <span className="inline-flex items-center gap-1.5 text-xs text-wood-text-muted mt-1">
                        <Briefcase className="h-3 w-3 text-amber-500/70" />
                        {worker.siteName}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`edit-worker-${worker.id}`}
                      onClick={() => openEditModal(worker.id, worker)}
                      className="p-1.5 rounded-lg border border-wood-border/10 text-wood-text-muted hover:text-amber-500 hover:bg-stone-950/20 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`delete-worker-${worker.id}`}
                      onClick={() => handleDelete(worker.id)}
                      className="p-1.5 rounded-lg border border-red-500/10 text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Info Blocks */}
                <div className="space-y-2 border-t border-wood-border/10 pt-3.5 mb-4 text-xs">
                  <div className="flex items-center gap-2.5 text-wood-text-muted">
                    <Phone className="h-4 w-4 text-amber-500/70" />
                    <span>Phone: <strong className="text-stone-300 font-semibold">{worker.phone}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 text-wood-text-muted">
                    <Banknote className="h-4 w-4 text-amber-500/70" />
                    <span>Daily Wage: <strong className="text-stone-300 font-semibold">₹{Number(worker.dailyWage).toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Financial calculations (Completely Borderless rows) */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-wood-border/10 text-center">
                <div>
                  <p className="text-[9px] text-wood-text-muted uppercase font-bold">Earned</p>
                  <p className="text-stone-300 font-bold text-xs mt-0.5">₹{worker.totalSalary ? worker.totalSalary.toLocaleString() : '0'}</p>
                </div>
                <div className="border-x border-wood-border/10">
                  <p className="text-[9px] text-wood-text-muted uppercase font-bold">Advances</p>
                  <p className="text-red-400 font-bold text-xs mt-0.5">₹{worker.advanceTaken ? worker.advanceTaken.toLocaleString() : '0'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-wood-text-muted uppercase font-bold">Payable</p>
                  <p className="text-emerald-400 font-extrabold text-xs mt-0.5">₹{worker.finalSalary ? worker.finalSalary.toLocaleString() : '0'}</p>
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-wood-dark border border-wood-border/40 rounded-3xl p-6 shadow-2xl wood-grain"
            >
              <div className="flex items-center justify-between pb-4 border-b border-wood-border/20 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  {currentWorkerId ? 'Edit Worker Details' : 'Register Worker'}
                </h3>
                <button
                  id="close-worker-modal"
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
                {/* Photo Upload area */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-wood-border/30 bg-transparent flex items-center justify-center group/photo">
                    {photoPreview || existingPhotoUrl ? (
                      <Image
                        src={photoPreview || existingPhotoUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized={isSimulation}
                      />
                    ) : (
                      <Users className="h-8 w-8 text-stone-600" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-stone-200">
                      <Camera className="h-5 w-5 text-amber-500" />
                      <span className="text-[10px] mt-1 font-semibold">Upload</span>
                      <input
                        id="worker-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[10px] text-wood-text-muted">Click thumbnail to upload photo (Optional)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="worker-name">
                    Worker Name
                  </label>
                  <input
                    id="worker-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="worker-phone">
                    Phone Number
                  </label>
                  <input
                    id="worker-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="worker-wage">
                      Daily Wage (₹)
                    </label>
                    <input
                      id="worker-wage"
                      type="number"
                      value={dailyWage}
                      onChange={(e) => setDailyWage(e.target.value)}
                      placeholder="e.g. 1200"
                      className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-wood-text-muted uppercase tracking-wider mb-1.5" htmlFor="worker-site-assign">
                      Assign Site
                    </label>
                    <select
                      id="worker-site-assign"
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-900 border border-wood-border/20 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-all"
                    >
                      <option value="">Unassigned</option>
                      {Object.keys(sites).map(id => (
                        <option key={id} value={id}>{sites[id].siteName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    id="cancel-worker-btn"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-wood-border/20 text-stone-300 font-semibold rounded-xl hover:bg-stone-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-worker-btn"
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {uploading ? 'Saving...' : 'Save Worker'}
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
