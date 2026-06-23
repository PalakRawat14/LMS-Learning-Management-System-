import { NavLink } from 'react-router-dom';

const StudentDashboardSidebar = () => (
  <aside className="w-64 bg-white dark:bg-gray-800 shadow-md min-h-screen">
    <nav className="p-6 space-y-4">
      <NavLink to="/dashboard" className="block text-lg font-semibold text-gray-700 dark:text-white" end>
        Dashboard
      </NavLink>
      <NavLink to="/courses" className="block text-gray-600 dark:text-gray-300">
        Courses
      </NavLink>
      <NavLink to="/my-courses" className="block text-gray-600 dark:text-gray-300">
        My Enrollments
      </NavLink>
      <NavLink to="/profile" className="block text-gray-600 dark:text-gray-300">
        Profile
      </NavLink>
    </nav>
  </aside>
);

export default StudentDashboardSidebar;
