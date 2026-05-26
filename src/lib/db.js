"use client";
import { ref, set, push, remove, get, update, onValue, off } from 'firebase/database';
import { database } from './firebase';
const isSimulationMode = false; // Toggle this to switch between Firebase and Local Storage modes

// PUB-SUB EVENT SYSTEM FOR LOCAL STORAGE SIMULATION
const listeners = {};
const subscribeLocal = (path, callback) => {
  if (!listeners[path]) {
    listeners[path] = [];
  }
  listeners[path].push(callback);

  // Call immediately with current data
  const data = getLocalPath(path);
  callback(data);

  return () => {
    listeners[path] = listeners[path].filter(cb => cb !== callback);
  };
};

const notifyLocal = (path) => {
  // Notify listeners matching this path or sub-paths
  Object.keys(listeners).forEach(listenPath => {
    if (listenPath === path || path.startsWith(listenPath + '/') || listenPath.startsWith(path + '/')) {
      const data = getLocalPath(listenPath);
      listeners[listenPath].forEach(cb => cb(data));
    }
  });
};

const getLocalDB = () => {
  if (typeof window === 'undefined') return {};
  const dbStr = localStorage.getItem('workmate_sim_db');
  return dbStr ? JSON.parse(dbStr) : {};
};

const saveLocalDB = (db) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('workmate_sim_db', JSON.stringify(db));
};

const getLocalPath = (path) => {
  const db = getLocalDB();
  const parts = path.split('/').filter(Boolean);
  let current = db;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
};

const setLocalPath = (path, val) => {
  const db = getLocalDB();
  const parts = path.split('/').filter(Boolean);
  let current = db;

  if (parts.length === 0) {
    saveLocalDB(val);
    return;
  }

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  if (val === null) {
    delete current[lastPart];
  } else {
    current[lastPart] = val;
  }

  saveLocalDB(db);
  notifyLocal(path);
};

// AUTOMATIC SALARY & DASHBOARD SYNCHRONIZATION FUNCTION
// Recalculates working hours, wage metrics, advances, and aggregates across sites
export const syncSalaryAndDashboard = async (userId) => {
  const userPath = isSimulationMode ? `users/${userId}` : `users/${userId}`;

  // 1. Fetch raw data
  let workers = {};
  let sites = {};
  let attendance = {};
  let advances = {};

  if (isSimulationMode) {
    workers = getLocalPath(`${userPath}/workers`) || {};
    sites = getLocalPath(`${userPath}/sites`) || {};
    attendance = getLocalPath(`${userPath}/attendance`) || {};
    advances = getLocalPath(`${userPath}/advances`) || {};
  } else {
    const wSnap = await get(ref(database, `${userPath}/workers`));
    const sSnap = await get(ref(database, `${userPath}/sites`));
    const aSnap = await get(ref(database, `${userPath}/attendance`));
    const adSnap = await get(ref(database, `${userPath}/advances`));

    workers = wSnap.exists() ? wSnap.val() : {};
    sites = sSnap.exists() ? sSnap.val() : {};
    attendance = aSnap.exists() ? aSnap.val() : {};
    advances = adSnap.exists() ? adSnap.val() : {};
  }

  // 2. Perform calculations for each worker
  const updatedWorkers = { ...workers };
  const updatedSites = { ...sites };
  const salarySummary = {};
  let grandTotalSalary = 0;
  let totalAdvances = 0;

  // Initialize site sums
  Object.keys(updatedSites).forEach(siteId => {
    updatedSites[siteId].totalSalary = 0;
    salarySummary[siteId] = { siteSalary: 0 };
  });

  // Calculate worker wages
  Object.keys(updatedWorkers).forEach(workerId => {
    const worker = updatedWorkers[workerId];
    const dailyWage = Number(worker.dailyWage) || 0;
    const workerSiteId = worker.siteId;

    // Calculate attendance days
    let workingDays = 0;
    Object.keys(attendance).forEach(dateStr => {
      const workerStatus = attendance[dateStr][workerId];
      if (workerStatus === 'Present') {
        workingDays += 1.0;
      } else if (workerStatus === 'Half Day') {
        workingDays += 0.5;
      }
    });

    // Advance total
    const workerAdvance = advances[workerId];
    const advanceTaken = workerAdvance ? (Number(workerAdvance.amount) || 0) : 0;
    totalAdvances += advanceTaken;

    // Wages
    const totalSalary = workingDays * dailyWage; // total worked salary
    const finalSalary = Math.max(0, totalSalary - advanceTaken); // final payable after deduction

    // Update worker object
    worker.totalSalary = totalSalary;
    worker.advanceTaken = advanceTaken;
    worker.finalSalary = finalSalary;

    // Accumulate to site
    if (workerSiteId && updatedSites[workerSiteId]) {
      updatedSites[workerSiteId].totalSalary += finalSalary;
      if (!salarySummary[workerSiteId]) {
        salarySummary[workerSiteId] = { siteSalary: 0 };
      }
      salarySummary[workerSiteId].siteSalary += finalSalary;
    }

    grandTotalSalary += finalSalary;
  });

  // Today's attendance calculation
  const todayStr = new Date().toISOString().split('T')[0];
  let todayAttendanceCount = 0;
  if (attendance[todayStr]) {
    Object.keys(attendance[todayStr]).forEach(workerId => {
      const status = attendance[todayStr][workerId];
      if (status === 'Present' || status === 'Half Day') {
        todayAttendanceCount++;
      }
    });
  }

  // Dashboard Node
  const dashboard = {
    totalSites: Object.keys(sites).length,
    totalWorkers: Object.keys(workers).length,
    todayAttendance: todayAttendanceCount,
    grandTotalSalary,
    totalAdvances
  };

  // Write changes back to database
  if (isSimulationMode) {
    setLocalPath(`${userPath}/workers`, updatedWorkers);
    setLocalPath(`${userPath}/sites`, updatedSites);
    setLocalPath(`${userPath}/salarySummary`, { ...salarySummary, grandTotalSalary });
    setLocalPath(`${userPath}/dashboard`, dashboard);
  } else {
    const updates = {};
    updates[`${userPath}/workers`] = updatedWorkers;
    updates[`${userPath}/sites`] = updatedSites;
    updates[`${userPath}/salarySummary`] = { ...salarySummary, grandTotalSalary };
    updates[`${userPath}/dashboard`] = dashboard;
    await update(ref(database), updates);
  }
};

