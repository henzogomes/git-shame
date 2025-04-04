import client from "@/lib/pg-client";

export interface ShameCache {
  id?: number;
  username: string;
  shame_text: string;
  language: string;
  llm_model?: string;
  created_at?: Date;
  last_access?: Date;
}

export class ShameCacheController {
  /**
   * Retrieves a cached shame entry for a given username, language, and LLM model
   * @param username The GitHub username
   * @param language The language code (e.g., "en-US", "pt-BR")
   * @param model Optional LLM model to match (e.g., "gpt-3.5-turbo", "deepseek")
   * @returns The shame cache entry if found, null otherwise
   */
  async get(
    username: string,
    language: string,
    model?: string
  ): Promise<ShameCache | null> {
    try {
      let query = `
        SELECT * FROM shame_cache
        WHERE username = $1
        AND language = $2
        AND created_at > NOW() - INTERVAL '24 hours'
      `;

      const params = [username.toLowerCase(), language];

      // If model is specified, add it to the query conditions
      if (model) {
        query += ` AND llm_model = $3`;
        params.push(model);
      }

      const result = await client.query(query, params);

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
   * Updates an existing shame cache entry
   * @param id The ID of the entry to update
   * @param shame_text The new shame text
   * @returns The updated shame cache entry
   */
  async update(id: number, shame_text: string): Promise<ShameCache> {
    try {
      const updateQuery = `
        UPDATE shame_cache
        SET shame_text = $1,
            last_access = NOW(),
            created_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [shame_text, id]);

      if (updateResult.rows.length === 0) {
        throw new Error(`No shame cache entry found with ID ${id}`);
      }

      return updateResult.rows[0];
    } catch (error) {
      console.error("Error updating shame cache entry:", error);
      throw error;
    }
  }

  /**
   * Inserts a new shame cache entry
   * @param entry The shame cache entry to insert
   * @returns The created shame cache entry with ID
   */
  async insert(entry: ShameCache): Promise<ShameCache> {
    try {
      const insertQuery = `
        INSERT INTO shame_cache (username, shame_text, language, llm_model)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        entry.username.toLowerCase(),
        entry.shame_text,
        entry.language,
        entry.llm_model || "gpt-3.5-turbo",
      ]);

      return insertResult.rows[0];
    } catch (error) {
      console.error("Error inserting shame cache entry:", error);
      throw error;
    }
  }

  /**
   * Stores or updates a shame result in the database cache
   * @param entry The shame cache entry to store
   * @returns The created or updated shame cache entry with ID
   */
  async cacheUser(entry: ShameCache): Promise<ShameCache> {
    try {
      // First check if an entry already exists for this username, language, AND model
      const existingQuery = `
        SELECT id FROM shame_cache
        WHERE username = $1
        AND language = $2
        AND llm_model = $3
      `;

      const existingResult = await client.query(existingQuery, [
        entry.username.toLowerCase(),
        entry.language,
        entry.llm_model || "gpt-3.5-turbo",
      ]);

      if (existingResult.rows.length > 0) {
        // Update existing entry using the dedicated update method
        return this.update(existingResult.rows[0].id, entry.shame_text);
      } else {
        // Insert new entry using the dedicated insert method
        return this.insert(entry);
      }
    } catch (error) {
      console.error("Error caching user shame entry:", error);
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
