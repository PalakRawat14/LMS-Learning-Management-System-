import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <header className="bg-white dark:bg-gray-800 h-16 border-b border-gray-200 dark:border-gray-700 relative z-50 shadow-sm">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between max-w-full">
        <div className="flex items-center">
          <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-none">
            Learning Management System
          </h2>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-110"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="text-xl">{isDarkMode ? '🌞' : '🌙'}</span>
          </button>

          {/* Notifications removed */}

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/15 transition-all duration-200 shadow-lg hover:shadow-xl"
              title="Profile Menu"
            >
              <span className="text-xl">👤</span>
              <span className="text-gray-900 dark:text-white font-semibold text-sm tracking-tight hidden sm:inline">{user?.name}</span>
              <svg 
                className={`w-4 h-4 text-gray-900 dark:text-white transition-transform duration-200 hidden sm:block ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
                <div className="py-2">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{user?.name}</p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize mt-0.5">{user?.role}</p>
                  </div>
                  
                  <a
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-gray-800 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-lg">⚙️</span>
                    <span className="text-sm font-semibold tracking-tight">Profile Settings</span>
                  </a>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-red-600 dark:text-red-400 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="text-lg">🚪</span>
                    <span className="text-sm font-semibold tracking-tight">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;