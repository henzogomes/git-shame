"use client";

import { useState, useEffect } from "react";
import { CacheEntry } from "@/types/types";

// Translations
const translations = {
  "en-US": {
    title: "roast my github",
    placeholder: "Enter GitHub username",
    button: "Roast Them!",
    loading: "Roasting...",
    shameReportTitle: "The Roast Report:",
    errors: {
      rateLimitExceeded: "Rate limit exceeded. Try again in",
      seconds: "seconds",
      userNotFound: "GitHub user not found",
      failedToProcess: "Failed to roast GitHub user",
    },
  },
  "pt-BR": {
    title: "zoar meu github",
    placeholder: "Digite o nome de usuário do GitHub",
    button: "Zoar!",
    loading: "Preparando a zoeira...",
    shameReportTitle: "O Relatório da Vergonha:",
    errors: {
      rateLimitExceeded: "Limite de requisições excedido. Tente novamente em",
      seconds: "segundos",
      userNotFound: "Usuário do GitHub não encontrado",
      failedToProcess: "Falha ao zoar usuário do GitHub",
    },
  },
};

// Detect language from window object when available
function getInitialLanguage(): "en-US" | "pt-BR" {
  if (typeof window !== "undefined") {
    return window.navigator.language.startsWith("pt") ? "pt-BR" : "en-US";
  }
  return "en-US"; // Default fallback
}

// Add this function to simulate streaming text
const simulateStreamingText = async (
  text: string,
  onUpdate: (text: string) => void
) => {
  // Start with empty text
  let currentText = "";
  onUpdate("");

  // Calculate chunk size and delay (adjust these for desired speed)
  const minChunkSize = 1;
  const maxChunkSize = 5;
  const minDelay = 10; // milliseconds
  const maxDelay = 40; // milliseconds

  // Break text into words
  const words = text.split(/(\s+)/);

  for (let i = 0; i < words.length; i++) {
    // Determine random chunk size (how many words to add at once)
    const chunkSize =
      Math.floor(Math.random() * (maxChunkSize - minChunkSize + 1)) +
      minChunkSize;
    const chunk = words.slice(i, i + chunkSize).join("");
    i += chunkSize - 1;

    // Add chunk to current text
    currentText += chunk;
    onUpdate(currentText);

    // Random delay between chunks to simulate typing
    const delay =
      Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return text;
};

export default function Home() {
  // Use the getInitialLanguage function for initial state
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [shameResult, setShameResult] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<"en-US" | "pt-BR">(
    getInitialLanguage
  );
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
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        // Process the stream
        setShameResult("");
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data === "[DONE]") {
                // Stream completed
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setShameResult((prev) => prev + parsed.text);
                }
              } catch (e) {
                console.log(e);
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

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
          setLanguage(data.language as "en-US" | "pt-BR");
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

  // Function to check cache - now includes model check
  const checkCache = (
    username: string,
    language: string,
    model: string
  ): string | null => {
    try {
      const cacheKey = `github-shame-cache`;
      const cacheData = localStorage.getItem(cacheKey);

      if (!cacheData) return null;

      const cache: CacheEntry[] = JSON.parse(cacheData);
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      // Find matching entry that's less than 24 hours old and matches the model
      const entry = cache.find(
        (entry) =>
          entry.username.toLowerCase() === username.toLowerCase() &&
          entry.language === language &&
          entry.model === model &&
          now - entry.timestamp < ONE_DAY
      );

      return entry ? entry.result : null;
    } catch (error) {
      // If there's an error reading cache, just proceed with API call
      console.error("Cache error:", error);
      return null;
    }
  };

  // Function to add to cache - now stores model info
  const addToCache = (
    username: string,
    language: "en-US" | "pt-BR",
    result: string,
    model: string
  ) => {
    try {
      const cacheKey = `github-shame-cache`;
      const cacheData = localStorage.getItem(cacheKey);

      let cache: CacheEntry[] = [];
      if (cacheData) {
        cache = JSON.parse(cacheData);

        // Remove any existing entries for this username, language, and model
        cache = cache.filter(
          (entry) =>
            !(
              entry.username.toLowerCase() === username.toLowerCase() &&
              entry.language === language &&
              entry.model === model
            )
        );
      }

      // Add new entry with model information
      cache.push({
        username,
        language,
        timestamp: Date.now(),
        result,
        model,
      });

      // Limit cache size (optional, keeps last 50 entries)
      if (cache.length > 50) {
        cache = cache.slice(-50);
      }

      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error("Error adding to cache:", error);
      // Continue even if caching fails
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

        {error && (
          <div className="mt-6 p-4 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-md">
            {error}
          </div>
        )}

        {shameResult && (
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <h2 className="text-lg font-semibold mb-2">{t.shameReportTitle}</h2>
            <p className="whitespace-pre-line">{shameResult}</p>
          </div>
        )}
      </main>
    </div>
  );
}
