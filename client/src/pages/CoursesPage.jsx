import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CourseList from '../components/courses/CourseList';
import QuickAssignmentUpload from '../components/assignments/QuickAssignmentUpload';
import { PlusIcon } from '@heroicons/react/24/solid';

const CoursesPage = () => {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="relative">
      <CourseList />
      
      {/* Floating Action Button for Teachers */}
      {isTeacher && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:shadow-xl flex items-center space-x-2 group"
          title="Quick Upload Assignment"
        >
          <PlusIcon className="h-6 w-6" />
          <span className="hidden group-hover:inline-block pr-2 font-medium">
            Upload Assignment
          </span>
        </button>
      )}

      {/* Quick Assignment Upload Modal */}
      <QuickAssignmentUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          // Optionally refresh course list or show success
        }}
      />
    </div>
  );
};

export default CoursesPage;