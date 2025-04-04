import client from "@/lib/pg-client";

export interface ShameCache {
  id?: number;
  username: string;
  shame_text: string;
  language: string;
  created_at?: Date;
  last_access?: Date;
}

export class ShameCacheController {
  /**
   * Retrieves a cached shame entry for a given username and language
   * @param username The GitHub username
   * @param language The language code (e.g., "en-US", "pt-BR")
   * @returns The shame cache entry if found, null otherwise
   */
  async get(username: string, language: string): Promise<ShameCache | null> {
    try {
      const query = `
        SELECT * FROM shame_cache
        WHERE username = $1
        AND language = $2
        AND created_at > NOW() - INTERVAL '24 hours'
      `;

      const result = await client.query(query, [
        username.toLowerCase(),
        language,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      // Update the last_access timestamp
      await client.query(
        "UPDATE shame_cache SET last_access = NOW() WHERE id = $1",
        [result.rows[0].id]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error fetching from shame cache:", error);
      return null;
    }
  }

  /**
   * Stores a shame result in the database cache
   * @param entry The shame cache entry to store
   * @returns The created shame cache entry with ID
   */
  async create(entry: ShameCache): Promise<ShameCache> {
    try {
      // First check if an entry already exists for this username and language
      const existingQuery = `
        SELECT id FROM shame_cache
        WHERE username = $1
        AND language = $2
      `;

      const existingResult = await client.query(existingQuery, [
        entry.username.toLowerCase(),
        entry.language,
      ]);

      if (existingResult.rows.length > 0) {
        // Update existing entry
        const updateQuery = `
          UPDATE shame_cache
          SET shame_text = $1,
              last_access = NOW(),
              created_at = NOW()
          WHERE id = $2
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, [
          entry.shame_text,
          existingResult.rows[0].id,
        ]);

        return updateResult.rows[0];
      } else {
        // Insert new entry
        const insertQuery = `
          INSERT INTO shame_cache (username, shame_text, language)
          VALUES ($1, $2, $3)
          RETURNING *
        `;

        const insertResult = await client.query(insertQuery, [
          entry.username.toLowerCase(),
          entry.shame_text,
          entry.language,
        ]);

        return insertResult.rows[0];
      }
    } catch (error) {
      console.error("Error creating shame cache entry:", error);
      throw error;
    }
  }

  /**
   * Cleans up old cache entries (older than 7 days)
   * @returns Number of deleted entries
   */
  async cleanup(): Promise<number> {
    try {
      const query = `
        DELETE FROM shame_cache
        WHERE last_access < NOW() - INTERVAL '7 days'
        RETURNING id
      `;

      const result = await client.query(query);
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error cleaning up old cache entries:", error);
      return 0;
    }
  }
}

// Export a singleton instance for use throughout the application
export const shameCacheController = new ShameCacheController();