// REALTIME LISTENER UTILITIES
export const listenData = (userId, subPath, callback) => {
  const path = `users/${userId}/${subPath}`;
  if (isSimulationMode) {
    return subscribeLocal(path, (data) => {
      callback(data || null);
    });
  } else {
    const dbRef = ref(database, path);
    const listener = onValue(dbRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    });
    return () => off(dbRef, 'value', listener);
  }
};

// DATABASE OPERATIONS (CRUD)

// 1. Sites
export const addSite = async (userId, siteData) => {
  const userPath = `users/${userId}/sites`;
  if (isSimulationMode) {
    const siteId = 'site_' + Date.now();
    const newSite = { ...siteData, totalSalary: 0 };
    setLocalPath(`${userPath}/${siteId}`, newSite);
    await syncSalaryAndDashboard(userId);
    return siteId;
  } else {
    const newSiteRef = push(ref(database, userPath));
    const newSite = { ...siteData, totalSalary: 0 };
    await set(newSiteRef, newSite);
    await syncSalaryAndDashboard(userId);
    return newSiteRef.key;
  }
};

export const updateSite = async (userId, siteId, siteData) => {
  const path = `users/${userId}/sites/${siteId}`;
  if (isSimulationMode) {
    const current = getLocalPath(path) || {};
    setLocalPath(path, { ...current, ...siteData });
    await syncSalaryAndDashboard(userId);
  } else {
    await update(ref(database, path), siteData);
    await syncSalaryAndDashboard(userId);
  }
};

export const deleteSite = async (userId, siteId) => {
  const path = `users/${userId}/sites/${siteId}`;

  // Unassign workers who were on this site
  const workersPath = `users/${userId}/workers`;
  let workers = {};
  if (isSimulationMode) {
    workers = getLocalPath(workersPath) || {};
    Object.keys(workers).forEach(wId => {
      if (workers[wId].siteId === siteId) {
        workers[wId].siteId = "";
      }
    });
    setLocalPath(workersPath, workers);
    setLocalPath(path, null);
    await syncSalaryAndDashboard(userId);
  } else {
    const wSnap = await get(ref(database, workersPath));
    if (wSnap.exists()) {
      const workersVal = wSnap.val();
      const updates = {};
      Object.keys(workersVal).forEach(wId => {
        if (workersVal[wId].siteId === siteId) {
          updates[`${workersPath}/${wId}/siteId`] = "";
        }
      });
      updates[path] = null;
      await update(ref(database), updates);
    } else {
      await remove(ref(database, path));
    }
    await syncSalaryAndDashboard(userId);
  }
};

// 2. Workers
export const addWorker = async (userId, workerData) => {
  const userPath = `users/${userId}/workers`;
  const initialWorker = {
    ...workerData,
    totalSalary: 0,
    advanceTaken: 0,
    finalSalary: 0
  };

  if (isSimulationMode) {
    const workerId = 'worker_' + Date.now();
    setLocalPath(`${userPath}/${workerId}`, initialWorker);
    await syncSalaryAndDashboard(userId);
    return workerId;
  } else {
    const newWorkerRef = push(ref(database, userPath));
    await set(newWorkerRef, initialWorker);
    await syncSalaryAndDashboard(userId);
    return newWorkerRef.key;
  }
};

