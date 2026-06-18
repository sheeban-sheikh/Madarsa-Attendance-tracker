import React, { useState, useEffect } from "react";
import { 
  School, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Settings as SettingsIcon,
  FileText,
  AlertCircle,
  Check,
  Info,
  LogOut
} from "lucide-react";

// Components
import Dashboard from "./components/Dashboard";
import Madarsas from "./components/Madarsas";
import Students from "./components/Students";
import Attendance from "./components/Attendance";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import Login from "./components/Login";

// Supabase
import { supabase } from "./supabaseClient";

// Data & Helpers
import { mockMadarsas, mockStudents, generateSeedAttendance } from "./data/mockData";
import { translations } from "./data/translations";export default function App() {
  // 1. Language & LTR/RTL Layout
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "en";
  });

  // 2. Splash Screen state
  const [showSplash, setShowSplash] = useState(true);

  // 3. Data states
  const [madarsas, setMadarsas] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // 4. Navigation state
  const [activeTab, setActiveTab] = useState("dashboard");

  // 5. Toast Notification state
  const [toast, setToast] = useState(null);

  // 6. Dark Mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  // 7. Supabase session & user profile states
  const [userSession, setUserSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync language configuration
  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Sync dark mode configuration
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  // Listen to Supabase Authentication changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setMadarsas([]);
        setStudents([]);
        setAttendanceRecords([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role, madarsa_id")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("Error fetching user profile:", error);
        await supabase.auth.signOut();
      } else {
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Exception in fetchUserProfile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group database attendance rows by date and madarsa_id to match the app's internal format
  const groupAttendanceRows = (rows) => {
    const groups = {};
    rows.forEach(row => {
      const date = row.attendance_date;
      const mId = row.students?.madarsa_id;
      if (!mId) return;
      const key = `${date}|${mId}`;
      if (!groups[key]) {
        groups[key] = {
          date,
          madarsaId: mId,
          records: {}
        };
      }
      groups[key].records[row.student_id] = row.status;
    });
    return Object.values(groups);
  };

  // Load app data based on user profile and role
  const loadAppData = async () => {
    if (!userProfile) return;
    setIsLoading(true);
    try {
      // 1. Fetch Madarsas
      let madarsasQuery = supabase.from("madarsas").select("*").order("name");
      if (userProfile.role === "madarsa_admin") {
        madarsasQuery = madarsasQuery.eq("id", userProfile.madarsa_id);
      }
      const { data: mData, error: mError } = await madarsasQuery;
      if (mError) throw mError;
      setMadarsas(mData || []);

      // 2. Fetch Students
      let studentsQuery = supabase.from("students").select("*").order("name");
      if (userProfile.role === "madarsa_admin") {
        studentsQuery = studentsQuery.eq("madarsa_id", userProfile.madarsa_id);
      }
      const { data: sData, error: sError } = await studentsQuery;
      if (sError) throw sError;

      const mappedStudents = (sData || []).map(student => ({
        id: student.id,
        name: student.name,
        age: student.age,
        madarsaId: student.madarsa_id,
        photo: student.photo_url
      }));
      setStudents(mappedStudents);

      // 3. Fetch Attendance
      let attendanceQuery;
      if (userProfile.role === "super_admin") {
        attendanceQuery = supabase
          .from("attendance")
          .select(`
            id,
            attendance_date,
            status,
            student_id,
            students (
              madarsa_id
            )
          `);
      } else {
        attendanceQuery = supabase
          .from("attendance")
          .select(`
            id,
            attendance_date,
            status,
            student_id,
            students!inner (
              madarsa_id
            )
          `)
          .eq("students.madarsa_id", userProfile.madarsa_id);
      }
      const { data: aData, error: aError } = await attendanceQuery;
      if (aError) throw aError;

      const groupedAttendance = groupAttendanceRows(aData || []);
      setAttendanceRecords(groupedAttendance);
    } catch (err) {
      console.error("Error loading app data:", err);
      showNotification(language === "ur" ? "ڈیٹا لوڈ کرنے میں خرابی۔" : "Failed to load data from server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadAppData();
    }
  }, [userProfile]);

  // Toast helper
  const showNotification = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Settings Actions
  const handleClearAllData = async () => {
    if (userProfile?.role !== "super_admin") return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("madarsas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;

      setMadarsas([]);
      setStudents([]);
      setAttendanceRecords([]);
      
      showNotification(language === "ur" ? "تمام ڈیٹا کامیابی سے صاف کر دیا گیا!" : "All database records cleared successfully!", "info");
    } catch (err) {
      console.error("Error clearing database data:", err);
      showNotification(language === "ur" ? "ڈیٹا صاف کرنے میں ناکامی۔" : "Failed to clear data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      madarsas,
      students,
      attendanceRecords,
      version: "1.0",
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dawat_e_Islami_Tracker_Backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(language === "ur" ? "بیک اپ کامیابی سے ڈاؤن لوڈ ہو گیا!" : "Backup downloaded successfully!", "success");
  };

  const handleImportBackup = async (parsedData) => {
    if (userProfile?.role !== "super_admin") return;
    if (!parsedData || !parsedData.madarsas || !parsedData.students || !parsedData.attendanceRecords) {
      showNotification(translations[language].importError, "error");
      return;
    }

    setIsLoading(true);
    try {
      await supabase.from("madarsas").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error: mError } = await supabase.from("madarsas").insert(parsedData.madarsas.map(m => ({
        id: m.id.startsWith("m_") || !m.id.includes("-") ? undefined : m.id,
        name: m.name,
        location: m.location
      })));
      if (mError) throw mError;

      await loadAppData();
      showNotification(translations[language].importSuccess, "success");
    } catch (err) {
      console.error("Import error:", err);
      showNotification(translations[language].importError, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (profile, session) => {
    setUserProfile(profile);
    setUserSession(session);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUserSession(null);
      setUserProfile(null);
      setMadarsas([]);
      setStudents([]);
      setAttendanceRecords([]);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const enterApp = (selectedLang) => {
    setLanguage(selectedLang);
    localStorage.setItem("hasVisited", "true");
    setShowSplash(false);
  };
  const t = translations[language];
  const isRtl = language === "ur";

  // Navigation Items
  const navItems = [
    { id: "dashboard", label: t.dashboard, icon: School },
    { id: "madarsas", label: t.madarsas, icon: School },
    { id: "students", label: t.students, icon: Users },
    { id: "attendance", label: t.attendance, icon: Calendar },
    { id: "reports", label: t.reports, icon: FileText }
  ];

  // Render Splash Screen
  if (showSplash) {
    return (
      <div className="splash-screen min-h-screen flex flex-col justify-between items-center py-10 px-6 select-none" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
        
        {/* ── Scalloped Dome Ornament — Top Right (Premium Layered Mughal Arch with Emerald/Gold gradients & pattern) ── */}
        <div className="splash-ornament splash-anim-ornament">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Emerald Green gradient */}
              <linearGradient id="emeraldGrad" x1="100" y1="0" x2="30" y2="70" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1B5E3A" />
                <stop offset="60%" stopColor="#124E2F" />
                <stop offset="100%" stopColor="#0B3620" />
              </linearGradient>

              {/* Dark Green gradient for the shadow-backing layer */}
              <linearGradient id="darkGreenGrad" x1="100" y1="0" x2="30" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0E3C22" />
                <stop offset="100%" stopColor="#051C0E" />
              </linearGradient>

              {/* Intricate Islamic Geometric Pattern overlay */}
              <pattern id="islamicGeom" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M5 0 L10 5 L5 10 L0 5 Z" stroke="#D4AF37" strokeWidth="0.3" strokeOpacity="0.08" fill="none" />
                <circle cx="5" cy="5" r="1.5" stroke="#D4AF37" strokeWidth="0.2" strokeOpacity="0.06" fill="none" />
              </pattern>
            </defs>

            {/* Layer 1: Dark Green Outer backing arch */}
            <path
              d="M 100 0 L 100 90 C 90 90 80 80 80 70 C 80 60 70 50 55 50 C 40 50 30 40 30 25 C 30 15 20 10 20 0 Z"
              fill="url(#darkGreenGrad)"
            />

            {/* Layer 2: Gold Outer outline */}
            <path
              d="M 100 0 L 100 90 C 90 90 80 80 80 70 C 80 60 70 50 55 50 C 40 50 30 40 30 25 C 30 15 20 10 20 0 Z"
              stroke="#D4AF37"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Layer 3: Emerald Green Inner arch */}
            <path
              d="M 100 0 L 100 78 C 91 78 83 70 83 62 C 83 54 73 45 60 45 C 47 45 38 36 38 23 C 38 14 28 8 28 0 Z"
              fill="url(#emeraldGrad)"
            />

            {/* Layer 4: Geometric Pattern overlay */}
            <path
              d="M 100 0 L 100 78 C 91 78 83 70 83 62 C 83 54 73 45 60 45 C 47 45 38 36 38 23 C 38 14 28 8 28 0 Z"
              fill="url(#islamicGeom)"
            />

            {/* Layer 5: Faint Nested Gold Arch outlines */}
            <path
              d="M 100 0 L 100 66 C 92 66, 86 59, 86 52 C 86 45, 76 38, 64 38 C 52 38, 44 30, 44 18 C 44 11, 35 6, 35 0"
              stroke="#D4AF37"
              strokeWidth="0.8"
              strokeOpacity="0.75"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 100 0 L 100 54 C 94 54, 89 49, 89 42 C 89 36, 81 31, 71 31 C 61 31, 53 25, 53 15 C 53 9, 45 5, 45 0"
              stroke="rgba(212,175,55,0.45)"
              strokeWidth="0.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Dummy spacer to balance the header space */}
        <div className="h-6"></div>

        {/* ── Main Content Block (Centered, Logo + Title) ── */}
        <div className="flex-1 flex flex-col items-center justify-center text-center z-10 w-full max-w-lg md:max-w-2xl">
          {/* Dawat-e-Islami Logo (Increased size, primary focal point) */}
          <div className="splash-logo-container splash-anim-logo">
            <img
              src="/logo.png"
              alt="Dawat-e-Islami India"
              className="w-full h-auto object-contain drop-shadow-sm"
            />
          </div>

          {/* App Title (Madarsa Attendance Tracker) */}
          <div className="splash-anim-title mt-4 md:mt-0 md:mb-14">
            <h1
              className="font-semibold leading-tight tracking-tight"
              style={{
                color: '#1B5E3A',
                fontSize: 'clamp(1.75rem, 6.5vw, 2.5rem)',
                fontFamily: "'Poppins', sans-serif"
              }}
            >
              Madarsa Attendance
              <br className="md:hidden" /> Tracker
            </h1>
          </div>
        </div>

        {/* ── Language Buttons & Footer (Placed higher with responsive class) ── */}
        <div className="splash-controls-section z-10 flex flex-col items-center gap-6 w-full max-w-[320px]">
          {/* Language Pill Buttons */}
          <div className="splash-anim-buttons flex gap-4 w-full justify-center">
            <button
              onClick={() => enterApp("en")}
              className="splash-lang-btn splash-lang-btn--active"
            >
              English
            </button>
            <button
              onClick={() => enterApp("ur")}
              className="splash-lang-btn splash-lang-btn--inactive font-urdu"
            >
              اردو
            </button>
          </div>

          {/* Footer Copyright */}
          <p
            className="splash-anim-footer font-medium select-none text-[11px]"
            style={{ color: '#1B5E3A', opacity: 0.85, letterSpacing: '0.04em' }}
          >
            © Dawat-e-Islami India
          </p>
        </div>

        {/* ── Mosque Skyline Silhouette — Bottom (Full-width, elegant, no crop) ── */}
        <div className="splash-mosque-svg splash-anim-mosque">
          <svg viewBox="0 0 800 240" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mgTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C7D8C5" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#C7D8C5" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="mgFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C7D8C5" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#C7D8C5" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Base ground strip */}
            <rect x="0" y="225" width="800" height="15" fill="url(#mgFade)" />

            {/* Far-left small dome building */}
            <rect x="0" y="180" width="60" height="45" fill="url(#mgFade)" />
            <ellipse cx="30" cy="180" rx="30" ry="22" fill="url(#mgFade)" />

            {/* Outer left minaret */}
            <rect x="85" y="100" width="16" height="125" rx="3" fill="url(#mgTop)" />
            <ellipse cx="93" cy="100" rx="10" ry="12" fill="url(#mgTop)" />
            <line x1="93" y1="80" x2="93" y2="88" stroke="#C7D8C5" strokeWidth="2.5" strokeOpacity="0.8" />
            <path d="M90 75 A4 4 0 1 1 96 75 A2.8 2.8 0 1 0 90 75Z" fill="#C7D8C5" fillOpacity="0.8" />

            {/* Left medium dome */}
            <rect x="130" y="130" width="100" height="95" fill="url(#mgFade)" />
            <ellipse cx="180" cy="130" rx="50" ry="38" fill="url(#mgFade)" />

            {/* Left tall minaret */}
            <rect x="260" y="55" width="20" height="170" rx="4" fill="url(#mgTop)" />
            <ellipse cx="270" cy="55" rx="12" ry="16" fill="url(#mgTop)" />
            <line x1="270" y1="30" x2="270" y2="39" stroke="#C7D8C5" strokeWidth="3" strokeOpacity="0.8" />
            <path d="M266 24 A5.5 5.5 0 1 1 274 24 A4 4 0 1 0 266 24Z" fill="#C7D8C5" fillOpacity="0.8" />

            {/* Central grand dome */}
            <rect x="310" y="80" width="180" height="145" fill="url(#mgTop)" />
            <ellipse cx="400" cy="80" rx="90" ry="75" fill="url(#mgTop)" />
            <line x1="400" y1="5" x2="400" y2="20" stroke="#C7D8C5" strokeWidth="3.5" strokeOpacity="0.9" />
            <path d="M395 0 A7 7 0 1 1 405 0 A5 5 0 1 0 395 0Z" fill="#C7D8C5" fillOpacity="0.9" />

            {/* Right tall minaret */}
            <rect x="520" y="55" width="20" height="170" rx="4" fill="url(#mgTop)" />
            <ellipse cx="530" cy="55" rx="12" ry="16" fill="url(#mgTop)" />
            <line x1="530" y1="30" x2="530" y2="39" stroke="#C7D8C5" strokeWidth="3" strokeOpacity="0.8" />
            <path d="M526 24 A5.5 5.5 0 1 1 534 24 A4 4 0 1 0 526 24Z" fill="#C7D8C5" fillOpacity="0.8" />

            {/* Right medium dome */}
            <rect x="570" y="130" width="100" height="95" fill="url(#mgFade)" />
            <ellipse cx="620" cy="130" rx="50" ry="38" fill="url(#mgFade)" />

            {/* Outer right minaret */}
            <rect x="699" y="100" width="16" height="125" rx="3" fill="url(#mgTop)" />
            <ellipse cx="707" cy="100" rx="10" ry="12" fill="url(#mgTop)" />
            <line x1="707" y1="80" x2="707" y2="88" stroke="#C7D8C5" strokeWidth="2.5" strokeOpacity="0.8" />
            <path d="M704 75 A4 4 0 1 1 710 75 A2.8 2.8 0 1 0 704 75Z" fill="#C7D8C5" fillOpacity="0.8" />

            {/* Outer right dome */}
            <rect x="740" y="180" width="60" height="45" fill="url(#mgFade)" />
            <ellipse cx="770" cy="180" rx="30" ry="22" fill="url(#mgFade)" />
          </svg>
        </div>
      </div>
    );
  }

  // Render loading screen during initial authentication and data load
  if (isLoading && !userProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-islamic-green-700/20 border-t-islamic-green-700 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-bold mt-4 tracking-wider uppercase">
          {language === "ur" ? "لوڈ ہو رہا ہے..." : "Loading Application..."}
        </p>
      </div>
    );
  }

  // Render Login page if not authenticated
  if (!userSession || !userProfile) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-50 flex flex-col"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Toast notifications */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:-translate-x-0 z-50 animate-scale-in">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border text-white text-xs font-bold ${
            toast.type === "success" 
              ? "bg-islamic-green-700 border-islamic-green-600" 
              : toast.type === "error" 
                ? "bg-red-600 border-red-500" 
                : "bg-emerald-600 border-emerald-500"
          }`}>
            {toast.type === "success" && <Check className="w-4 h-4 stroke-[3]" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 stroke-[3]" />}
            {toast.type === "info" && <Info className="w-4 h-4 stroke-[3]" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. Desktop Top Header Banner (White background, logo centered) */}
      <header className="hidden md:flex items-center justify-between px-8 py-3 bg-white border-b border-slate-200 select-none shrink-0">
        <div className="w-1/3"></div>
        
        {/* Centered logo container - white background, uncropped, standard aspect ratio */}
        <div className="w-1/3 flex justify-center">
          <div className="px-5 py-1 bg-white flex items-center justify-center">
            <img src="/logo.png" alt="Dawat-e-Islami Logo" className="h-14 md:h-20 lg:h-24 w-auto object-contain" />
          </div>
        </div>
        
        {/* Language selector pills */}
        <div className="w-1/3 flex justify-end items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                language === "en" ? "bg-islamic-green-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage("ur")}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-urdu cursor-pointer ${
                language === "ur" ? "bg-islamic-green-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              اردو
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container (Desktop sidebar + Main panel) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Desktop Sidebar - White background, green active menu items, dark text, separators */}
        <aside className="hidden md:flex flex-col justify-between w-64 bg-white border-r border-slate-200 shadow-sm shrink-0 p-5 select-none relative">
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center pb-5 border-b border-slate-100">
              <div className="w-48 p-1 bg-white flex items-center justify-center">
                <img src="/logo.png" alt="Dawat-e-Islami Mini Logo" className="w-full object-contain" />
              </div>
              <h2 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-2.5 text-center">
                Dawat-E-Islami India
              </h2>
            </div>

            {/* Sidebar Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                      isActive 
                        ? "bg-islamic-green-700 text-white shadow-sm" 
                        : "text-slate-900 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <IconComponent className="w-5 h-5 shrink-0" />
                    <span className={`${isRtl ? 'font-urdu' : ''}`}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Settings and Separator */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "bg-islamic-green-700 text-white shadow-sm"
                  : "text-slate-900 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className={`${isRtl ? 'font-urdu' : ''}`}>{t.settings}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center gap-3 text-red-600 hover:bg-red-50 hover:text-red-750 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-red-550" />
              <span className={`${isRtl ? 'font-urdu' : ''}`}>{isRtl ? "لاگ آؤٹ" : "Log Out"}</span>
            </button>

            {/* Decorative Mosque Silhouette at sidebar bottom */}
            <div className="relative opacity-15 flex justify-center pt-2 select-none pointer-events-none">
              <svg viewBox="0 0 100 35" className="w-full text-slate-400 fill-current">
                <path d="M0 35h100V25s-2-2-4-2H86s-1-2-1-3V11s-2-5-5-5-5 5-5 5v9s-2-2-4-2h-8s-1-2-1-3V4s-2-4-5-4-5 4-5 4v12s-2-2-4-2H43s-1-2-1-3V6s-2-5-5-5-5 5-5 5v14s-2-2-4-2H23s-1-2-1-3V9s-2-5-5-5-5 5-5 5v11s-2-2-4-2H0z"/>
              </svg>
            </div>
          </div>
        </aside>

        {/* 3. Main content body panel - Occupies full width on mobile because mobile header & sidebar are outside layout */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto w-full md:pb-6 pb-24">
          {activeTab === "dashboard" && (
            <Dashboard 
              madarsas={madarsas} 
              students={students} 
              attendanceRecords={attendanceRecords}
              t={t}
              isRtl={isRtl}
              setActiveTab={setActiveTab}
            />
          )}
          
          {activeTab === "madarsas" && (
            <Madarsas 
              madarsas={madarsas} 
              setMadarsas={setMadarsas}
              students={students}
              t={t}
              isRtl={isRtl}
              showNotification={showNotification}
              setActiveTab={setActiveTab}
              userProfile={userProfile}
            />
          )}
          
          {activeTab === "students" && (
            <Students 
              students={students} 
              setStudents={setStudents}
              madarsas={madarsas}
              t={t}
              isRtl={isRtl}
              showNotification={showNotification}
              setActiveTab={setActiveTab}
              userProfile={userProfile}
            />
          )}
          
          {activeTab === "attendance" && (
            <Attendance 
              madarsas={madarsas} 
              students={students}
              attendanceRecords={attendanceRecords}
              setAttendanceRecords={setAttendanceRecords}
              t={t}
              isRtl={isRtl}
              showNotification={showNotification}
              setActiveTab={setActiveTab}
              userProfile={userProfile}
            />
          )}
          
          {activeTab === "reports" && (
            <Reports 
              madarsas={madarsas} 
              students={students}
              attendanceRecords={attendanceRecords}
              t={t}
              isRtl={isRtl}
              setActiveTab={setActiveTab}
              userProfile={userProfile}
            />
          )}

          {activeTab === "settings" && (
            <Settings 
              language={language}
              setLanguage={setLanguage}
              onClearAllData={handleClearAllData}
              onImportBackup={handleImportBackup}
              onExportBackup={handleExportBackup}
              t={t}
              isRtl={isRtl}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              setActiveTab={setActiveTab}
              userProfile={userProfile}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* 4. Mobile Bottom Navigation Bar (White background, green active text/icons) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200/80 shadow-xl flex items-center justify-around z-30 select-none px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-[10px] font-bold transition-all relative cursor-pointer ${
                isActive 
                  ? "text-islamic-green-700 scale-105" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {/* Active Indicator Top bar */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-islamic-green-700 rounded-full animate-fade-in" />
              )}
              <IconComponent className="w-5 h-5 shrink-0" />
              <span className={`leading-none truncate max-w-[65px] ${isRtl ? 'font-urdu text-[9px]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
