/* eslint-disable @next/next/no-img-element */
import React from "react";
import ReactMarkdown from "react-markdown";

interface RoastResultProps {
  loading: boolean;
  error: string;
  shameResult: string;
  title: string;
  avatarUrl?: string | null;
  username?: string;
  errorStyles?: string;
  resultStyles?: string;
  titleStyles?: string;
}

const RoastResult: React.FC<RoastResultProps> = ({
  loading,
  error,
  shameResult,
  title,
  avatarUrl,
  username,
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

      {/* Show roast result if exists, now with markdown parsing and avatar */}
      {shameResult && (
        <div className={resultStyles}>
          <div className="flex items-center mb-4">
            {avatarUrl && (
              <div className="mr-4 flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt={`GitHub avatar for ${username || "user"}`}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              </div>
            )}
            <h2 className={titleStyles}>{title}</h2>
          </div>
          <div className="markdown-content">
            <ReactMarkdown>{shameResult}</ReactMarkdown>
          </div>
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
