import { NextResponse } from "next/server";
import axios from "axios";
import OpenAI from "openai";
import { headers } from "next/headers";
import { isRateLimited, getRateLimitReset } from "@/utils/rate-limiter";

// Define interfaces for GitHub data
interface GitHubRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

interface GitHubProfile {
  username: string;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  accountCreatedAt: string;
  company: string | null;
  location: string | null;
  topRepos: {
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
  }[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export async function GET(request: Request) {
  // Get client IP for rate limiting
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const clientIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : "unknown-ip";

  // Check rate limit
  if (isRateLimited(clientIp)) {
    const resetSeconds = getRateLimitReset(clientIp);
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again later.",
        resetInSeconds: resetSeconds,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Reset": resetSeconds.toString(),
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch GitHub user data
    const githubResponse = await axios.get(
      `https://api.github.com/users/${username}`
    );
    const userData = githubResponse.data;

    // Also fetch user's repositories to have more information to mock
    const reposResponse = await axios.get(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=5`
    );
    const reposData = reposResponse.data as GitHubRepo[];

    // Prepare data for OpenAI
    const githubProfile: GitHubProfile = {
      username: userData.login,
      name: userData.name,
      bio: userData.bio,
      followers: userData.followers,
      following: userData.following,
      publicRepos: userData.public_repos,
      accountCreatedAt: userData.created_at,
      company: userData.company,
      location: userData.location,
      topRepos: reposData.map((repo: GitHubRepo) => ({
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
      })),
    };

    // Generate shame with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a sarcastic and humorous tech critic. Your job is to playfully roast someone's GitHub profile in a funny way. Keep it light-hearted, don't be actually mean or offensive. Select a few repositorios to make fun of, and use the user's bio and other information to create a funny roast.",
        },
        {
          role: "user",
          content: `Roast this GitHub profile in a funny way: ${JSON.stringify(
            githubProfile
          )}`,
        },
      ],
      max_tokens: 500,
    });

    const shameText =
      completion.choices[0]?.message.content ||
      "Hmm, I couldn't think of anything clever to say. This GitHub profile is too boring to roast.";

    return NextResponse.json({ shame: shameText });
  } catch (error) {
    console.error("Error:", error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { error: "GitHub user not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
