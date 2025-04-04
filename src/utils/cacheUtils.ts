import { CacheEntry } from "@/types/types";

/**
 * Checks if a cached result exists for the given username, language, and model
 */
export const checkCache = (
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

/**
 * Adds a result to the localStorage cache
 */
export const addToCache = (
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
