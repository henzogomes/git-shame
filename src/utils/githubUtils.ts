import axios from "axios";

/**
 * Fetches a GitHub user's avatar URL
 * @param username The GitHub username
 * @returns The avatar URL or null if not found
 */
export const fetchGitHubAvatar = async (
  username: string
): Promise<string | null> => {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${username}`
    );
    if (response.data && response.data.avatar_url) {
      return response.data.avatar_url;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch avatar for ${username}:`, error);
    return null;
  }
};
