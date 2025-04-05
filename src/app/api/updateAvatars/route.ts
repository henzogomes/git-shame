import { NextResponse } from "next/server";
import { shameCacheController } from "@/controllers/ShameCacheController";
import axios from "axios";

// Import the REPORT_SECRET from env-vars
const REPORT_SECRET = process.env.REPORT_SECRET;

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { secret } = body;

    // Validate the secret from .env
    if (secret !== REPORT_SECRET) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all users with missing avatars
    const usersWithMissingAvatars =
      await shameCacheController.getUsersWithMissingAvatar();

    const updates = [];
    let totalUpdated = 0;

    // Process each user and update their avatar
    for (const username of usersWithMissingAvatars) {
      try {
        // Get GitHub avatar URL by calling the API
        const githubResponse = await axios.get(
          `https://api.github.com/users/${username}`
        );
        const userData = githubResponse.data;
        const avatarUrl = userData.avatar_url;

        if (!avatarUrl) {
          console.warn(`No avatar URL found for user ${username}`);
          continue;
        }

        // Update all records for this user
        const updatedCount = await shameCacheController.updateMissingAvatars(
          username,
          avatarUrl
        );

        totalUpdated += updatedCount;
        updates.push({
          username,
          updatedCount,
          avatarUrl,
        });
      } catch (error) {
        console.error(`Error updating avatar for user ${username}:`, error);
        // Continue with next user even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Avatars updated for all users with missing avatars",
      uniqueUsersUpdated: usersWithMissingAvatars.length,
      totalRecordsUpdated: totalUpdated,
      updates: updates,
    });
  } catch (error) {
    console.error("Error updating avatars:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update avatars" },
      { status: 500 }
    );
  }
}
