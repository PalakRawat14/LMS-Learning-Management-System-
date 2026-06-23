import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { ArrowPathIcon, PaperClipIcon, FolderOpenIcon } from '@heroicons/react/24/outline';

const AttachExistingFileModal = ({ isOpen, onClose, onAttached }) => {
  const [assignmentType, setAssignmentType] = useState('subject');
  const [assignments, setAssignments] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [selectedFilename, setSelectedFilename] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [filesRes, assignmentsRes] = await Promise.all([
        api.get('/admin/uploads'),
        api.get(`/admin/assignments?type=${assignmentType}`)
      ]);

      const nextAssignments = assignmentType === 'course'
        ? (assignmentsRes.data?.courseAssignments || [])
        : (assignmentsRes.data?.subjectAssignments || []);

      setUploadFiles(filesRes.data?.files || []);
      setAssignments(nextAssignments);
      setSelectedAssignmentId((current) => current || String(nextAssignments[0]?.id || ''));
    } catch (err) {
      console.error('Load attach modal data error:', err);
      setError(err.response?.data?.message || 'Failed to load uploads and assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, assignmentType]);

  useEffect(() => {
    if (!selectedFilename) {
      setDisplayName('');
      return;
    }
    setDisplayName(selectedFilename);
  }, [selectedFilename]);

  const filteredFiles = useMemo(() => {
    const query = fileSearch.trim().toLowerCase();
    if (!query) return uploadFiles;
    return uploadFiles.filter((file) => file.filename.toLowerCase().includes(query));
  }, [uploadFiles, fileSearch]);

  const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resetAndClose = () => {
    setError('');
    setFileSearch('');
    setSelectedFilename('');
    setDisplayName('');
    onClose();
  };

  const handleAttach = async (e) => {
    e.preventDefault();

    if (!selectedAssignmentId) {
      setError('Select an assignment first');
      return;
    }

    if (!selectedFilename) {
      setError('Select a file from uploads first');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await api.post(
        `/admin/assignments/${assignmentType}/${selectedAssignmentId}/attach-existing`,
        {
          filename: selectedFilename,
          originalName: displayName?.trim() || selectedFilename
        }
      );

      onAttached?.(response.data?.message || 'File attached successfully');
      resetAndClose();
    } catch (err) {
      console.error('Attach file error:', err);
      setError(err.response?.data?.message || 'Failed to attach selected file');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Attach Existing Upload</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pick an assignment and attach any file already in the server uploads folder.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleAttach} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignment Type
              </label>
              <select
                value={assignmentType}
                onChange={(e) => {
                  setAssignmentType(e.target.value);
                  setSelectedAssignmentId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="subject">Subject Assignment</option>
                <option value="course">Course Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignment
              </label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {assignments.length === 0 ? (
                  <option value="">No assignments available</option>
                ) : (
                  assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title} ({assignment.containerCode || 'N/A'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File From Uploads
            </label>

            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search filename..."
              className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />

            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {filteredFiles.length === 0 ? (
                <div className="p-5 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <FolderOpenIcon className="w-5 h-5" />
                  No upload files found.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredFiles.map((file) => (
                    <li key={file.filename}>
                      <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <input
                          type="radio"
                          name="selected-upload-file"
                          checked={selectedFilename === file.filename}
                          onChange={() => setSelectedFilename(file.filename)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <PaperClipIcon className="w-4 h-4 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-white truncate">{file.filename}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatSize(file.size)} • {new Date(file.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Name students will see when downloading"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Attaching...' : 'Attach File'}
            </button>
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttachExistingFileModal;
