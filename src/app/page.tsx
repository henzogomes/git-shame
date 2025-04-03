"use client";

import { useState, useEffect } from "react";

// Translations
const translations = {
  "en-US": {
    title: "shame my github",
    placeholder: "Enter GitHub username",
    button: "Shame Them!",
    loading: "Shaming...",
    shameReportTitle: "The Shame Report:",
    errors: {
      rateLimitExceeded: "Rate limit exceeded. Try again in",
      seconds: "seconds",
      userNotFound: "GitHub user not found",
      failedToProcess: "Failed to shame GitHub user",
    },
    cachedResult: "Cached result (saved API usage)",
  },
  "pt-BR": {
    title: "envergonhe meu github",
    placeholder: "Digite o nome de usuário do GitHub",
    button: "Envergonhe!",
    loading: "Envergonhando...",
    shameReportTitle: "O Relatório da Vergonha:",
    errors: {
      rateLimitExceeded: "Limite de requisições excedido. Tente novamente em",
      seconds: "segundos",
      userNotFound: "Usuário do GitHub não encontrado",
      failedToProcess: "Falha ao envergonhar usuário do GitHub",
    },
    cachedResult: "Resultado em cache (economizou API)",
  },
};

export default function Home() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [shameResult, setShameResult] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"en-US" | "pt-BR">("en-US");
  const [isCached, setIsCached] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Detect language on client-side when component mounts
  useEffect(() => {
    setIsClient(true);
    const userLanguage = navigator.language;
    setLanguage(userLanguage.startsWith("pt") ? "pt-BR" : "en-US");
  }, []);

  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShameResult("");
    setIsCached(false);

    try {
      const response = await fetch(
        `/api/shame?username=${encodeURIComponent(username)}`
      );

      if (response.status === 429) {
        // Handle rate limiting
        const data = await response.json();
        setError(
          `${data.error} ${t.errors.rateLimitExceeded} ${data.resetInSeconds} ${t.errors.seconds}.`
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t.errors.failedToProcess);
      }

      const data = await response.json();
      setShameResult(data.shame);
      setIsCached(data.cached || false);

      // Update language if the API detected a different language
      if (data.language) {
        setLanguage(data.language as "en-US" | "pt-BR");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.failedToProcess);
    } finally {
      setLoading(false);
    }
  };

  // Don't render content until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-8">{t.title}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder={t.placeholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-800"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background py-3 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t.loading : t.button}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-md">
            {error}
          </div>
        )}

        {shameResult && (
          <div className="mt-6">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
              <h2 className="text-lg font-semibold mb-2">
                {t.shameReportTitle}
              </h2>
              <p className="whitespace-pre-line">{shameResult}</p>
            </div>

            {isCached && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic text-right">
                {t.cachedResult}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
