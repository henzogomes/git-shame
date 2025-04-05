import { NextPage } from "next";
import { notFound } from "next/navigation";
import { shameCacheController } from "@/controllers/ShameCacheController";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

interface ReportPageProps {
  searchParams: Promise<{
    s?: string;
  }>;
}

// Helper mapping of language codes to country flag emojis
const languageFlags: Record<string, string> = {
  "en-US": "🇺🇸",
  "en-GB": "🇬🇧",
  "pt-BR": "🇧🇷",
  "es-ES": "🇪🇸",
  "fr-FR": "🇫🇷",
  "de-DE": "🇩🇪",
  "it-IT": "🇮🇹",
  "ja-JP": "🇯🇵",
  "ko-KR": "🇰🇷",
  "zh-CN": "🇨🇳",
  "ru-RU": "🇷🇺",
  // Add more language codes as needed
};

const ReportPage: NextPage<ReportPageProps> = async ({ searchParams }) => {
  const reportSecret = process.env.REPORT_SECRET;

  // Await the searchParams before using it
  const params = await searchParams;

  // Check if the 's' parameter matches the environment variable
  if (!reportSecret || params.s !== reportSecret) {
    // Return 404 if the parameter doesn't match or if the secret isn't set
    notFound();
  }

  // Fetch all cache entries using the controller's new method
  const cacheEntries = await shameCacheController.getAll();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Shame Cache Report</h1>

      {cacheEntries.length === 0 ? (
        <p>No cache entries found.</p>
      ) : (
        <div className="max-h-screen">
          <table className="min-w-full border border-gray-600 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="py-2 px-4 border border-gray-300 dark:border-gray-700 text-left">
                  ID
                </th>
                <th className="py-2 px-4 border border-gray-300 dark:border-gray-700 text-left">
                  User
                </th>
                <th className="py-2 px-4 border border-gray-300 dark:border-gray-700 text-left">
                  Language/Model
                </th>
                <th className="py-2 px-4 border border-gray-300 dark:border-gray-700 text-left">
                  Created
                </th>
                <th className="py-2 px-4 border border-gray-300 dark:border-gray-700 text-left">
                  Shame Text
                </th>
              </tr>
            </thead>
            <tbody>
              {cacheEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="py-2 px-4 border border-gray-300 dark:border-gray-700">
                    {entry.id}
                  </td>
                  <td className="py-2 px-4 border border-gray-300 dark:border-gray-700">
                    <div className="flex flex-col items-center">
                      <div className="mb-1">
                        {entry.avatar_url ? (
                          <Image
                            src={entry.avatar_url}
                            alt={entry.username}
                            width={32}
                            height={32}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm">
                          {entry.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-4 border border-gray-300 dark:border-gray-700">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center">
                        <span className="text-lg mr-2" title={entry.language}>
                          {languageFlags[entry.language] || "🏳️"}
                        </span>
                        <span className="text-sm">{entry.language}</span>
                      </div>
                      {entry.llm_model && (
                        <div className="mt-1">
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 px-1.5 py-0.5 rounded">
                            {entry.llm_model}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-4 border border-gray-300 dark:border-gray-700">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="py-2 px-4 border border-gray-300 dark:border-gray-700">
                    <div className="max-h-[300px] overflow-y-auto prose dark:prose-invert prose-sm">
                      <ReactMarkdown>{entry.shame_text}</ReactMarkdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Helper function to format dates
function formatDate(date: Date | string | undefined) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString();
}

export default ReportPage;
