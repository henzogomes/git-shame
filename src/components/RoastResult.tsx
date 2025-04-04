import React from "react";

interface RoastResultProps {
  loading: boolean;
  error: string;
  shameResult: string;
  title: string;
  errorStyles?: string;
  resultStyles?: string;
  titleStyles?: string;
}

const RoastResult: React.FC<RoastResultProps> = ({
  loading,
  error,
  shameResult,
  title,
  errorStyles = "mt-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-md",
  resultStyles = "mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md",
  titleStyles = "text-lg font-semibold mb-2",
}) => {
  // Don't render if there's nothing to show and not loading
  if (!loading && !error && !shameResult) {
    return null;
  }

  return (
    <div className="mt-6">
      {/* Show error message if exists */}
      {error && <div className={errorStyles}>{error}</div>}

      {/* Show roast result if exists */}
      {shameResult && (
        <div className={resultStyles}>
          <h2 className={titleStyles}>{title}</h2>
          <p className="whitespace-pre-line">{shameResult}</p>
        </div>
      )}

      {/* Show loading indicator if loading and no result yet */}
      {loading && !shameResult && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-pulse flex space-x-2">
            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoastResult;
