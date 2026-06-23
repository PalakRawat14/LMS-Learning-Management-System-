import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import materialService from '../../services/materialService';
import ConfirmDialog from '../ConfirmDialog';

export default function MaterialList({ courseId, teacherId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const { user } = useAuth();

  const isTeacherOrAdmin = user && (user.id === teacherId || user.role === 'admin' || user.role === 'teacher');
  const cardRefs = useRef([]);

  useEffect(() => {
    fetchMaterials();
  }, [courseId, filterType]);

  useLayoutEffect(() => {
    if (cardRefs.current) {
      cardRefs.current.forEach((el, i) => {
        if (el) {
          el.style.opacity = 0;
          el.style.transform = 'translateY(40px) scale(0.98)';
          setTimeout(() => {
            el.style.transition = 'opacity 0.5s cubic-bezier(.4,2,.6,1), transform 0.5s cubic-bezier(.4,2,.6,1)';
            el.style.opacity = 1;
            el.style.transform = 'translateY(0) scale(1)';
          }, 80 * i);
        }
      });
    }
  }, [materials]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialService.getCourseMaterials(
        courseId, 
        filterType === 'all' ? null : filterType
      );
      setMaterials(data);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (material) => {
    try {
      await materialService.downloadMaterial(material.id, material.originalName);
      toast.success('Download started');
      // Refresh the list to update download count
      fetchMaterials();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  // Confirm dialog state for deleting materials
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null); // material object

  const handleDelete = (material) => {
    // open confirm dialog
    setToDelete(material);
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!toDelete) return;
    try {
      await materialService.deleteMaterial(toDelete.id);
      toast.success('Material deleted successfully');
      // refresh list
      fetchMaterials();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete material');
    } finally {
      setConfirmOpen(false);
      setToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading materials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-4">
        {[
          { key: 'all', label: 'All Materials', icon: '📚' },
          { key: 'notes', label: 'Notes', icon: '📝' },
          { key: 'assignment', label: 'Assignments', icon: '📋' },
          { key: 'lecture', label: 'Lectures', icon: '🎓' },
          { key: 'reference', label: 'References', icon: '📖' },
          { key: 'other', label: 'Other', icon: '📁' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 ${
              filterType === tab.key
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="text-center py-16">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-2xl opacity-20" />
            <div className="relative text-8xl">📁</div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No materials found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {filterType === 'all' 
              ? 'No materials have been uploaded yet. Check back later or contact your instructor.'
              : `No ${filterType} materials have been uploaded yet.`
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material, idx) => {
            const daysUntilDue = getDaysUntilDue(material.dueDate);
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
            const isDueSoon = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0;

            return (
              <div
                key={material.id}
                ref={el => cardRefs.current[idx] = el}
                className="group relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-3 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                style={{ willChange: 'opacity, transform' }}
              >
                {/* Animated gradient background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Decorative blur orbs */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
                
                {/* Top colored strip based on type with shimmer effect */}
                <div className={`absolute top-0 left-0 right-0 h-2 overflow-hidden ${
                  material.type === 'assignment' ? 'bg-gradient-to-r from-red-500 via-red-400 to-red-600' :
                  material.type === 'notes' ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600' :
                  material.type === 'lecture' ? 'bg-gradient-to-r from-green-500 via-green-400 to-green-600' :
                  material.type === 'reference' ? 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600' :
                  'bg-gradient-to-r from-gray-500 via-gray-400 to-gray-600'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </div>
                
                {/* Content */}
                <div className="relative p-6 flex flex-col h-full">
                  {/* Icon and Title Section */}
                  <div className="flex items-start gap-4 mb-5">
                    {/* Icon with gradient background and floating animation */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center text-white text-4xl shadow-xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
                        <div className="absolute inset-0 bg-white/20 rounded-2xl animate-ping opacity-0 group-hover:opacity-75" />
                        <span className="relative z-10">{materialService.getFileIcon(material.mimeType, material.fileExtension)}</span>
                      </div>
                    </div>
                    
                    {/* Title and Type */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-pink-600 transition-all duration-300">
                        {material.title}
                      </h4>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg ${materialService.getTypeColor(material.type)} shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${
                        material.type === 'assignment' ? 'ring-red-500/20' :
                        material.type === 'notes' ? 'ring-blue-500/20' :
                        material.type === 'lecture' ? 'ring-green-500/20' :
                        material.type === 'reference' ? 'ring-purple-500/20' :
                        'ring-gray-500/20'
                      } group-hover:scale-110 transition-transform duration-300`}>
                        <span className="text-base">
                          {material.type === 'assignment' ? '📋' :
                           material.type === 'notes' ? '📝' :
                           material.type === 'lecture' ? '🎓' :
                           material.type === 'reference' ? '📚' : '📁'}
                        </span>
                        {material.type.charAt(0).toUpperCase() + material.type.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* File Details */}
                  <div className="space-y-3 mb-5 flex-1">
                    {/* File name with tooltip */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-gray-700 dark:text-gray-200 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors duration-300">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Filename</p>
                        <p className="truncate font-semibold" title={material.originalName}>{material.originalName}</p>
                      </div>
                    </div>
                    
                    {/* File size and downloads in cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-amber-700 dark:text-amber-300">Size</p>
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">{materialService.formatFileSize(material.fileSize)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">Views</p>
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{material.downloadCount}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Due Date with enhanced styling */}
                    {material.dueDate && (
                      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${
                        isOverdue 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white ring-red-500/30 animate-pulse'
                          : isDueSoon
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white ring-yellow-500/30'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white ring-green-500/30'
                      }`}>
                        <div className="flex-shrink-0 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium opacity-90">
                            {isOverdue ? '⚠️ Deadline Passed' : isDueSoon ? '⏰ Coming Soon' : '✓ Scheduled'}
                          </p>
                          <p className="text-sm font-bold">
                            {isOverdue 
                              ? 'Overdue'
                              : daysUntilDue === 0
                              ? 'Due Today!'
                              : `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`
                            }
                          </p>
                        </div>
                      </div>
                    )}
                    </div>

                  {/* Action Buttons with enhanced design */}
                  <div className="flex gap-3 mt-auto pt-5 border-t-2 border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleDownload(material)}
                      className="relative flex-1 flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 hover:from-blue-700 hover:via-blue-700 hover:to-purple-700 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      <svg className="w-5 h-5 relative z-10 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="relative z-10">Download</span>
                    </button>

                    {isTeacherOrAdmin && material.uploadedBy === user.id && (
                      <button
                        onClick={() => handleDelete(material)}
                        className="relative flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 overflow-hidden group"
                        title="Delete material"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                        <svg className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Confirm dialog for delete action */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToDelete(null); }}
        onConfirm={performDelete}
        title="Delete material"
        message={
          `Are you sure you want to delete "${toDelete?.title || toDelete?.originalName || ''}"?\nThis action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}