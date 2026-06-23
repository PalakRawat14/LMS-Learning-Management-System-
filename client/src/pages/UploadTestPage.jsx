import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function UploadTestPage() {
  const { user } = useAuth();
  const [courseId, setCourseId] = useState('1');
  const [title, setTitle] = useState('Test Material');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const testUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('title', title);
      formData.append('type', 'notes');
      formData.append('description', 'Test upload from diagnostic page');
      formData.append('file', file);

      const token = localStorage.getItem('token');

      const res = await fetch('http://localhost:5000/api/materials/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data
      });

      if (res.ok) {
        toast.success('✅ Upload successful!');
      } else {
        toast.error(`❌ Upload failed: ${data.message}`);
      }

      console.log('📥 Response:', { status: res.status, data });
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error('Upload failed: ' + error.message);
      setResponse({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ⚠️ You must be logged in to use this test page
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          🧪 Material Upload Diagnostic Tool
        </h1>

        {/* User Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Current User Info</h2>
          <div className="space-y-1 text-sm">
            <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> <span className="px-2 py-1 bg-yellow-400 text-black rounded font-bold">{user.role?.toUpperCase()}</span></p>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Token:</strong> {localStorage.getItem('token') ? '✓ Present' : '✗ Missing'}</p>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={testUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Course ID
            </label>
            <input
              type="number"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
            {file && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Uploading...' : '🚀 Test Upload'}
          </button>
        </form>

        {/* Response Display */}
        {response && (
          <div className="mt-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-2">📋 Response:</h2>
            <div className={`p-4 rounded-lg ${
              response.status === 201 || response.status === 200
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">📝 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li>Open Browser DevTools (F12) → Console tab</li>
            <li>Enter a valid Course ID (check your courses page)</li>
            <li>Select a file to upload</li>
            <li>Click "Test Upload"</li>
            <li>Check the console and response section for details</li>
          </ol>
        </div>

        {/* Expected Responses */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">✅ Expected Status Codes:</h3>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li><strong>201</strong> - Success! Material uploaded</li>
            <li><strong>400</strong> - Bad Request (missing file or data)</li>
            <li><strong>401</strong> - Unauthorized (token invalid/expired)</li>
            <li><strong>403</strong> - Forbidden (not a teacher/admin)</li>
            <li><strong>404</strong> - Course not found</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
