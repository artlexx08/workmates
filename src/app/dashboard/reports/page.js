"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenData } from '@/lib/db';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  Award,
  IndianRupee,
  Building2
} from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState({});
  const [sites, setSites] = useState({});
  const [attendance, setAttendance] = useState({});
  const [advances, setAdvances] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Report Month filter
  const [billingMonth, setBillingMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

  // Helper: check if a date falls inside the selected month
  const isDateInMonth = (dateStr) => dateStr.startsWith(billingMonth);

  // Compile calculations for each site and workers
  const compileReportData = () => {
    const reportData = {
      sites: {},
      grandGross: 0,
      grandAdvances: 0,
      grandNet: 0,
      totalSites: 0,
      totalWorkers: 0
    };

    // Initialize sites structure
    Object.keys(sites).forEach(sId => {
      reportData.sites[sId] = {
        name: sites[sId].siteName,
        location: sites[sId].location,
        client: sites[sId].clientName,
        status: sites[sId].status,
        workers: [],
        siteGross: 0,
        siteAdvances: 0,
        siteNet: 0
      };
    });

    reportData.sites['unassigned'] = {
      name: 'Unassigned Workers',
      location: 'None',
      client: 'N/A',
      status: 'Active',
      workers: [],
      siteGross: 0,
      siteAdvances: 0,
      siteNet: 0
    };

    // Process workers
    Object.keys(workers).forEach(wId => {
      const worker = workers[wId];
      const dailyWage = Number(worker.dailyWage) || 0;
      const sId = worker.siteId || 'unassigned';

      // Count attendance in selected month
      let present = 0;
      let halfDay = 0;
      let absent = 0;

      Object.keys(attendance).forEach(dateStr => {
        if (isDateInMonth(dateStr)) {
          const status = attendance[dateStr][wId];
          if (status === 'Present') present++;
          else if (status === 'Half Day') halfDay++;
          else if (status === 'Absent') absent++;
        }
      });

      const daysWorked = present + (halfDay * 0.5);
      const grossSalary = daysWorked * dailyWage;

      // Filter advances
      let advanceDeduction = 0;
      const workerAdvObj = advances[wId];
      if (workerAdvObj) {
        if (workerAdvObj.history) {
          Object.keys(workerAdvObj.history).forEach(hId => {
            const entry = workerAdvObj.history[hId];
            if (entry.date.startsWith(billingMonth)) {
              advanceDeduction += Number(entry.amount) || 0;
            }
          });
        } else {
          advanceDeduction = Number(workerAdvObj.amount) || 0;
        }
      }

      const netSalary = Math.max(0, grossSalary - advanceDeduction);

      const workerReport = {
        name: worker.name,
        phone: worker.phone,
        wage: dailyWage,
        daysWorked,
        grossSalary,
        advanceDeduction,
        netSalary
      };

      if (reportData.sites[sId]) {
        reportData.sites[sId].workers.push(workerReport);
        reportData.sites[sId].siteGross += grossSalary;
        reportData.sites[sId].siteAdvances += advanceDeduction;
        reportData.sites[sId].siteNet += netSalary;
        reportData.totalWorkers++;
      }

      reportData.grandGross += grossSalary;
      reportData.grandAdvances += advanceDeduction;
      reportData.grandNet += netSalary;
    });

    // Remove empty sites and sort
    const activeSites = Object.keys(reportData.sites)
      .filter(sId => reportData.sites[sId].workers.length > 0)
      .map(sId => ({
        id: sId,
        ...reportData.sites[sId]
      }));

    reportData.totalSites = activeSites.filter(s => s.id !== 'unassigned').length;

    return {
      activeSites,
      grandGross: reportData.grandGross,
      grandAdvances: reportData.grandAdvances,
      grandNet: reportData.grandNet,
      totalSites: reportData.totalSites,
      totalWorkers: reportData.totalWorkers
    };
  };

  const { activeSites, grandGross, grandAdvances, grandNet, totalSites, totalWorkers } = compileReportData();

  // Format YYYY-MM -> "May 2026"
  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const companyName = user?.companyName || 'My Workshop';
      const monthTitle = getMonthName(billingMonth);
      const currentDateStr = new Date().toLocaleDateString();

      // Setup document styling
      // Palette: Brown/Gold Carpenter Theme
      // Primary: #3a2e22 (RGB 58, 46, 34)
      // Highlight: #d97706 (RGB 217, 119, 6)

      // A. HEADER SECTION
      doc.setFillColor(35, 28, 21); // Dark background
      doc.rect(0, 0, 210, 42, 'F');
      
      // WorkMate Logo Graphic
      doc.setFillColor(217, 119, 6); // Orange accent
      doc.rect(15, 12, 10, 10, 'F'); // square logo
      doc.setTextColor(35, 28, 21);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("WM", 17, 19);

      // WorkMate Title & Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('Helvetica', 'bold');
      doc.text("WorkMate", 29, 17);
      
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text("Smart Worker Salary & Attendance Ledger", 29, 21);

      doc.setFontSize(12);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(companyName.toUpperCase(), 29, 32);

      // Right Header Info
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text(`PAYROLL REPORT`, 140, 16);
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(`Billing Cycle: ${monthTitle}`, 140, 22);
      doc.text(`Generated On: ${currentDateStr}`, 140, 27);
      doc.text(`Sites: ${totalSites} • Staff: ${totalWorkers}`, 140, 32);

      let currentY = 52;

      // B. SITE-WISE REPORTS
      activeSites.forEach((site) => {
        // Site Header
        doc.setFillColor(248, 245, 240); // Soft grey-cream
        doc.rect(15, currentY, 180, 10, 'F');
        doc.setDrawColor(217, 119, 6);
        doc.setLineWidth(0.5);
        doc.line(15, currentY, 15, currentY + 10); // gold bar marker

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(58, 46, 34); // Dark brown
        doc.text(`SITE: ${site.name.toUpperCase()}  (Client: ${site.client})`, 19, currentY + 6.5);

        currentY += 14;

        // Table headers and rows
        const tableBody = site.workers.map((worker) => [
          worker.name,
          `${worker.daysWorked} days`,
          `Rs. ${worker.wage.toLocaleString()}`,
          `Rs. ${worker.grossSalary.toLocaleString()}`,
          `Rs. ${worker.advanceDeduction.toLocaleString()}`,
          `Rs. ${worker.netSalary.toLocaleString()}`
        ]);

        doc.autoTable({
          startY: currentY,
          head: [['Worker Name', 'Days worked', 'Daily Wage', 'Gross Wage', 'Advances', 'Net Payout']],
          body: tableBody,
          theme: 'striped',
          headStyles: {
            fillColor: [58, 46, 34],
            textColor: [255, 255, 255],
            fontSize: 8.5,
            fontStyle: 'bold',
            halign: 'left'
          },
          bodyStyles: {
            fontSize: 8,
            textColor: [60, 60, 60]
          },
          columnStyles: {
            3: { halign: 'left' },
            4: { halign: 'left', textColor: [200, 50, 50] },
            5: { halign: 'left', fontStyle: 'bold', textColor: [16, 120, 70] }
          },
          margin: { left: 15, right: 15 },
          styles: { cellPadding: 2 }
        });

        currentY = doc.previousAutoTable.finalY + 3;

        // C. SITE TOTAL
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(58, 46, 34);
        doc.text(`Site Gross: Rs. ${site.siteGross.toLocaleString()}  |  Advances: Rs. ${site.siteAdvances.toLocaleString()}`, 15, currentY + 4);
        doc.setTextColor(16, 120, 70); // Green for net
        doc.text(`Site Payout Subtotal: Rs. ${site.siteNet.toLocaleString()}`, 130, currentY + 4);

        // Draw dividing line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(15, currentY + 7, 195, currentY + 7);

        currentY += 12;

        // Page break if running out of space
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
      });

      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      currentY += 5;

      // D. FINAL BUSINESS SUMMARY CARD
      doc.setFillColor(35, 28, 21); // Dark background summary
      doc.rect(15, currentY, 180, 38, 'F');
      
      doc.setTextColor(217, 119, 6);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("FINAL SUMMARY REPORT", 20, currentY + 7);

      doc.setTextColor(230, 230, 230);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Total Active Work Sites:  ${totalSites}`, 20, currentY + 16);
      doc.text(`Total Staff Managed:     ${totalWorkers}`, 20, currentY + 22);
      doc.text(`Gross Payroll Accrued:   Rs. ${grandGross.toLocaleString()}`, 20, currentY + 28);
      
      // Total Outstanding Advances
      doc.setTextColor(230, 100, 100);
      doc.text(`Total Advance Deductions: Rs. ${grandAdvances.toLocaleString()}`, 90, currentY + 16);

      // GRAND TOTAL FOR ALL SITES
      doc.setFillColor(217, 119, 6);
      doc.rect(90, 21 + currentY, 95, 12, 'F');
      doc.setTextColor(35, 28, 21);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`NET OVERALL PAYABLE: Rs. ${grandNet.toLocaleString()}`, 93, currentY + 29);

      currentY += 52;

      // E. SIGNATURE SECTION
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 100, 100);

      // Left signature
      doc.text("Prepared By:", 20, currentY);
      doc.line(20, currentY + 12, 75, currentY + 12);
      doc.text("Workshop Manager Signature", 20, currentY + 16);

      // Right signature
      doc.text("Approved By:", 120, currentY);
      doc.line(120, currentY + 12, 175, currentY + 12);
      doc.text("Office Approval & Audited Signoff", 120, currentY + 16);

      // F. SAVE FILE
      const filename = `WorkMate_Payroll_${billingMonth}_${companyName.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      alert(`PDF downloaded as: ${filename}`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Check console logs.");
    } finally {
      setGenerating(false);
    }
  };

  // Browser Print trigger (relies on globals.css print rules)
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Report Generator</h1>
          <p className="text-xs text-wood-text-muted mt-1">Review ledger calculations and generate high-fidelity, carpenter-themed PDF payroll files for auditing.</p>
        </div>

        {/* Month Picker */}
        <div className="flex items-center gap-2.5 bg-stone-900 border border-wood-border/20 py-2 px-4 rounded-xl shrink-0 self-start sm:self-auto focus-within:border-amber-500 transition-colors">
          <Calendar className="h-4.5 w-4.5 text-amber-500" />
          <input
            id="reports-month-picker"
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="bg-transparent border-none text-stone-200 focus:outline-none text-xs font-semibold cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 space-y-6 no-print">
          <div className="glass-panel rounded-3xl p-6 bg-wood-card">
            <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-amber-500" />
              <span>Report Options</span>
            </h2>

            <div className="space-y-4">
              <div className="p-3 bg-stone-950/60 border border-wood-border/10 rounded-xl space-y-1.5 text-xs text-wood-text-muted">
                <p>Company: <strong className="text-stone-200">{user?.companyName}</strong></p>
                <p>Date Range: <strong className="text-stone-200">{getMonthName(billingMonth)}</strong></p>
                <p>Total Sites: <strong className="text-stone-200">{totalSites}</strong></p>
                <p>Active Staff: <strong className="text-stone-200">{totalWorkers}</strong></p>
              </div>

              <button
                id="download-pdf-btn"
                onClick={generatePDF}
                disabled={generating || activeSites.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                <span>{generating ? 'Compiling PDF...' : 'Download PDF Report'}</span>
              </button>

              <button
                id="print-report-btn"
                onClick={handlePrint}
                disabled={activeSites.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-wood-border/20 font-semibold rounded-xl transition-all"
              >
                <Printer className="h-5 w-5 text-amber-500" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Report Preview Sheet */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel rounded-3xl p-6 md:p-8 bg-stone-950 border border-wood-border/20 relative shadow-2xl overflow-hidden wood-grain">
            
            {/* Branded Watermark overlay */}
            <div className="absolute right-0 top-0 translate-y-4 translate-x-4 opacity-5 pointer-events-none">
              <Award className="h-64 w-64 text-amber-500" />
            </div>

            {/* A. PDF Title Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-wood-border/20 pb-6 mb-6 gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span className="p-1 bg-amber-500 rounded text-stone-950 font-black text-xs">WM</span>
                  <span>WorkMate Payroll Report</span>
                </h2>
                <p className="text-xs text-wood-text-muted mt-1 uppercase font-bold tracking-wider">{user?.companyName}</p>
              </div>
              <div className="text-left md:text-right text-xs text-wood-text-muted">
                <p>Cycle: <strong className="text-stone-300 font-semibold">{getMonthName(billingMonth)}</strong></p>
                <p>Date Generated: <strong className="text-stone-300 font-semibold">{new Date().toLocaleDateString()}</strong></p>
              </div>
            </div>

            {/* B. Preview Data Table */}
            {activeSites.length === 0 ? (
              <div className="text-center py-20 text-wood-text-muted text-xs">
                No payroll transactions exist in {getMonthName(billingMonth)} to preview.
              </div>
            ) : (
              <div className="space-y-8">
                {activeSites.map((site) => (
                  <div key={site.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500 pb-1.5 border-b border-wood-border/10">
                      <Building2 className="h-4 w-4" />
                      <span>SITE: {site.name.toUpperCase()} (Client: {site.client})</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-wood-border/10 text-wood-text-muted font-bold">
                            <th className="pb-2 font-semibold">Worker</th>
                            <th className="pb-2 text-center font-semibold">Attendance</th>
                            <th className="pb-2 text-center font-semibold">Daily Wage</th>
                            <th className="pb-2 text-center font-semibold">Gross Wage</th>
                            <th className="pb-2 text-center font-semibold">Advances</th>
                            <th className="pb-2 text-right font-semibold">Net Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-wood-border/5 text-stone-300">
                          {site.workers.map((worker, index) => (
                            <tr key={index}>
                              <td className="py-2 font-semibold text-stone-200">{worker.name}</td>
                              <td className="py-2 text-center">{worker.daysWorked} days</td>
                              <td className="py-2 text-center">₹{worker.wage.toLocaleString()}</td>
                              <td className="py-2 text-center">₹{worker.grossSalary.toLocaleString()}</td>
                              <td className="py-2 text-center text-red-400">₹{worker.advanceDeduction.toLocaleString()}</td>
                              <td className="py-2 text-right text-emerald-400 font-bold">₹{worker.netSalary.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-wood-text-muted pt-2 border-t border-wood-border/5">
                      <span>Gross subtotal: ₹{site.siteGross.toLocaleString()} | Advances: ₹{site.siteAdvances.toLocaleString()}</span>
                      <span className="text-emerald-400 font-bold">Site Net Total: ₹{site.siteNet.toLocaleString()}</span>
                    </div>
                  </div>
                ))}

                {/* C. Overall Summary Card */}
                <div className="p-5 rounded-2xl bg-stone-900 border border-wood-border/20 text-xs mt-8 space-y-4">
                  <h4 className="font-bold text-amber-500 uppercase tracking-widest text-[10px]">Business Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-wood-text-muted">Total Sites</span>
                      <p className="font-bold text-stone-200">{totalSites}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-wood-text-muted">Active Workers</span>
                      <p className="font-bold text-stone-200">{totalWorkers}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-wood-text-muted">Gross Wages</span>
                      <p className="font-bold text-stone-200">₹{grandGross.toLocaleString()}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-wood-text-muted">Total Advances Deducted</span>
                      <p className="font-bold text-red-400">₹{grandAdvances.toLocaleString()}</p>
                    </div>
                    <div className="space-y-0.5 col-span-2">
                      <span className="text-[10px] text-amber-400 font-bold">Final Overall Payable</span>
                      <p className="text-lg font-black text-emerald-400 flex items-center">
                        <IndianRupee className="h-4.5 w-4.5 mr-0.5 stroke-[2.5]" />
                        <span>{grandNet.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* D. Signatures boxes */}
                <div className="grid grid-cols-2 gap-6 pt-12 border-t border-wood-border/10 text-[10px] text-wood-text-muted">
                  <div className="space-y-10">
                    <p>Prepared By:</p>
                    <div className="border-b border-wood-border/30 w-full" />
                    <p className="font-semibold text-stone-400">Workshop Manager</p>
                  </div>
                  <div className="space-y-10">
                    <p>Approved By:</p>
                    <div className="border-b border-wood-border/30 w-full" />
                    <p className="font-semibold text-stone-400">Office Administration</p>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
