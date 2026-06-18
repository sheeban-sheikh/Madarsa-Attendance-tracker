import { useState } from "react";
import { AlertTriangle, ChevronRight, Globe, Info, Moon, ShieldCheck, Sun, Trash2, ArrowLeft, LogOut } from "lucide-react";

export default function Settings({ 
  language, 
  setLanguage, 
  onClearAllData, 
  t, 
  isRtl,
  darkMode,
  setDarkMode,
  setActiveTab,
  userProfile,
  onLogout
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const isSuperAdmin = userProfile?.role === "super_admin";

  return (
    <div className="space-y-6 animate-fade-in pb-20 sm:pb-0 text-left">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab("dashboard")}
          className="md:hidden p-2 text-slate-600 hover:text-slate-800 rounded-lg bg-white border border-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.settings}
          </h1>
          <p className="text-xs text-slate-500">
            {isRtl ? "ایپلی کیشن سیٹنگز" : "Application settings"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="settings-list">
          <button type="button" onClick={() => setLanguage(language === "en" ? "ur" : "en")} className="settings-row">
            <span className="settings-icon text-islamic-green-700 bg-emerald-50"><Globe className="w-5 h-5" /></span>
            <span className="flex-1 font-bold">{t.languageSwitch}</span>
            <span className="text-xs font-semibold text-slate-500">{language === "en" ? "English" : "اردو"}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button type="button" onClick={() => setDarkMode(!darkMode)} className="settings-row">
            <span className="settings-icon text-amber-500 bg-amber-50">{darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</span>
            <span className="flex-1 font-bold">{t.darkModeToggle}</span>
            <span className="text-xs font-semibold text-slate-500">{darkMode ? t.darkMode : t.lightMode}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          {isSuperAdmin && (
            <button type="button" onClick={() => setShowClearConfirm(true)} className="settings-row">
              <span className="settings-icon text-red-500 bg-red-50"><Trash2 className="w-5 h-5" /></span>
              <span className="flex-1 font-bold">{t.clearData}</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}

          <button type="button" onClick={() => setShowAbout(true)} className="settings-row">
            <span className="settings-icon text-blue-600 bg-blue-50"><Info className="w-5 h-5" /></span>
            <span className="flex-1 font-bold">{isRtl ? "ایپ کے بارے میں" : "About App"}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button type="button" onClick={() => setShowPrivacy(true)} className="settings-row">
            <span className="settings-icon text-slate-600 bg-slate-50"><ShieldCheck className="w-5 h-5" /></span>
            <span className="flex-1 font-bold">{isRtl ? "پرائیویسی پالیسی" : "Privacy Policy"}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>

          <button type="button" onClick={onLogout} className="settings-row text-red-650 hover:bg-red-50/50">
            <span className="settings-icon text-red-500 bg-red-50"><LogOut className="w-5 h-5" /></span>
            <span className="flex-1 font-bold text-red-600">{isRtl ? "لاگ آؤٹ" : "Log Out"}</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[24px] sm:rounded-[16px] shadow-xl overflow-hidden border-t sm:border border-slate-200 p-6 text-center space-y-4 animate-scale-in pb-10 sm:pb-6">
            <div className="flex justify-center sm:hidden -mt-4 mb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">{t.clearData}</h3>
              <p className="text-xs text-slate-500">{t.clearDataConfirm}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer active:scale-95"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About App Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[16px] shadow-xl overflow-hidden border-t sm:border border-slate-200 p-6 text-center space-y-4 animate-scale-in pb-10 sm:pb-6">
            <div className="flex justify-center sm:hidden -mt-4 mb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-100">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="font-bold text-slate-900 text-lg">{isRtl ? "ایپ کے بارے میں" : "About App"}</h3>
              <p className="text-xs text-slate-650 leading-relaxed text-center">
                {isRtl 
                  ? "دعوتِ اسلامی انڈیا مدرسہ حاضری ٹریکر ایک جدید، آف لائن حاضری کا ڈیجیٹل نظام ہے، جسے مدارس کے منتظمین، اساتذہ اور کوآرڈینیٹرز کے لیے حاضری، طلباء کے ریکارڈز اور رپورٹس کی تیاری کو انتہائی آسان بنانے کے لیے ڈیزائن کیا گیا ہے۔"
                  : "The Dawat-e-Islami India Madarsa Attendance Tracker is a premium, offline-first digital attendance system designed for administrators, teachers, and coordinators to simplify daily attendance recording, student tracking, and report generation."}
              </p>
              <div className="pt-2 text-[10px] text-slate-400 font-bold tracking-wider">
                VERSION v1.2.0
              </div>
            </div>
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-islamic-green-700 hover:bg-islamic-green-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isRtl ? "بند کریں" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[16px] shadow-xl overflow-hidden border-t sm:border border-slate-200 p-6 text-center space-y-4 animate-scale-in pb-10 sm:pb-6">
            <div className="flex justify-center sm:hidden -mt-4 mb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="font-bold text-slate-900 text-lg">{isRtl ? "پرائیویسی پالیسی" : "Privacy Policy"}</h3>
              <p className="text-xs text-slate-650 leading-relaxed text-center">
                {isRtl 
                  ? "یہ ایپلی کیشن مکمل طور پر آف لائن چلتی ہے۔ ہم آپ کے طلباء کا کوئی ریکارڈ، حاضری کی تفصیلات، یا ذاتی معلومات کسی بیرونی سرور پر منتقل، جمع، یا شیئر نہیں کرتے۔ آپ کا سارا ڈیٹا آپ کے اپنے براؤزر کے محفوظ لوکل ڈیٹا بیس میں محفوظ رہتا ہے۔"
                  : "This application operates completely offline on your device. We do not transmit, collect, or share any student records, attendance details, or personal information with external servers. Your data is stored securely in your browser's local storage database."}
              </p>
            </div>
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowPrivacy(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-islamic-green-700 hover:bg-islamic-green-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isRtl ? "بند کریں" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
