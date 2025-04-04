import { CacheEntry } from "@/types/types";

/**
 * Checks if a cached result exists for the given username, language, and model
 */
export const checkCache = (
  username: string,
  language: string,
  model: string
): { result: string | null; avatarUrl: string | null } => {
  try {
    const cacheKey = `github-shame-cache`;
    const cacheData = localStorage.getItem(cacheKey);

    if (!cacheData) return { result: null, avatarUrl: null };

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

    return {
      result: entry ? entry.result : null,
      avatarUrl: entry?.avatarUrl || null,
    };
  } catch (error) {
    // If there's an error reading cache, just proceed with API call
    console.error("Cache error:", error);
    return { result: null, avatarUrl: null };
  }
};

/**
 * Adds a result to the localStorage cache
 */
export const addToCache = (
  username: string,
  language: "en-US" | "pt-BR",
  result: string,
  model: string,
  avatarUrl?: string | null
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

    // Add new entry with model information and avatar URL
    cache.push({
      username,
      language,
      timestamp: Date.now(),
      result,
      model,
      avatarUrl: avatarUrl || null,
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

/**
 * Updates just the avatar URL in the localStorage cache
 */
export const updateAvatarUrlInCache = (
  username: string,
  language: string,
  model: string,
  avatarUrl: string
): boolean => {
  try {
    const cacheKey = `github-shame-cache`;
    const cacheData = localStorage.getItem(cacheKey);

    if (!cacheData) return false;

    const cache: CacheEntry[] = JSON.parse(cacheData);
    let updated = false;

    // Find the entry to update
    for (let i = 0; i < cache.length; i++) {
      const entry = cache[i];
      if (
        entry.username.toLowerCase() === username.toLowerCase() &&
        entry.language === language &&
        entry.model === model
      ) {
        cache[i].avatarUrl = avatarUrl;
        updated = true;
        break;
      }
    }

    if (updated) {
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    }

    return updated;
  } catch (error) {
    console.error("Error updating avatar URL in cache:", error);
    return false;
  }
};

/**
 * Removes an entry from the localStorage cache
 */
export const removeFromCache = (
  username: string,
  language: string,
  model: string
): boolean => {
  try {
    const cacheKey = `github-shame-cache`;
    const cacheData = localStorage.getItem(cacheKey);

    if (!cacheData) return false;

    const cache: CacheEntry[] = JSON.parse(cacheData);
    const initialLength = cache.length;

    // Filter out the entry to remove
    const newCache = cache.filter(
      (entry) =>
        !(
          entry.username.toLowerCase() === username.toLowerCase() &&
          entry.language === language &&
          entry.model === model
        )
    );

    // If the length changed, we removed something
    if (newCache.length !== initialLength) {
      localStorage.setItem(cacheKey, JSON.stringify(newCache));
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error removing from cache:", error);
    return false;
  }
};
