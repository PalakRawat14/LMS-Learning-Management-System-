import React, { useState, useEffect } from 'react';
import { XMarkIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { courseService } from '../../services/courseService';
import { assignmentService } from '../../services/assignmentService';
import { subjectService } from '../../services/subjectService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const QuickAssignmentUpload = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    totalPoints: 100
  });

  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [targetType, setTargetType] = useState('course'); // 'course' or 'subject'

  useEffect(() => {
    if (isOpen) {
      fetchMyCourses();
    }
  }, [isOpen]);

  useEffect(() => {
    let mounted = true;
    const fetchSubjects = async () => {
      if (isOpen && (user?.role === 'teacher' || user?.role === 'instructor')) {
        try {
          const subs = await subjectService.getAllSubjects();
          if (mounted) {
            setTeacherSubjects(Array.isArray(subs) ? subs : []);
            if (Array.isArray(subs) && subs.length > 0 && !selectedSubject) {
              setSelectedSubject(subs[0].id);
            }
          }
        } catch (e) {
          if (mounted) setTeacherSubjects([]);
        }
      }
    };
    fetchSubjects();
    return () => { mounted = false; };
  }, [isOpen, user]);

  const fetchMyCourses = async () => {
    try {
      const response = await courseService.getMyCourses();
      const nextCourses = Array.isArray(response) ? response : [];
      setCourses(nextCourses);
      if (nextCourses.length > 0 && !selectedCourse) {
        setSelectedCourse(nextCourses[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load your courses');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (targetType === 'subject' && !selectedSubject) {
      toast.error('Please select a subject');
      return;
    }

    if (targetType === 'course' && !selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    setLoading(true);

    try {
      const assignmentData = new FormData();
      assignmentData.append('title', formData.title);
      assignmentData.append('description', formData.description);
      assignmentData.append('dueDate', formData.dueDate);
      assignmentData.append('totalPoints', formData.totalPoints);

      files.forEach(file => assignmentData.append('files', file));

      if (targetType === 'subject') {
        await subjectService.createAssignment(selectedSubject, assignmentData);
      } else {
        assignmentData.append('courseId', selectedCourse);
        await assignmentService.createAssignment(assignmentData);
      }

      toast.success('Assignment created successfully!');

      setFormData({ title: '', description: '', dueDate: '', totalPoints: 100 });
      setFiles([]);
      setSelectedCourse('');
      setSelectedSubject('');

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <DocumentArrowUpIcon className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
              Quick Upload Assignment
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {user?.role === 'teacher' || user?.role === 'instructor' ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTargetType('subject')}
                  className={`px-3 py-1 rounded-md ${targetType === 'subject' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  Subject
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('course')}
                  className={`px-3 py-1 rounded-md ${targetType === 'course' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  Course
                </button>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {targetType === 'subject' ? 'Select Subject *' : 'Select Course *'}
              </label>

              {targetType === 'subject' ? (
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Choose a subject...</option>
                  {teacherSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code ? `${s.code} - ${s.name}` : s.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{`${course.code} - ${course.title}`}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignment Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Week 5 Homework"
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="Provide assignment instructions (optional)..."
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Points *</label>
                <input
                  type="number"
                  value={formData.totalPoints}
                  onChange={(e) => setFormData({ ...formData, totalPoints: parseInt(e.target.value) })}
                  required
                  min="1"
                  max="1000"
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attach Files (Max 5)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload files</span>
                      <input type="file" multiple onChange={handleFileChange} className="sr-only" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC, DOCX, TXT, images up to 10MB each</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <button type="button" onClick={() => removeFile(index)} className="text-red-600 hover:text-red-700 dark:text-red-400">
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t dark:border-gray-700">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Creating...' : 'Create Assignment'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickAssignmentUpload;
