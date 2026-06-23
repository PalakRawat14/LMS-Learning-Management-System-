import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { Field } from 'formik';

const InputField = ({
  label,
  name,
  type = 'text',
  error,
  touched,
  ...props
}) => {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <Field
          type={type}
          id={name}
          name={name}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm transition duration-200 ${
            error && touched
              ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/10'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500'
          }`}
          {...props}
        />
        {error && touched && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
        )}
      </div>
      {error && touched && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export { InputField };