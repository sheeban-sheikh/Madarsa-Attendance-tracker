import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Mail, Lock, AlertCircle, Eye, EyeOff, Globe } from "lucide-react";

export default function Login({ onLoginSuccess, language, setLanguage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isRtl = language === "ur";

  // Multi-language strings local to Login component
  const loginTranslations = {
    en: {
      title: "Madarsa Attendance Tracker",
      subtitle: "Sign in to access your dashboard",
      emailLabel: "Email Address",
      emailPlaceholder: "e.g. admin@madarsa.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      loginBtn: "Log In",
      loggingIn: "Signing in...",
      invalidCreds: "Invalid email or password.",
      profileNotFound: "User profile not found in database. Contact Super Admin.",
      generalError: "Authentication failed. Try again.",
    },
    ur: {
      title: "مدرسہ حاضری ٹریکر",
      subtitle: "اپنے ڈیش بورڈ تک رسائی کے لیے سائن ان کریں",
      emailLabel: "ای میل ایڈریس",
      emailPlaceholder: "مثال: admin@madarsa.com",
      passwordLabel: "پاس ورڈ",
      passwordPlaceholder: "پاس ورڈ درج کریں",
      loginBtn: "لاگ ان کریں",
      loggingIn: "سائن ان ہو رہا ہے...",
      invalidCreds: "غلط ای میل یا پاس ورڈ۔",
      profileNotFound: "ڈیٹا بیس میں صارف کا ریکارڈ نہیں ملا۔ سپر ایڈمن سے رابطہ کریں۔",
      generalError: "لاگ ان کرنے میں ناکامی۔ دوبارہ کوشش کریں۔",
    }
  };

  const t = loginTranslations[language];

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError("");
    setIsLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        setError(t.invalidCreds);
        setIsLoading(false);
        return;
      }

      // 2. Fetch User Role & Assigned Madarsa from public.users
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("id, email, role, madarsa_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profileData) {
        // Sign out if no database profile is found
        await supabase.auth.signOut();
        setError(t.profileNotFound);
        setIsLoading(false);
        return;
      }

      // 3. Callback on success
      onLoginSuccess(profileData, authData.session);
    } catch (err) {
      console.error("Login Exception:", err);
      setError(t.generalError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 flex flex-col justify-between items-center py-8 px-4 select-none relative"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}
    >
      {/* Subtle background Islamic visual line texture matching splash screen style */}
      <div className="absolute inset-0 opacity-2 pointer-events-none z-0" style={{
        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 24px, #0B8A43 24px, #0B8A43 25px)",
        backgroundSize: "30px 30px"
      }} />

      {/* 1. Header Language Switcher Row */}
      <header className="w-full max-w-md flex justify-end items-center z-10">
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              language === "en" ? "bg-islamic-green-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("ur")}
            className={`px-3 py-1.5 rounded-lg transition-all font-urdu cursor-pointer ${
              language === "ur" ? "bg-islamic-green-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            اردو
          </button>
        </div>
      </header>

      {/* 2. Main Login Card Container */}
      <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-lg z-10 space-y-6 my-auto text-left">
        {/* Branding Logo & App Title */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-40 p-1 bg-white flex items-center justify-center">
            <img src="/logo.png" alt="Dawat-e-Islami Logo" className="w-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-4 leading-tight tracking-tight">
            {t.title}
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-3.5 rounded-xl flex items-start gap-2.5 animate-scale-in">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                disabled={isLoading}
                className={`w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                disabled={isLoading}
                className={`w-full py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ${isRtl ? 'left-3' : 'right-3'}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3 bg-islamic-green-700 hover:bg-islamic-green-800 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{isLoading ? t.loggingIn : t.loginBtn}</span>
          </button>
        </form>

        <div className="text-[10px] text-center text-slate-400 font-mono pt-2 border-t border-slate-100">
          Supabase URL: {import.meta.env.VITE_SUPABASE_URL || "NOT_FOUND"}
        </div>
      </div>

      {/* 3. Footer Copyright */}
      <footer className="w-full max-w-md text-center text-[10px] text-slate-400 font-bold tracking-wider z-10 pt-4">
        © Dawat-e-Islami India
      </footer>
    </div>
  );
}
