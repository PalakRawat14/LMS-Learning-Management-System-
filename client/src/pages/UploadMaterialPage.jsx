import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MaterialUpload from '../components/materials/MaterialUpload';
import { subjectService } from '../services/subjectService';
import LoadingSpinner from '../components/LoadingSpinner';
import { AcademicCapIcon, ArrowUpTrayIcon, ChevronRightIcon, BookOpenIcon } from '@heroicons/react/24/outline';

export default function UploadMaterialPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await subjectService.getAllSubjects();
        const subjectList = Array.isArray(data) ? data : [];
        setSubjects(subjectList);
        if (subjectList.length > 0) setSelectedSubjectId(subjectList[0].id);
      } catch (e) {
        console.error('Error loading subjects for upload page', e);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  // If user is not teacher/admin, redirect back
  if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
          <ArrowUpTrayIcon className="h-4 w-4" />
          Subject Upload Center
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Upload materials to your subjects
        </h1>
        <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
          Pick a subject card below, then attach notes, lecture files, or references for students in that subject.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => {
          const isSelected = selectedSubjectId === subject.id;
          const teacherCount = Array.isArray(subject.teachers) ? subject.teachers.length : (subject.teacherCount || 0);

          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => setSelectedSubjectId(subject.id)}
              className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                isSelected
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-white to-purple-50 shadow-xl shadow-blue-100/60 dark:border-blue-400 dark:from-blue-950/40 dark:via-gray-900 dark:to-purple-950/30'
                  : 'border-gray-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800/80'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-purple-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-start gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                  <BookOpenIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                        {subject.name}
                      </h3>
                      <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                        {subject.code || 'No subject code'}
                      </p>
                    </div>
                    <ChevronRightIcon className={`h-5 w-5 shrink-0 transition-transform ${isSelected ? 'translate-x-1 text-blue-600 dark:text-blue-300' : 'text-gray-300 group-hover:translate-x-1 group-hover:text-blue-500'}`} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {teacherCount} teacher{teacherCount === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                      Upload ready
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {subjects.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400">
            No subjects are assigned yet.
          </div>
        )}
      </div>

      {selectedSubjectId ? (
        <MaterialUpload
          subjectId={selectedSubjectId}
          subjectOptions={subjects}
          onUploadSuccess={() => { /* noop */ }}
          onClose={() => navigate(`/subjects/${selectedSubjectId}`)}
        />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <AcademicCapIcon className="h-5 w-5" />
            <p>You have no subjects to upload materials to. Ask an administrator to assign a subject.</p>
          </div>
        </div>
      )}
    </div>
  );
}
