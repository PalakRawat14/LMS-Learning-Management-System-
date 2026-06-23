import { NavLink } from 'react-router-dom';

const FacultyDashboardSidebar = () => (
  <aside className="w-64 bg-white dark:bg-gray-800 shadow-md min-h-screen">
    <nav className="p-6 space-y-4">
      <NavLink to="/dashboard" className="block text-lg font-semibold text-gray-700 dark:text-white" end>
        Dashboard
      </NavLink>
      <NavLink to="/courses" className="block text-gray-600 dark:text-gray-300">
        All Courses
      </NavLink>
      <NavLink to="/subjects" className="block text-gray-600 dark:text-gray-300">
        Subjects
      </NavLink>
      <NavLink to="/profile" className="block text-gray-600 dark:text-gray-300">
        Profile
      </NavLink>
    </nav>
  </aside>
);

export default FacultyDashboardSidebar;
