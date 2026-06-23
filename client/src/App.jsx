import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailsPage from './pages/CourseDetailsPage';
// CreateCoursePage removed per request; upload page added below
import UploadMaterialPage from './pages/UploadMaterialPage';
import MaterialsPage from './pages/MaterialsPage';
import AllMaterialsPage from './pages/AllMaterialsPage';
import AssignmentsPage from './pages/AssignmentsPage';
import AllAssignmentsPage from './pages/AllAssignmentsPage';
import TeacherAssignmentsPage from './pages/TeacherAssignmentsPage';
import CreateAssignmentPage from './pages/CreateAssignmentPage';
import AssignmentDetailsPage from './pages/AssignmentDetailsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeacherRegisterPage from './pages/TeacherRegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SubjectsPage from './pages/SubjectsPage';
import SubjectDetailsPage from './pages/SubjectDetailsPage';
import AdminSubjectsPage from './pages/AdminSubjectsPage';
import StudentAssignmentsPage from './pages/StudentAssignmentsPage';
import PendingAssignmentsPage from './pages/PendingAssignmentsPage';
import StudentMaterialsPage from './pages/StudentMaterialsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AssignmentUpload from './components/courses/AssignmentUpload';
import AssignmentsList from './components/courses/AssignmentsList';
import UploadTestPage from './pages/UploadTestPage';
import UploadDiagnosticPage from './pages/UploadDiagnosticPage';

// Simple protected route using AuthContext
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/teacher/:token" element={<TeacherRegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<CourseDetailsPage />} />
          <Route path="courses/:courseId/materials" element={<MaterialsPage />} />
          <Route path="materials" element={<AllMaterialsPage />} />
          <Route path="materials/upload" element={<UploadMaterialPage />} />
          <Route path="materials/:courseId" element={<MaterialsPage />} />
          <Route path="assignments" element={<AllAssignmentsPage />} />
          <Route path="teacher-assignments" element={<TeacherAssignmentsPage />} />
          <Route path="courses/:courseId/assignments" element={<AssignmentsPage />} />
          <Route path="courses/:courseId/assignments/create" element={<CreateAssignmentPage />} />
          <Route path="courses/:courseId/assignments/upload" element={<AssignmentUpload />} />
          <Route path="assignments/:assignmentId" element={<AssignmentDetailsPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/:id" element={<SubjectDetailsPage />} />
          <Route path="subjects/assignments" element={<StudentAssignmentsPage />} />
          <Route path="pending-assignments" element={<PendingAssignmentsPage />} />
          <Route path="subjects/materials" element={<StudentMaterialsPage />} />
          <Route path="admin/subjects" element={<AdminSubjectsPage />} />
          {/* Create course route removed per request */}
          <Route path="upload-test" element={<UploadTestPage />} />
          <Route path="upload-diagnostic" element={<UploadDiagnosticPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
