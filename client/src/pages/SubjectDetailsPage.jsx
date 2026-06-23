import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subjectService } from '../services/subjectService';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { PlusIcon, DocumentTextIcon, TrashIcon, ArrowDownTrayIcon, BookOpenIcon, ClipboardDocumentListIcon, CheckCircleIcon, StarIcon } from '@heroicons/react/24/outline';

const SubjectDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [subject, setSubject] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitFile, setSubmitFile] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState([]);
  const [gradeModal, setGradeModal] = useState({ isOpen: false, submission: null, grade: '', feedback: '' });
  const [uploadData, setUploadData] = useState({ title: '', description: '', file: null });
  const [assignmentData, setAssignmentData] = useState({ title: '', description: '', dueDate: '', totalPoints: 100 });
  const [assignmentFiles, setAssignmentFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('materials');

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';
  const canManage = isAdmin || isTeacher;

  useEffect(() => {
    fetchData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectData, materialsData, assignmentsData] = await Promise.all([
        subjectService.getSubjectById(id),
        subjectService.getSubjectMaterials(id),
        subjectService.getSubjectAssignments(id)
      ]);
      setSubject(subjectData);
      setMaterials(materialsData);
      setAssignments(assignmentsData);

      if (isStudent) {
        const subsMap = {};
        await Promise.all(assignmentsData.map(async (a) => {
          try {
            const sub = await subjectService.getMyAssignmentSubmission(a.id);
            subsMap[a.id] = sub;
          } catch {}
        }));
        setSubmissions(subsMap);
      }
    } catch (err) {
      console.error('Error fetching subject:', err);
      toast.error('Failed to load subject');
      navigate('/subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.file) { toast.error('Please select a file'); return; }
    try {
      const formData = new FormData();
      formData.append('file', uploadData.file);
      formData.append('title', uploadData.title || uploadData.file.name);
      if (uploadData.description) formData.append('description', uploadData.description);
      await subjectService.uploadMaterial(id, formData);
      toast.success('Material uploaded successfully');
      setShowUploadModal(false);
      setUploadData({ title: '', description: '', file: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload material');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', assignmentData.title);
      formData.append('description', assignmentData.description);
      formData.append('dueDate', assignmentData.dueDate);
      formData.append('totalPoints', assignmentData.totalPoints);
      assignmentFiles.forEach(f => formData.append('files', f));
      await subjectService.createAssignment(id, formData);
      toast.success('Assignment created successfully');
      setShowCreateAssignment(false);
      setAssignmentData({ title: '', description: '', dueDate: '', totalPoints: 100 });
      setAssignmentFiles([]);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Delete this material?')) return;
    try {
      await subjectService.deleteMaterial(id, materialId);
      toast.success('Material deleted');
      fetchData();
    } catch { toast.error('Failed to delete material'); }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Delete this assignment?')) return;
    try {
      await subjectService.deleteAssignment(id, assignmentId);
      toast.success('Assignment deleted');
      fetchData();
    } catch { toast.error('Failed to delete assignment'); }
  };

  const handleDownloadAttachment = (assignment, idx) => {
    const fileName = assignment.attachments?.[idx]?.originalName || assignment.attachments?.[idx]?.filename || 'download';
    subjectService
      .downloadAssignmentAttachmentFile(id, assignment.id, idx, fileName)
      .catch((error) => {
        console.error('Error downloading attachment:', error);
        toast.error('Failed to download attachment');
      });
  };

  const handleDownloadMaterial = async (material) => {
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

  const openSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmitFile(null);
    setShowSubmitModal(true);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!submitFile) { toast.error('Please select a file'); return; }
    try {
      const formData = new FormData();
      formData.append('files', submitFile);
      await subjectService.submitAssignment(selectedAssignment.id, formData);
      toast.success('Assignment submitted successfully');
      setShowSubmitModal(false);
      setSelectedAssignment(null);
      setSubmitFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  const openSubmissionsModal = async (assignment) => {
    try {
      const data = await subjectService.getAssignmentSubmissions(assignment.id);
      setSelectedAssignment(assignment);
      setSelectedAssignmentSubmissions(data.submissions || []);
      setShowSubmissionsModal(true);
    } catch { toast.error('Failed to load submissions'); }
  };

  const handleExportSubmissions = async (assignment) => {
    try {
      await subjectService.downloadAssignmentSubmissionReport(
        assignment.id,
        `${assignment.title || 'subject-assignment'}-submissions.xlsx`
      );
      toast.success('Excel report downloaded');
    } catch (error) {
      console.error('Error exporting subject assignment report:', error);
      toast.error('Failed to export submission report');
    }
  };

  const handleDownloadSubmissionAttachment = (submission, attachment, idx) => {
    const label = typeof attachment === 'string'
      ? attachment
      : (attachment.originalName || attachment.originalname || attachment.fileName || attachment.filename || `attachment-${idx + 1}`);
    subjectService.downloadSubmissionAttachmentFile(submission.id, idx, label).catch((err) => {
      console.error('Error downloading submission attachment:', err);
      toast.error('Failed to download file');
    });
  };

  const openGradeModal = (submission) => {
    setGradeModal({ isOpen: true, submission, grade: submission.grade || '', feedback: submission.feedback || '' });
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    try {
      await subjectService.gradeSubmission(gradeModal.submission.id, {
        grade: parseFloat(gradeModal.grade),
        feedback: gradeModal.feedback
      });
      toast.success('Graded successfully');
      setGradeModal({ isOpen: false, submission: null, grade: '', feedback: '' });
      openSubmissionsModal(selectedAssignment);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grade');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!subject) return <div className="text-center py-12 text-gray-500">Subject not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{subject.name}</h1>
            <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mt-1">{subject.code}</p>
            {subject.courseField && (
              <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium mt-2">
                {subject.courseField}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {subject.teachers?.map((teacher) => (
              <span key={teacher.id} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                {teacher.firstName} {teacher.lastName}
              </span>
            ))}
          </div>
        </div>
        {subject.description && <p className="text-gray-600 dark:text-gray-400 mt-4">{subject.description}</p>}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('materials')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'materials' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          Study Materials
        </button>
        <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assignments' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          Assignments
        </button>
      </div>

      {activeTab === 'materials' && (
        <div>
          {canManage && (
            <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mb-4">
              <PlusIcon className="w-5 h-5" /> Upload Material
            </button>
          )}
          {materials.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <BookOpenIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No study materials yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div key={material.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{material.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {material.originalName} &middot; {(material.fileSize / 1024).toFixed(1)} KB
                      {material.uploader && <span> &middot; by {material.uploader.firstName} {material.uploader.lastName}</span>}
                      {material.description && <span className="block mt-1 text-gray-400">{material.description}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleDownloadMaterial(material)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Download">
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                    {canManage && (
                      <button onClick={() => handleDeleteMaterial(material.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div>
          {canManage && (
            <button onClick={() => setShowCreateAssignment(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mb-4">
              <PlusIcon className="w-5 h-5" /> Create Assignment
            </button>
          )}
          {assignments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <ClipboardDocumentListIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No assignments yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const mySub = submissions[assignment.id];
                return (
                  <div key={assignment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white">{assignment.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{assignment.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                          <span>{assignment.totalPoints} pts</span>
                        </div>
                        {assignment.attachments?.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            {assignment.attachments.map((att, idx) => (
                              <button key={idx} onClick={() => handleDownloadAttachment(assignment, idx)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                                <ArrowDownTrayIcon className="w-3 h-3" /> {att.originalName}
                              </button>
                            ))}
                          </div>
                        )}

                        {isStudent && mySub && (
                          <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${mySub.status === 'graded' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            {mySub.status === 'graded' ? `Graded: ${mySub.grade}/${assignment.totalPoints}` : 'Submitted'}
                          </div>
                        )}
                        {isStudent && mySub?.feedback && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Feedback: {mySub.feedback}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isStudent && !mySub && new Date(assignment.dueDate) > new Date() && (
                          <button onClick={() => openSubmitModal(assignment)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <DocumentTextIcon className="w-3.5 h-3.5" /> Submit
                          </button>
                        )}
                        {isStudent && mySub && mySub.status === 'submitted' && (
                          <span className="text-xs text-gray-400 italic">Awaiting grade</span>
                        )}
                        {canManage && (
                          <>
                            <button onClick={() => openSubmissionsModal(assignment)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">
                              <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> Submissions
                            </button>
                            <button onClick={() => handleExportSubmissions(assignment)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                              Export Excel
                            </button>
                            <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Upload Study Material</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label><input type="text" value={uploadData.title} onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" placeholder="Leave empty to use filename" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea rows="2" value={uploadData.description} onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File *</label><input ref={fileInputRef} type="file" onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/30 dark:file:text-green-400" /></div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Upload</button>
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Create Assignment</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label><input type="text" required value={assignmentData.title} onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label><textarea rows="3" required value={assignmentData.description} onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date *</label><input type="date" required value={assignmentData.dueDate} onChange={(e) => setAssignmentData({ ...assignmentData, dueDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Points</label><input type="number" min="1" value={assignmentData.totalPoints} onChange={(e) => setAssignmentData({ ...assignmentData, totalPoints: parseInt(e.target.value) || 100 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachment (PDF, DOC, etc.)</label><input type="file" multiple onChange={(e) => setAssignmentFiles(Array.from(e.target.files))} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/30 dark:file:text-purple-400" />
              {assignmentFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {assignmentFiles.map((f, i) => (
                    <div key={i} className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Create</button>
                <button type="button" onClick={() => { setShowCreateAssignment(false); setAssignmentFiles([]); }} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Submit Assignment</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedAssignment.title}</p>
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Solution *</label><input type="file" required onChange={(e) => setSubmitFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400" /></div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Submit</button>
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubmissionsModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSubmissionsModal(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mt-12">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Submissions: {selectedAssignment.title}</h3>
                <button onClick={() => setShowSubmissionsModal(false)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
              </div>
              {selectedAssignmentSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No submissions yet.</div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-auto">
                  {selectedAssignmentSubmissions.map((sub) => (
                    <div key={sub.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{sub.User?.firstName} {sub.User?.lastName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                          {sub.feedback && <p className="text-xs text-gray-500 mt-1">Feedback: {sub.feedback}</p>}
                          {sub.attachments && sub.attachments.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Attachments:</div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {sub.attachments.map((att, ai) => {
                                  const label = typeof att === 'string'
                                    ? att
                                    : (att.originalName || att.originalname || att.fileName || att.filename || `Attachment ${ai + 1}`);
                                  return (
                                    <button
                                      key={ai}
                                      onClick={() => handleDownloadSubmissionAttachment(sub, att, ai)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                    >
                                      <ArrowDownTrayIcon className="w-3 h-3" />
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.status === 'graded' ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                              {sub.grade}/{selectedAssignment.totalPoints}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">Pending</span>
                          )}
                          <button onClick={() => openGradeModal(sub)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg transition-colors">
                            <StarIcon className="w-3.5 h-3.5" /> Grade
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {gradeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Grade Submission</h3>
            <p className="text-sm text-gray-500 mb-4">{gradeModal.submission.User?.firstName} {gradeModal.submission.User?.lastName}</p>
            <form onSubmit={handleGrade} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade (out of {selectedAssignment?.totalPoints || 100})</label><input type="number" step="0.5" min="0" max={selectedAssignment?.totalPoints || 100} required value={gradeModal.grade} onChange={(e) => setGradeModal({ ...gradeModal, grade: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feedback</label><textarea rows="3" value={gradeModal.feedback} onChange={(e) => setGradeModal({ ...gradeModal, feedback: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white" placeholder="Optional feedback for the student" /></div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Save Grade</button>
                <button type="button" onClick={() => setGradeModal({ isOpen: false, submission: null, grade: '', feedback: '' })} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetailsPage;
