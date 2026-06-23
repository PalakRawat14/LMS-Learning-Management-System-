import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subjectService } from '../services/subjectService';
import { ArrowDownTrayIcon, ChevronRightIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const StudentMaterialsPage = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getSubjectMaterialsForStudent();
      setMaterials(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (material) => {
    const token = localStorage.getItem('token');
    const url = `${subjectService.downloadMaterial(material.id)}?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = material.originalName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const grouped = {};
  materials.forEach(m => {
    const subjectName = m.Subject?.name || 'Unknown Subject';
    if (!grouped[subjectName]) grouped[subjectName] = { subject: m.Subject, items: [] };
    grouped[subjectName].items.push(m);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">Study Materials</h1>
        <p className="text-blue-100 mt-1">Access materials across all your subjects</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg">No study materials available yet.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([subjectName, group]) => (
          <div key={subjectName} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{subjectName}</h2>
              {group.subject?.id && (
                <Link to={`/subjects/${group.subject.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  View Subject <ChevronRightIcon className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.items.map(m => (
                <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{m.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {m.originalName} &middot; {(m.fileSize / 1024).toFixed(1)} KB
                      {m.uploader && <span> &middot; by {m.uploader.firstName} {m.uploader.lastName}</span>}
                    </p>
                    {m.description && <p className="text-xs text-gray-400 mt-1">{m.description}</p>}
                  </div>
                  <button onClick={() => handleDownload(m)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-shrink-0" title="Download">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentMaterialsPage;