export const updateWorker = async (userId, workerId, workerData) => {
  const path = `users/${userId}/workers/${workerId}`;
  if (isSimulationMode) {
    const current = getLocalPath(path) || {};
    setLocalPath(path, { ...current, ...workerData });
    await syncSalaryAndDashboard(userId);
  } else {
    await update(ref(database, path), workerData);
    await syncSalaryAndDashboard(userId);
  }
};

export const deleteWorker = async (userId, workerId) => {
  const workerPath = `users/${userId}/workers/${workerId}`;
  const advancePath = `users/${userId}/advances/${workerId}`;

  if (isSimulationMode) {
    // Delete worker
    setLocalPath(workerPath, null);
    // Delete worker's advances
    setLocalPath(advancePath, null);
    // Delete worker's attendance
    const attendancePath = `users/${userId}/attendance`;
    const attendance = getLocalPath(attendancePath) || {};
    Object.keys(attendance).forEach(date => {
      if (attendance[date][workerId]) {
        delete attendance[date][workerId];
      }
    });
    setLocalPath(attendancePath, attendance);

    await syncSalaryAndDashboard(userId);
  } else {
    const updates = {};
    updates[workerPath] = null;
    updates[advancePath] = null;

    // Clear attendance references
    const attRef = ref(database, `users/${userId}/attendance`);
    const attSnap = await get(attRef);
    if (attSnap.exists()) {
      const attVal = attSnap.val();
      Object.keys(attVal).forEach(date => {
        if (attVal[date][workerId]) {
          updates[`users/${userId}/attendance/${date}/${workerId}`] = null;
        }
      });
    }

    await update(ref(database), updates);
    await syncSalaryAndDashboard(userId);
  }
};

// 3. Attendance
export const saveAttendance = async (userId, dateStr, workerId, status) => {
  const path = `users/${userId}/attendance/${dateStr}/${workerId}`;
  if (isSimulationMode) {
    if (status === 'Reset' || !status) {
      setLocalPath(path, null);

      // Clean up date node if empty
      const datePath = `users/${userId}/attendance/${dateStr}`;
      const dateAtt = getLocalPath(datePath);
      if (dateAtt && Object.keys(dateAtt).length === 0) {
        setLocalPath(datePath, null);
      }
    } else {
      setLocalPath(path, status);
    }
    await syncSalaryAndDashboard(userId);
  } else {
    if (status === 'Reset' || !status) {
      await remove(ref(database, path));
    } else {
      await set(ref(database, path), status);
    }
    await syncSalaryAndDashboard(userId);
  }
};

// 4. Advances
export const addAdvance = async (userId, workerId, amount, notes = '') => {
  const advSummaryPath = `users/${userId}/advances/${workerId}`;
  const dateStr = new Date().toISOString();

  if (isSimulationMode) {
    const current = getLocalPath(advSummaryPath) || { amount: 0, history: {} };
    const advId = 'adv_' + Date.now();
    const newAmount = (Number(current.amount) || 0) + Number(amount);

    const newHistory = { ...current.history };
    newHistory[advId] = {
      id: advId,
      amount: Number(amount),
      date: dateStr,
      notes: notes || 'Advance Taken'
    };

    setLocalPath(advSummaryPath, {
      amount: newAmount,
      history: newHistory
    });
    await syncSalaryAndDashboard(userId);
  } else {
    // Read current first
    const snapshot = await get(ref(database, advSummaryPath));
    const current = snapshot.exists() ? snapshot.val() : { amount: 0, history: {} };
    const newAmount = (Number(current.amount) || 0) + Number(amount);

    // Create sub-history entry
    const newAdvRef = push(ref(database, `${advSummaryPath}/history`));
    const advId = newAdvRef.key;

    const updates = {};
    updates[`${advSummaryPath}/amount`] = newAmount;
    updates[`${advSummaryPath}/history/${advId}`] = {
      id: advId,
      amount: Number(amount),
      date: dateStr,
      notes: notes || 'Advance Taken'
    };

    await update(ref(database), updates);
    await syncSalaryAndDashboard(userId);
  }
};

export const clearAdvancesForWorker = async (userId, workerId) => {
  const path = `users/${userId}/advances/${workerId}`;
  if (isSimulationMode) {
    setLocalPath(path, null);
    await syncSalaryAndDashboard(userId);
  } else {
    await remove(ref(database, path));
    await syncSalaryAndDashboard(userId);
  }
};
