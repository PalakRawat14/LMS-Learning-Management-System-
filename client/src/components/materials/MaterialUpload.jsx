import { useEffect, useMemo, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import materialService from '../../services/materialService';
import { subjectService } from '../../services/subjectService';
import { InputField } from '../forms/InputField';

const uploadSchema = Yup.object().shape({
  title: Yup.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .required('Title is required'),
  type: Yup.string()
    .oneOf(['notes', 'lecture', 'reference', 'other'], 'Invalid type')
    .required('Type is required')
});

const getFileIcon = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  
  const iconMap = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    ppt: '📊',
    pptx: '📊',
    xls: '📗',
    xlsx: '📗',
    txt: '📃',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎥',
    avi: '🎥',
    mov: '🎥',
    zip: '🗜️',
    rar: '🗜️'
  };
  
  return iconMap[ext] || '📎';
};

const materialTypeOptions = [
  { value: 'notes', label: 'Notes', icon: '📝', color: 'from-blue-500 to-blue-600' },
  { value: 'lecture', label: 'Lecture Material', icon: '🎓', color: 'from-purple-500 to-purple-600' },
  { value: 'reference', label: 'Reference', icon: '📚', color: 'from-green-500 to-green-600' },
  { value: 'other', label: 'Other', icon: '📎', color: 'from-gray-500 to-gray-600' }
];

export default function MaterialUpload({ courseId, subjectId, subjectOptions = [], onUploadSuccess, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeSubjectId, setActiveSubjectId] = useState(subjectId || subjectOptions?.[0]?.id || null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);

  useEffect(() => {
    setActiveSubjectId(subjectId || subjectOptions?.[0]?.id || null);
  }, [subjectId, subjectOptions]);

  useEffect(() => {
    if (subjectOptions?.length > 0 && activeSubjectId) {
      setSubjectMenuOpen(false);
    }
  }, [activeSubjectId, subjectOptions]);

  const activeSubject = useMemo(
    () => subjectOptions.find((subject) => String(subject.id) === String(activeSubjectId)),
    [subjectOptions, activeSubjectId]
  );

  const filteredSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();
    if (!query) return subjectOptions;

    return subjectOptions.filter((subject) => {
      const name = String(subject.name || '').toLowerCase();
      const code = String(subject.code || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [subjectOptions, subjectSearch]);

  const handleFileSelect = (file) => {
    if (file && file.size <= 50 * 1024 * 1024) { // 50MB limit
      setSelectedFile(file);
    } else {
      toast.error('File size must be less than 50MB');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    console.log('[UPLOAD] Starting upload to course:', courseId);
    console.log('[UPLOAD] Form values:', values);
    console.log('[UPLOAD] File:', selectedFile.name, selectedFile.size);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('type', values.type || 'notes');
      formData.append('file', selectedFile);

      if (activeSubjectId) {
        await subjectService.uploadMaterial(activeSubjectId, formData);
      } else {
        // legacy course upload (materialService wraps formData differently)
        await materialService.uploadMaterial(courseId, values, selectedFile);
      }
      toast.success('Material uploaded successfully!');
      onUploadSuccess && onUploadSuccess();
      onClose && onClose();
    } catch (error) {
      console.error('Upload error:', error);
      
      // Show error message
      const errorMessage = error.response?.data?.message || 'Failed to upload material';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 animate-fadeIn">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-t-2xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                  Upload Material
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Share resources with your students
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all text-white hover:rotate-90 duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <Formik
          initialValues={{
            title: '',
            type: 'notes'
          }}
          validationSchema={uploadSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched, values }) => (
            <Form className="p-6 space-y-6">
              {subjectOptions?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Select Subject</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Choose the subject this upload should belong to.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => setSubjectMenuOpen((open) => !open)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Current subject</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {activeSubject?.name || 'Select a subject'}
                          </span>
                          {activeSubject?.code && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                              {activeSubject.code}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        <svg
                          className={`h-4 w-4 transition-transform ${subjectMenuOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {subjectMenuOpen && (
                      <div className="border-t border-gray-200 p-3 dark:border-gray-700">
                        <div className="relative">
                          <input
                            type="text"
                            value={subjectSearch}
                            onChange={(e) => setSubjectSearch(e.target.value)}
                            placeholder="Search subject name or code..."
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          <svg className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                          </svg>
                        </div>

                        <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                          <div className="space-y-2">
                            {filteredSubjects.map((subject) => {
                              const selected = String(activeSubjectId) === String(subject.id);
                              return (
                                <button
                                  key={subject.id}
                                  type="button"
                                  onClick={() => setActiveSubjectId(subject.id)}
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${
                                    selected
                                      ? 'border-blue-500 bg-blue-50 shadow-md dark:border-blue-400 dark:bg-blue-900/20'
                                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{subject.name}</p>
                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{subject.code || 'No code'}</p>
                                  </div>
                                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>
                                    {selected ? '✓' : '•'}
                                  </div>
                                </button>
                              );
                            })}
                            {filteredSubjects.length === 0 && (
                              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                                No subjects match “{subjectSearch}”.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Upload Area */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Select File <span className="text-red-500">*</span>
                </label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ${
                    dragActive
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/30 dark:via-purple-900/20 dark:to-pink-900/20 scale-105'
                      : selectedFile 
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.zip,.rar"
                  />
                  
                  {!selectedFile ? (
                    <div className="text-center">
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform">
                          <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                        Drop your file here, or <span className="text-blue-600 dark:text-blue-400">browse</span>
                      </p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Supports: PDF, Word, PowerPoint, Excel, Images, Videos, Archives
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        Maximum file size: 50MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
                        <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
                          <span className="text-4xl">{getFileIcon(selectedFile.name)}</span>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                        <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {materialService.formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedFile(null);
                        }}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove File
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Material Details */}
              <div className="space-y-5">
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Material Title <span className="text-red-500">*</span>
                  </label>
                  <Field
                    name="title"
                    type="text"
                    placeholder="e.g., Chapter 5 Notes, Lecture Slides..."
                    className={`block w-full px-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none transition-all ${
                      errors.title && touched.title
                        ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/20'
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
                    }`}
                  />
                  {errors.title && touched.title && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Material Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {materialTypeOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          values.type === option.value
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/20 shadow-lg scale-105'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <Field
                          type="radio"
                          name="type"
                          value={option.value}
                          className="sr-only"
                        />
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${option.color}`}>
                          <span className="text-2xl">{option.icon}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {option.label}
                          </p>
                        </div>
                        {values.type === option.value && (
                          <div className="absolute top-2 right-2">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Uploading...</span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedFile}
                  className="relative px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:transform-none overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Material
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}