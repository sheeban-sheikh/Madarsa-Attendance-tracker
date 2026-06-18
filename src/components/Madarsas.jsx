import { useState } from "react";
import { Plus, Search, Edit2, Trash2, School, X, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Madarsas({ 
  madarsas, 
  setMadarsas, 
  students, 
  t, 
  isRtl,
  showNotification,
  userProfile
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMadarsa, setCurrentMadarsa] = useState(null); // null for add, object for edit
  const [formData, setFormData] = useState({ name: "", location: "" });
  
  // Confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const isSuperAdmin = userProfile?.role === "super_admin";

  // Filter madarsas based on search query
  const filteredMadarsas = madarsas.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setCurrentMadarsa(null);
    setFormData({ name: "", location: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (madarsa) => {
    setCurrentMadarsa(madarsa);
    setFormData({ name: madarsa.name, location: madarsa.location });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) return;

    if (currentMadarsa) {
      // Edit mode
      const { data, error } = await supabase
        .from("madarsas")
        .update({ name: formData.name.trim(), location: formData.location.trim() })
        .eq("id", currentMadarsa.id)
        .select()
        .single();

      if (error) {
        showNotification(error.message, "error");
      } else {
        setMadarsas(prev => prev.map(m => m.id === data.id ? data : m));
        showNotification(t.madarsaUpdated, "success");
        setIsModalOpen(false);
      }
    } else {
      // Add mode
      const { data, error } = await supabase
        .from("madarsas")
        .insert([{ name: formData.name.trim(), location: formData.location.trim() }])
        .select()
        .single();

      if (error) {
        showNotification(error.message, "error");
      } else {
        setMadarsas(prev => [...prev, data]);
        showNotification(t.madarsaAdded, "success");
        setIsModalOpen(false);
      }
    }
  };

  const handleDeleteClick = (id) => {
    // Check if students are assigned to this madarsa
    const assignedStudents = students.filter(s => s.madarsaId === id);
    if (assignedStudents.length > 0) {
      showNotification(t.cannotDeleteMadarsa, "error");
      return;
    }
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const { error } = await supabase
      .from("madarsas")
      .delete()
      .eq("id", deleteConfirmId);

    if (error) {
      showNotification(error.message, "error");
    } else {
      setMadarsas(prev => prev.filter(m => m.id !== deleteConfirmId));
      showNotification(t.madarsaDeleted, "success");
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 sm:pb-0 text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {t.madarsas}
          </h1>
          <p className="text-xs text-slate-500">
            {isRtl ? "مدارسہ جات کی فہرست اور انتظام" : "Manage and list all Madarsas"}
          </p>
        </div>
        
        {isSuperAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-islamic-green-700 hover:bg-islamic-green-800 text-white rounded-xl shadow-md transition-all font-bold text-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.addMadarsa}</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-4' : 'left-4'}`} />
        <input
          type="text"
          placeholder={t.searchMadarsa}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full py-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 transition-all text-slate-900 ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
        />
      </div>

      {/* Madarsas Card List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMadarsas.length > 0 ? (
          filteredMadarsas.map((madarsa) => {
            const studentCount = students.filter(s => s.madarsaId === madarsa.id).length;
            return (
              <div 
                key={madarsa.id}
                className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow animate-scale-in"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-islamic-green-700 rounded-xl border border-emerald-100">
                    <School className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{madarsa.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{madarsa.location}</p>
                    <div className="mt-2">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100/50">
                        {studentCount} {t.studentsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0 self-start">
                    <button
                      onClick={() => handleOpenEdit(madarsa)}
                      className="p-2 bg-slate-50 text-slate-500 hover:text-islamic-green-700 hover:bg-emerald-50 rounded-xl transition-all border border-slate-200/50 cursor-pointer"
                      title={t.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(madarsa.id)}
                      className="p-2 bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-200/50 cursor-pointer"
                      title={t.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white p-8 rounded-[16px] border border-slate-200 shadow-sm text-center text-slate-400">
            <School className="w-12 h-12 mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-semibold">{t.noMadarsasFound}</p>
          </div>
        )}
      </div>

      {/* Add / Edit Drawer - Mobile Bottom Sheet / Desktop Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[16px] shadow-xl overflow-hidden border-t sm:border border-slate-200 animate-scale-in pb-10 sm:pb-4">
            {/* Grab handle for mobile aesthetic */}
            <div className="flex justify-center py-2 sm:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {currentMadarsa ? t.editMadarsa : t.addMadarsa}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t.madarsaNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.madarsaNamePlaceholder}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t.locationLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.locationPlaceholder}
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-islamic-green-700 hover:bg-islamic-green-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer active:scale-95"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Sheet - Mobile Bottom / Desktop Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[24px] sm:rounded-[16px] shadow-xl overflow-hidden border-t sm:border border-slate-200 p-6 text-center space-y-4 animate-scale-in pb-10 sm:pb-6">
            <div className="flex justify-center sm:hidden -mt-4 mb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>
            
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">{t.confirmDeleteTitle}</h3>
              <p className="text-xs text-slate-500">{t.confirmDeleteMessage}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer active:scale-95"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
