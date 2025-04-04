"use client";

import { useState, useEffect } from "react";
import RoastResult from "@/components/RoastResult";
import { checkCache, addToCache } from "@/utils/cacheUtils";
import {
  simulateStreamingText,
  handleSSEStream,
  getInitialLanguage,
} from "@/utils/streamingUtils";
import translations, { Language } from "@/translations";

export default function Home() {
  // Use the getInitialLanguage function for initial state
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [shameResult, setShameResult] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [isClient, setIsClient] = useState(false);
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  const [currentModel, setCurrentModel] = useState("gpt-3.5-turbo");

  // Mark when client-side rendering is complete and get environment variables
  useEffect(() => {
    setIsClient(true);

    // Get cache setting from environment
    setIsCacheEnabled(process.env.NEXT_PUBLIC_CACHE !== "false");

    // Get current model from environment
    setCurrentModel(process.env.NEXT_PUBLIC_LLM || "gpt-3.5-turbo");
  }, []);

  // Get the translations after ensuring we have the correct language
  const t = translations[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShameResult("");

    // Check localStorage cache first - only if caching is enabled
    if (isCacheEnabled) {
      const cachedResult = checkCache(username, language, currentModel);
      if (cachedResult) {
        // Simulate streaming for cached content instead of immediate display
        await simulateStreamingText(cachedResult, setShameResult);
        setLoading(false);

        // Track the form submission event with cache info
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "username_submission", {
            event_category: "engagement",
            event_label: username,
            username: username,
            from_cache: "localStorage",
            model: currentModel,
            cache_enabled: isCacheEnabled,
          });
        }

        return; // Stop further processing if result is from localStorage
      }
    }

    try {
      // Use the combined endpoint for all requests
      const apiRoute = "/api/shame";

      // Always use streaming for uncached requests
      const response = await fetch(
        `${apiRoute}?username=${encodeURIComponent(username)}&lang=${language}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json();
          setError(
            `${data.error} ${t.errors.rateLimitExceeded} ${data.resetInSeconds} ${t.errors.seconds}.`
          );
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || response.statusText);
        }
        setLoading(false);
        return;
      }

      // Check if the response is a stream or JSON
      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream")) {
        // Handle streaming response
        const shameResult = await handleSSEStream(response, setShameResult);

        // If caching is enabled, add the final result to the cache
        if (isCacheEnabled && shameResult) {
          addToCache(username, language, shameResult, currentModel);
        }
      } else {
        // Handle regular JSON response (from cache)
        const data = await response.json();

        // Simulate streaming for database cached content too
        await simulateStreamingText(data.shame, setShameResult);

        // Update language if the API detected a different language
        if (data.language) {
          setLanguage(data.language as Language);
        }

        // Add to localStorage cache with model information - only if caching is enabled
        if (isCacheEnabled) {
          addToCache(
            username,
            data.language || language,
            data.shame,
            data.model || currentModel
          );
        }

        // Track with info about which cache was used
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", "username_submission", {
            event_category: "engagement",
            event_label: username,
            username: username,
            from_cache: data.fromCache ? "database" : "none",
            model: data.model || currentModel,
            cache_enabled: isCacheEnabled,
          });
        }
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
      <main className="w-full max-w-lg">
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

        <RoastResult
          loading={loading}
          error={error}
          shameResult={shameResult}
          title={t.shameReportTitle}
        />
      </main>
    </div>
  );
}
