import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/courseService';
import materialService from '../services/materialService';

export default function UploadDiagnosticPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [testFile, setTestFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadCourses();
    }
  }, [user]);

  const loadCourses = async () => {
    try {
      const data = await courseService.getMyCourses();
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const handleTest = async () => {
    if (!selectedCourse || !testFile) {
      setResult({ error: 'Please select a course and file' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await materialService.uploadMaterial(
        selectedCourse,
        {
          title: 'Test Upload ' + new Date().toISOString(),
          type: 'notes'
        },
        testFile
      );

      setResult({ 
        success: true, 
        message: 'Upload successful!',
        data: response
      });
    } catch (error) {
      console.error('Upload error:', error);
      setResult({ 
        error: error.response?.data?.message || error.message,
        debug: error.response?.data?.debug,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Not Logged In</h1>
          <p className="text-gray-700 dark:text-gray-300">Please login first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* User Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-4">
            👤 Your Account
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-blue-800 dark:text-blue-200">User ID:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">{user.id}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-800 dark:text-blue-200">Role:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">{user.role}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-blue-800 dark:text-blue-200">Email:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">{user.email}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-blue-800 dark:text-blue-200">Name:</span>
              <span className="ml-2 text-blue-900 dark:text-blue-100">
                {user.firstName} {user.lastName}
              </span>
            </div>
          </div>
        </div>

        {/* Courses Info */}
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-green-900 dark:text-green-100 mb-4">
            📚 Your Courses ({courses.length})
          </h2>
          {courses.length === 0 ? (
            <p className="text-green-700 dark:text-green-300">
              No courses found. {user.role === 'teacher' ? 'You need to be assigned to a course first.' : 'You are not enrolled in any courses.'}
            </p>
          ) : (
            <div className="space-y-2">
              {courses.map(course => (
                <div key={course.id} className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    {course.title} ({course.code})
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Course ID: {course.id} | Teacher ID: {course.teacherId}
                    {user.id === course.teacherId && (
                      <span className="ml-2 text-green-600 dark:text-green-400 font-bold">
                        ✅ YOU ARE THE TEACHER
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            🧪 Test Upload
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">-- Select a course --</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} (ID: {course.id})
                    {user.id === course.teacherId ? ' ✅ YOUR COURSE' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File
              </label>
              <input
                type="file"
                onChange={(e) => setTestFile(e.target.files[0])}
                className="block w-full text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700 p-2"
              />
              {testFile && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {testFile.name} ({(testFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              onClick={handleTest}
              disabled={loading || !selectedCourse || !testFile}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Uploading...' : 'Test Upload'}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg p-6 ${
            result.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700'
          }`}>
            <h3 className={`text-lg font-bold mb-3 ${
              result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
            }`}>
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            
            <div className={`text-sm ${
              result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
            }`}>
              {result.success ? (
                <div>
                  <p className="font-semibold">{result.message}</p>
                  <pre className="mt-2 p-3 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div>
                  <p className="font-semibold mb-2">Error Message:</p>
                  <p className="mb-3">{result.error}</p>
                  
                  {result.status && (
                    <p className="mb-2">Status Code: {result.status}</p>
                  )}
                  
                  {result.debug && (
                    <div className="mt-3">
                      <p className="font-semibold mb-2">Debug Info:</p>
                      <pre className="p-3 bg-white dark:bg-gray-800 rounded text-xs overflow-auto">
                        {JSON.stringify(result.debug, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
