import { useMemo, useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Attendance({ 
  madarsas, 
  students, 
  attendanceRecords, 
  setAttendanceRecords, 
  t, 
  isRtl,
  showNotification,
  userProfile
}) {
  const [selectedMadarsaInput, setSelectedMadarsaId] = useState("");
  const selectedMadarsaId = selectedMadarsaInput || madarsas[0]?.id || "";
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [recordOverrides, setRecordOverrides] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const studentsInMadarsa = useMemo(
    () => students.filter(s => s.madarsaId === selectedMadarsaId),
    [students, selectedMadarsaId]
  );

  const existingRecord = useMemo(
    () => attendanceRecords.find(r => r.date === selectedDate && r.madarsaId === selectedMadarsaId),
    [attendanceRecords, selectedDate, selectedMadarsaId]
  );

  const overrideKey = `${selectedMadarsaId}|${selectedDate}`;
  const localRecords = useMemo(() => {
    const overrides = recordOverrides[overrideKey] || {};
    const records = {};

    studentsInMadarsa.forEach(student => {
      if (overrides[student.id] !== undefined) {
        records[student.id] = overrides[student.id];
      } else if (existingRecord && existingRecord.records[student.id] !== undefined) {
        records[student.id] = existingRecord.records[student.id];
      } else {
        records[student.id] = true;
      }
    });

    return records;
  }, [existingRecord, overrideKey, recordOverrides, studentsInMadarsa]);

  const handleToggle = (studentId) => {
    const nextValue = localRecords[studentId] === false;
    setRecordOverrides(prev => ({
      ...prev,
      [overrideKey]: {
        ...(prev[overrideKey] || {}),
        [studentId]: nextValue
      }
    }));
  };

  const handleMarkAll = (status) => {
    const updated = {};
    studentsInMadarsa.forEach(s => {
      updated[s.id] = status;
    });
    setRecordOverrides(prev => ({
      ...prev,
      [overrideKey]: updated
    }));
  };

  const handleSave = async () => {
    if (!selectedMadarsaId) return;

    const studentIds = studentsInMadarsa.map(s => s.id);
    if (studentIds.length === 0) {
      showNotification(isRtl ? "پہلے طلباء شامل کریں۔" : "No students found in this Madarsa.", "error");
      return;
    }

    setIsSaving(true);
    showNotification(isRtl ? "حاضری محفوظ ہو رہی ہے..." : "Saving attendance...", "info");

    try {
      // 1. Delete existing records for these students on the selected date
      const { error: deleteError } = await supabase
        .from("attendance")
        .delete()
        .in("student_id", studentIds)
        .eq("attendance_date", selectedDate);

      if (deleteError) throw deleteError;

      // 2. Prepare new rows to insert
      const insertRows = studentsInMadarsa.map(student => {
        const isPresent = localRecords[student.id] !== false; // defaults to true
        return {
          student_id: student.id,
          attendance_date: selectedDate,
          status: isPresent
        };
      });

      // 3. Insert new records
      const { error: insertError } = await supabase
        .from("attendance")
        .insert(insertRows);

      if (insertError) throw insertError;

      // 4. Update parent state
      setAttendanceRecords(prev => {
        const filtered = prev.filter(
          r => !(r.date === selectedDate && r.madarsaId === selectedMadarsaId)
        );
        const newRecord = {
          date: selectedDate,
          madarsaId: selectedMadarsaId,
          records: localRecords
        };
        return [...filtered, newRecord];
      });

      showNotification(t.attendanceSaved, "success");
    } catch (err) {
      console.error("Error saving attendance:", err);
      showNotification(isRtl ? "حاضری محفوظ کرنے میں ناکامی۔" : "Failed to save attendance.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-32 sm:pb-12 text-left">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {t.attendance}
        </h1>
        <p className="text-xs text-slate-500">
          {isRtl ? "روزانہ کی حاضری لگائیں" : "Mark daily attendance"}
        </p>
      </div>

      {/* Select Madarsa and Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t.selectMadarsaForAttendance}
          </label>
          <select
            value={selectedMadarsaId}
            onChange={(e) => setSelectedMadarsaId(e.target.value)}
            className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
          >
            {madarsas.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {t.selectDate}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
          />
        </div>
      </div>

      {/* Action Buttons: Mark All Present (Green) / Mark All Absent (Red) */}
      {studentsInMadarsa.length > 0 && (
        <div className="grid grid-cols-2 gap-3 select-none">
          <button
            onClick={() => handleMarkAll(true)}
            className="py-3 px-4 bg-islamic-green-700 hover:bg-islamic-green-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>{t.markAllPresent}</span>
          </button>
          
          <button
            onClick={() => handleMarkAll(false)}
            className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>{t.markAllAbsent}</span>
          </button>
        </div>
      )}

      {/* Students List */}
      <div className="space-y-2.5">
        {studentsInMadarsa.length > 0 ? (
          studentsInMadarsa.map((student) => {
            const isPresent = localRecords[student.id] !== false; // defaults to true
            return (
              <div 
                key={student.id}
                onClick={() => handleToggle(student.id)}
                className={`p-3 bg-white border rounded-[16px] flex items-center justify-between shadow-xs cursor-pointer select-none transition-all duration-200 ${
                  isPresent 
                    ? 'border-emerald-200 bg-emerald-50/10' 
                    : 'border-red-100 bg-red-50/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Photo Container */}
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner shrink-0">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {student.name.substring(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      {student.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {t.ageText}: {student.age} {isRtl ? t.yearsOld : ""}
                    </p>
                  </div>
                </div>

                {/* Switch button (Green active / Red inactive) */}
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isPresent 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' 
                      : 'text-red-600 bg-red-50 border border-red-100'
                  }`}>
                    {isPresent ? t.present : t.absent}
                  </span>
                  
                  {/* Sliding Switch */}
                  <div 
                    className={`w-13 h-7.5 rounded-full p-0.5 transition-colors duration-200 ${
                      isPresent ? 'bg-islamic-green-700' : 'bg-red-500'
                    }`}
                  >
                    <div 
                      className={`bg-white w-6.5 h-6.5 rounded-full shadow-xs transform transition-transform duration-200 flex items-center justify-center ${
                        isPresent 
                          ? (isRtl ? '-translate-x-5' : 'translate-x-5.5') 
                          : 'translate-x-0'
                      }`}
                    >
                      {isPresent ? (
                        <Check className="w-3.5 h-3.5 text-islamic-green-700 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-500 stroke-[3]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white p-8 rounded-[16px] border border-slate-200 shadow-sm text-center text-slate-400">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-semibold">{t.noStudentsForAttendance}</p>
          </div>
        )}
      </div>

      {/* Floating Save Attendance Bottom Bar (Sticky at bottom, green style) */}
      {studentsInMadarsa.length > 0 && (
        <div className="fixed bottom-[72px] sm:bottom-4 left-0 right-0 px-4 py-3 bg-white/80 border-t border-slate-200 backdrop-blur-xs sm:border sm:rounded-2xl sm:max-w-md sm:mx-auto sm:shadow-lg z-45">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-islamic-green-700 hover:bg-islamic-green-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>{isSaving ? (isRtl ? "محفوظ ہو رہا ہے..." : "Saving...") : t.saveAttendance}</span>
          </button>
        </div>
      )}
    </div>
  );
}
