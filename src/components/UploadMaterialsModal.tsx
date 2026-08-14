import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  FileCheck, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  BookOpen, 
  FileCode,
  Sparkles,
  ArrowRight,
  Loader2,
  FileCheck2
} from 'lucide-react';
import { Course, CourseMaterial, MaterialType } from '../types';

interface UploadMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onAddMaterial: (material: CourseMaterial) => void;
  onDeleteMaterial: (materialId: string) => void;
  onOpenAnalyzeModal?: () => void;
}

export const UploadMaterialsModal: React.FC<UploadMaterialsModalProps> = ({
  isOpen,
  onClose,
  course,
  onAddMaterial,
  onDeleteMaterial,
  onOpenAnalyzeModal,
}) => {
  const [selectedType, setSelectedType] = useState<MaterialType>('lecture_slide');
  const [customTitle, setCustomTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const materialTypeOptions: { type: MaterialType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'syllabus', label: 'Course Syllabus PDF', icon: <BookOpen className="w-4 h-4" />, desc: 'Official RUET syllabus PDF or course outline' },
    { type: 'lecture_slide', label: 'Lecture Slides PDF', icon: <Layers className="w-4 h-4" />, desc: 'Teacher lecture slide decks in PDF' },
    { type: 'ct_question', label: 'Class Test (CT) PDF', icon: <FileCheck className="w-4 h-4" />, desc: 'Previous years CT questions & solutions' },
    { type: 'handwritten_note', label: 'Class Notes PDF', icon: <FileText className="w-4 h-4" />, desc: 'Student class notes and summary PDFs' },
    { type: 'term_final_question', label: 'Term Final PDF', icon: <FileCode className="w-4 h-4" />, desc: 'Semester final question bank archive PDF' },
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processSingleFile = (file: File): Promise<CourseMaterial> => {
    return new Promise((resolve, reject) => {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      if (!isPdf) {
        reject(new Error(`"${file.name}" is not a PDF file. Please upload PDF course materials.`));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = typeof reader.result === 'string' ? reader.result : '';
        const sizeFormatted = formatFileSize(file.size);
        const autoTitle = file.name.replace(/\.[^/.]+$/, '');

        const newMaterial: CourseMaterial = {
          id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          courseId: course.id,
          title: customTitle.trim() || autoTitle,
          fileName: file.name,
          fileType: selectedType,
          fileSize: sizeFormatted,
          rawSizeBytes: file.size,
          base64Data: base64Data,
          mimeType: 'application/pdf',
          uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: 'ready_for_analysis',
        };

        resolve(newMaterial);
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read "${file.name}"`));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleMultipleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessingFiles(true);
    setErrorMessage(null);

    const addedMaterials: CourseMaterial[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const material = await processSingleFile(file);
        onAddMaterial(material);
        addedMaterials.push(material);
      } catch (err: any) {
        errors.push(err.message || `Error processing ${file.name}`);
      }
    }

    setIsProcessingFiles(false);
    setCustomTitle('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (addedMaterials.length > 0) {
      const msg = addedMaterials.length === 1
        ? `Uploaded "${addedMaterials[0].fileName}" successfully!`
        : `Uploaded ${addedMaterials.length} PDF files successfully!`;
      setUploadSuccessMessage(msg);
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join('. '));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  };

  const getBadgeForType = (type: MaterialType) => {
    switch (type) {
      case 'syllabus':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'lecture_slide':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ct_question':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'handwritten_note':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'term_final_question':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleAnalyzeClick = () => {
    onClose();
    if (onOpenAnalyzeModal) {
      onOpenAnalyzeModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="upload-materials-modal-card"
        className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Upload PDF Course Materials</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  {course.code}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload one or multiple PDF files (syllabus, lecture slides, CT archives) for AI analysis.
              </p>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Success Banner */}
          {uploadSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Select Material Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Document Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {materialTypeOptions.map((option) => (
                <button
                  key={option.type}
                  id={`material-type-opt-${option.type}`}
                  type="button"
                  onClick={() => setSelectedType(option.type)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    selectedType === option.type
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    selectedType === option.type ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {option.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{option.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{option.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Title Input */}
          <div>
            <label htmlFor="material-title-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              2. Custom Title / Chapter Label (Optional)
            </label>
            <input
              id="material-title-input"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Chapter 3: Normalization Lecture Slides (Leaves default if empty)"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Step 3: Drag & Drop Zone with Multiple PDF support */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                3. Upload PDF Files (One or Multiple)
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                PDF Format Supported
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
            />
            <div
              id="drop-zone-area"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                {isProcessingFiles ? (
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-800">
                {isProcessingFiles ? 'Reading & encoding PDF files...' : 'Click to browse or drag and drop PDF files here'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                You can select multiple PDF slides, syllabus documents, or CT archives simultaneously.
              </p>
            </div>
          </div>

          {/* Step 4: Display Uploaded Filenames List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Uploaded Filenames for {course.code}
                </label>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                  {course.materials.length} {course.materials.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Staged for Server AI Processing</span>
              </span>
            </div>

            {course.materials.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 bg-slate-50/60">
                <p>No PDF materials uploaded yet for this course.</p>
                <p className="text-[11px] text-slate-400 mt-1">Upload lecture slides or syllabus above to enable course analysis.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {course.materials.map((mat) => (
                  <div
                    key={mat.id}
                    id={`uploaded-file-row-${mat.id}`}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                        PDF
                      </div>
                      <div className="min-w-0">
                        {/* Real File Name Display */}
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate font-mono" title={mat.fileName}>
                            {mat.fileName}
                          </h4>
                          {mat.title && mat.title !== mat.fileName && (
                            <span className="text-[10px] text-slate-500 font-sans truncate">
                              ({mat.title})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${getBadgeForType(mat.fileType)}`}>
                            {mat.fileType.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {mat.fileSize} • Uploaded {mat.uploadDate}
                          </span>
                          <span className="text-[9px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <FileCheck2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Ready</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      id={`delete-material-${mat.id}`}
                      onClick={() => onDeleteMaterial(mat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Direct Analyze Course Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Gemini API processes PDF materials strictly on the server</span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="done-upload-modal-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Done
            </button>

            {/* Analyze Course Button */}
            <button
              id="modal-analyze-course-btn"
              onClick={handleAnalyzeClick}
              disabled={course.materials.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                course.materials.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyze Course</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

