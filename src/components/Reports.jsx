import { useMemo, useState } from "react";
import { Search, Calendar, FileText, Download, AlertCircle, School } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";


export default function Reports({ 
  madarsas, 
  students,
  attendanceRecords, 
  t, 
  isRtl,
  userProfile
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  
  // Set default fromDate to 7 days ago
  const defaultFromDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  };

  const initialMadarsa = userProfile?.role === "madarsa_admin" ? userProfile.madarsa_id : "all";

  const [fromDate, setFromDate] = useState(defaultFromDate());
  const [toDate, setToDate] = useState(todayStr);
  const [selectedMadarsaId, setSelectedMadarsaId] = useState(initialMadarsa);
  
  const [appliedFilters, setAppliedFilters] = useState({
    fromDate: defaultFromDate(),
    toDate: todayStr,
    selectedMadarsaId: initialMadarsa
  });

  const reportData = useMemo(() => {
    const filteredRecords = attendanceRecords.filter(record => {
      const isWithinDate = record.date >= appliedFilters.fromDate && record.date <= appliedFilters.toDate;
      const isMatchingMadarsa = appliedFilters.selectedMadarsaId === "all" || record.madarsaId === appliedFilters.selectedMadarsaId;
      return isWithinDate && isMatchingMadarsa;
    });

    return [...filteredRecords]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(record => {
        const madarsa = madarsas.find(m => m.id === record.madarsaId);
        const studentIds = Object.keys(record.records);
        const totalInRecord = studentIds.length;
        const presentCount = studentIds.filter(id => record.records[id] === true).length;
        const absentCount = totalInRecord - presentCount;
        const percentage = totalInRecord > 0 ? ((presentCount / totalInRecord) * 100).toFixed(1) : "0.0";

        return {
          date: record.date,
          madarsaId: record.madarsaId,
          madarsaName: madarsa ? madarsa.name : "Unknown",
          total: totalInRecord,
          present: presentCount,
          absent: absentCount,
          percentage
        };
      });
  }, [appliedFilters, attendanceRecords, madarsas]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters({ fromDate, toDate, selectedMadarsaId });
  };

  // Summary Metrics calculations
  const totalStudentsInReport = reportData.reduce((acc, row) => acc + row.total, 0);
  const totalPresentInReport = reportData.reduce((acc, row) => acc + row.present, 0);
  const totalAbsentInReport = reportData.reduce((acc, row) => acc + row.absent, 0);
  
  const avgAttendanceRate = reportData.length > 0
    ? ((totalPresentInReport / totalStudentsInReport) * 100).toFixed(1)
    : "0.0";

  // XLSX EXPORT
  const exportToExcel = () => {
    if (reportData.length === 0) return;

    try {
      // Map reportData to a simplified structure for spreadsheet
      const dataToExport = reportData.map(row => ({
        [t.date]: row.date,
        [t.madarsaName]: row.madarsaName,
        [t.total]: row.total,
        [t.present]: row.present,
        [t.absent]: row.absent,
        [t.attendanceRate + " (%)"]: row.percentage + "%"
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
      
      // Auto-fit column widths
      const maxColumnWidths = [];
      dataToExport.forEach(row => {
        Object.keys(row).forEach((key, colIndex) => {
          const valLength = String(row[key]).length;
          const keyLength = key.length;
          const finalWidth = Math.max(valLength, keyLength) + 3;
          maxColumnWidths[colIndex] = Math.max(maxColumnWidths[colIndex] || 10, finalWidth);
        });
      });
      worksheet["!cols"] = maxColumnWidths.map(w => ({ wch: w }));

      XLSX.writeFile(workbook, `Madarsa_Attendance_Report_${fromDate}_to_${toDate}.xlsx`);
    } catch (err) {
      console.error("Error exporting Excel:", err);
    }
  };

  // PDF EXPORT
  const exportToPDF = () => {
    if (reportData.length === 0) return;

    try {
      const doc = new jsPDF();
      
      // Header section
      doc.setFontSize(18);
      doc.setTextColor(11, 138, 67); // primary Green color #0B8A43
      doc.text("DAWAT-E-ISLAMI INDIA", 14, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("Madarsa Attendance Tracker - Report Summary", 14, 28);
      
      // Filters subheader
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 35);
      doc.text(`Madarsa filter: ${selectedMadarsaId === "all" ? "All Madarsas" : madarsas.find(m => m.id === selectedMadarsaId)?.name}`, 14, 40);

      // Summary block
      doc.setFillColor(245, 247, 250); // soft background
      doc.rect(14, 45, 182, 22, "F");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      doc.text("SUMMARY METRICS", 18, 51);
      
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Total Records: ${reportData.length}`, 18, 59);
      doc.text(`Total Present: ${totalPresentInReport}`, 75, 59);
      doc.text(`Total Absent: ${totalAbsentInReport}`, 130, 59);
      doc.text(`Average Attendance Rate: ${avgAttendanceRate}%`, 18, 64);

      // Detail records table
      const tableHeaders = [
        ["Date", "Madarsa Name", "Total Students", "Present", "Absent", "Attendance Rate"]
      ];

      const tableBody = reportData.map(row => [
        row.date,
        row.madarsaName,
        row.total,
        row.present,
        row.absent,
        `${row.percentage}%`
      ]);

      autoTable(doc, {
        startY: 72,
        head: tableHeaders,
        body: tableBody,
        theme: "grid",
        headStyles: {
          fillColor: [11, 138, 67], // Primary Green #0B8A43
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center"
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 30 },
          1: { halign: "left" },
          2: { halign: "center", cellWidth: 28 },
          3: { halign: "center", cellWidth: 22 },
          4: { halign: "center", cellWidth: 22 },
          5: { halign: "center", cellWidth: 32 }
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        }
      });

      doc.save(`Madarsa_Attendance_Report_${fromDate}_to_${toDate}.pdf`);
    } catch (err) {
      console.error("Error exporting PDF:", err);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 sm:pb-0 text-left">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {t.reports}
        </h1>
        <p className="text-xs text-slate-500">
          {isRtl ? "حاضری رپورٹس اور ڈاؤن لوڈ" : "Attendance reports and exports"}
        </p>
      </div>

      {/* Filter Card Form */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t.fromDate}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t.toDate}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {isRtl ? "مدرسہ کا انتخاب" : "Select Madarsa"}
          </label>
          <select
            value={selectedMadarsaId}
            onChange={(e) => setSelectedMadarsaId(e.target.value)}
            className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
          >
            {userProfile?.role === "super_admin" && (
              <option value="all">{t.allMadarsas}</option>
            )}
            {madarsas.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Preset Date Range Buttons */}
        <div className="flex gap-2 justify-center select-none pt-1">
          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setFromDate(today);
              setToDate(today);
            }}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          >
            {isRtl ? "آج کا دن" : "Daily Preset"}
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const weekly = new Date();
              weekly.setDate(today.getDate() - 7);
              setFromDate(weekly.toISOString().split("T")[0]);
              setToDate(today.toISOString().split("T")[0]);
            }}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          >
            {isRtl ? "ہفتہ وار" : "Weekly Preset"}
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const monthly = new Date();
              monthly.setDate(today.getDate() - 30);
              setFromDate(monthly.toISOString().split("T")[0]);
              setToDate(today.toISOString().split("T")[0]);
            }}
            className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-750 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          >
            {isRtl ? "ماہانہ" : "Monthly Preset"}
          </button>
        </div>

        {/* Big Search button - Solid Green */}
        <button
          type="submit"
          className="w-full py-2.5 bg-islamic-green-700 hover:bg-islamic-green-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
          <span>{t.searchReports}</span>
        </button>
      </form>

      {/* Summary Metrics */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm text-center">
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{t.totalStudents}</p>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{totalStudentsInReport}</h3>
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{t.present}</p>
            <h3 className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">{totalPresentInReport}</h3>
          </div>
          <div>
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{t.attendancePercentage}</p>
            <h3 className="text-base sm:text-lg font-black text-islamic-green-700 mt-0.5">{avgAttendanceRate}%</h3>
          </div>
        </div>
      )}

      {/* Export Action Buttons: Green Excel, Red PDF */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-2 gap-3 select-none">
          <button
            onClick={exportToExcel}
            className="py-2.5 px-4 bg-white hover:bg-emerald-50 text-islamic-green-700 rounded-xl text-xs font-bold transition-all border border-emerald-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-islamic-green-700 stroke-[2.5]" />
            <span>{t.exportExcel}</span>
          </button>
          
          <button
            onClick={exportToPDF}
            className="py-2.5 px-4 bg-white hover:bg-rose-50 text-red-650 rounded-xl text-xs font-bold transition-all border border-red-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-red-500 stroke-[2.5]" />
            <span>{t.exportPDF}</span>
          </button>
        </div>
      )}

      {/* Compiled Records List */}
      <div className="space-y-3">
        {reportData.length > 0 ? (
          reportData.map((row, index) => (
            <div 
              key={index}
              className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm space-y-2.5 animate-scale-in"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <School className="w-4 h-4 text-islamic-green-700" />
                  <span className="font-bold text-slate-900 text-sm">
                    {row.madarsaName}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-[9px] text-slate-450 font-bold uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{row.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs border-t border-slate-100 pt-2.5">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.total}</p>
                  <p className="font-black text-slate-900 mt-0.5">{row.total}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.present}</p>
                  <p className="font-black text-emerald-600 mt-0.5">{row.present}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.absent}</p>
                  <p className="font-black text-red-500 mt-0.5">{row.absent}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.percentage}</p>
                  <p className="font-black text-islamic-green-700 mt-0.5">{row.percentage}%</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-[16px] border border-slate-200 shadow-sm text-center text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-semibold">{t.noReportRecords}</p>
          </div>
        )}
      </div>
    </div>
  );
}
