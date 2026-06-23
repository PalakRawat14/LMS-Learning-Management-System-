import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div className="max-w-max mx-auto">
        <main className="sm:flex">
          <p className="text-4xl font-extrabold text-primary-600 sm:text-5xl">403</p>
          <div className="sm:ml-6">
            <div className="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight sm:text-5xl">
                Unauthorized Access
              </h1>
              <p className="mt-1 text-base text-gray-500 dark:text-gray-400">
                Sorry, you don't have permission to access this page.
              </p>
            </div>
            <div className="mt-10 flex space-x-3 sm:border-l sm:border-transparent sm:pl-6">
              <Link
                to={user ? '/dashboard' : '/login'}
                className="btn-primary"
              >
                {user ? 'Go to Dashboard' : 'Go to Login'}
              </Link>
              <Link
                to="/"
                className="btn-secondary"
              >
                Go Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}