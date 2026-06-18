import { useState } from "react";
import { Plus, Search, Edit2, Trash2, User, X, AlertCircle, Camera, Upload } from "lucide-react";
import { svgAvatars } from "../data/mockData";
import { supabase } from "../supabaseClient";

export default function Students({ 
  students, 
  setStudents, 
  madarsas, 
  t, 
  isRtl,
  showNotification,
  userProfile
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null); // null for add, object for edit
  const [formData, setFormData] = useState({ name: "", age: "", madarsaId: "", photo: "" });
  const [photoPreview, setPhotoPreview] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Filter students based on search query or assigned madarsa name
  const filteredStudents = students.filter(s => {
    const madarsa = madarsas.find(m => m.id === s.madarsaId);
    const madarsaName = madarsa ? madarsa.name : "";
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      madarsaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.age.toString().includes(searchQuery)
    );
  });

  const handleOpenAdd = () => {
    setCurrentStudent(null);
    setFormData({ name: "", age: "", madarsaId: madarsas[0]?.id || "", photo: "" });
    setPhotoPreview("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setCurrentStudent(student);
    setFormData({ 
      name: student.name, 
      age: student.age, 
      madarsaId: student.madarsaId, 
      photo: student.photo 
    });
    setPhotoPreview(student.photo);
    setIsModalOpen(true);
  };

  // Image Upload and Compression
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Draw image onto canvas to compress
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with lower quality (0.7)
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        setFormData(prev => ({ ...prev, photo: compressedBase64 }));
        setPhotoPreview(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const base64ToBlob = (base64, mimeType = "image/jpeg") => {
    const byteString = atob(base64.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  };

  const uploadStudentPhoto = async (base64Data, madarsaId, studentName) => {
    if (!base64Data) return null;
    if (base64Data.startsWith("data:image/svg+xml")) {
      return base64Data;
    }
    if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
      return base64Data;
    }

    try {
      const blob = base64ToBlob(base64Data);
      const fileExt = "jpg";
      const fileName = `${studentName.replace(/\s+/g, "_")}_${Date.now()}.${fileExt}`;
      const filePath = `${madarsaId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("student-photos")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("student-photos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error("Error uploading photo:", err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.age || !formData.madarsaId) return;

    let finalPhoto = formData.photo;
    if (!finalPhoto) {
      const randomIdx = Math.floor(Math.random() * svgAvatars.length);
      finalPhoto = svgAvatars[randomIdx];
    }

    showNotification(isRtl ? "طالب علم کا ریکارڈ محفوظ ہو رہا ہے..." : "Saving student record...", "info");

    const photoUrl = await uploadStudentPhoto(finalPhoto, formData.madarsaId, formData.name.trim());

    if (currentStudent) {
      // Edit mode
      const { data, error } = await supabase
        .from("students")
        .update({
          name: formData.name.trim(),
          age: parseInt(formData.age),
          madarsa_id: formData.madarsaId,
          photo_url: photoUrl
        })
        .eq("id", currentStudent.id)
        .select()
        .single();

      if (error) {
        showNotification(error.message, "error");
      } else {
        const updatedMapped = {
          id: data.id,
          name: data.name,
          age: data.age,
          madarsaId: data.madarsa_id,
          photo: data.photo_url
        };
        setStudents(prev => prev.map(s => s.id === currentStudent.id ? updatedMapped : s));
        showNotification(t.studentUpdated, "success");
        setIsModalOpen(false);
      }
    } else {
      // Add mode
      const { data, error } = await supabase
        .from("students")
        .insert([{
          name: formData.name.trim(),
          age: parseInt(formData.age),
          madarsa_id: formData.madarsaId,
          photo_url: photoUrl
        }])
        .select()
        .single();

      if (error) {
        showNotification(error.message, "error");
      } else {
        const newStudentMapped = {
          id: data.id,
          name: data.name,
          age: data.age,
          madarsaId: data.madarsa_id,
          photo: data.photo_url
        };
        setStudents(prev => [...prev, newStudentMapped]);
        showNotification(t.studentAdded, "success");
        setIsModalOpen(false);
      }
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", deleteConfirmId);

    if (error) {
      showNotification(error.message, "error");
    } else {
      setStudents(prev => prev.filter(s => s.id !== deleteConfirmId));
      showNotification(t.studentDeleted, "success");
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 sm:pb-0 text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {t.students}
          </h1>
          <p className="text-xs text-slate-500">
            {isRtl ? "طلباء کی فہرست اور انتظام" : "Manage and list all students"}
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-islamic-green-700 hover:bg-islamic-green-800 text-white rounded-xl shadow-md transition-all font-bold text-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.addStudent}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRtl ? 'right-4' : 'left-4'}`} />
        <input
          type="text"
          placeholder={t.searchStudent}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full py-3 bg-white border border-slate-200 rounded-xl shadow-xs text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 transition-all text-slate-900 ${isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left'}`}
        />
      </div>

      {/* Students Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const madarsa = madarsas.find(m => m.id === student.madarsaId);
            return (
              <div 
                key={student.id}
                className="bg-white p-4 rounded-[16px] border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow animate-scale-in"
              >
                <div className="flex items-center gap-3">
                  {/* Photo Container */}
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner shrink-0">
                    {student.photo ? (
                      <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  
                  <div className="text-left">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      {student.name}
                    </h3>
                    <p className="text-xs text-islamic-green-700 font-bold mt-0.5">
                      {madarsa ? madarsa.name : "Unassigned"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {t.ageText}: {student.age} {isRtl ? t.yearsOld : ""}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-start">
                  <button
                    onClick={() => handleOpenEdit(student)}
                    className="p-2 bg-slate-50 text-slate-500 hover:text-islamic-green-700 hover:bg-emerald-50 rounded-xl transition-all border border-slate-200/50 cursor-pointer"
                    title={t.edit}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(student.id)}
                    className="p-2 bg-slate-50 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-slate-200/50 cursor-pointer"
                    title={t.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white p-8 rounded-[16px] border border-slate-200 shadow-sm text-center text-slate-400">
            <User className="w-12 h-12 mx-auto text-slate-200 mb-2" />
            <p className="text-sm font-semibold">{t.noStudentsFound}</p>
          </div>
        )}
      </div>

      {/* Add / Edit Student Drawer - Mobile Bottom Sheet / Desktop Modal */}
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
                {currentStudent ? t.editStudent : t.addStudent}
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
              
              {/* Photo Upload Preview */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-slate-250 bg-slate-50 flex items-center justify-center shadow-inner group">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                  
                  <label htmlFor="student-photo-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </label>
                </div>
                
                <label 
                  htmlFor="student-photo-upload" 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 rounded-lg cursor-pointer border border-slate-200 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoPreview ? t.changePhoto : t.choosePhoto}</span>
                </label>
                <input 
                  type="file" 
                  id="student-photo-upload"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden" 
                />
              </div>

              {/* Student Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {t.studentNameLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.studentNamePlaceholder}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Student Age */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {t.ageLabel}
                  </label>
                  <input
                    type="number"
                    required
                    min="4"
                    max="30"
                    placeholder={t.agePlaceholder}
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
                  />
                </div>

                {/* Assigned Madarsa */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {t.selectMadarsaLabel}
                  </label>
                  <select
                    value={formData.madarsaId}
                    onChange={(e) => setFormData(prev => ({ ...prev, madarsaId: e.target.value }))}
                    className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-islamic-green-700 text-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}
                  >
                    {madarsas.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
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
