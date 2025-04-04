import { NextResponse } from "next/server";
import axios from "axios";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { streamText } from "ai";
import { headers } from "next/headers";
import { isRateLimited, getRateLimitReset } from "@/lib/rate-limiter";
import { shameCacheController } from "@/controllers/ShameCacheController";
import { GitHubRepo, GitHubProfile } from "@/types/types";
import { Message } from "ai";
import translations from "@/translations";

// Initialize OpenAI client with Vercel AI SDK
const openai = createOpenAI({
  apiKey: process.env.OPENAI_KEY || "",
});

// Initialize DeepSeek client
const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

// Check if caching is enabled
const isCacheEnabled = process.env.NEXT_PUBLIC_CACHE !== "false";

// Get the model to use from environment variable
const modelToUse = (
  process.env.NEXT_PUBLIC_LLM || "gpt-3.5-turbo"
).toLowerCase();

export async function GET(request: Request) {
  // Get client IP for rate limiting
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const clientIp = forwardedFor
    ? forwardedFor.split(",")[0].trim()
    : "unknown-ip";

  // Get language from query string first, then fallback to Accept-Language header
  const { searchParams } = new URL(request.url);
  const queryLang = searchParams.get("lang");
  const acceptLanguage = headersList.get("accept-language") || "";

  // Prioritize the language parameter if provided
  const preferredLanguage =
    queryLang === "pt-BR"
      ? "pt-BR"
      : queryLang === "en-US"
      ? "en-US"
      : acceptLanguage.includes("pt")
      ? "pt-BR"
      : "en-US";

  // Get translations for the preferred language
  const t = translations[preferredLanguage];

  // Check rate limit
  if (isRateLimited(clientIp)) {
    const resetSeconds = getRateLimitReset(clientIp);

    return NextResponse.json(
      {
        error: `${t.errors.rateLimitExceeded} ${t.errors.seconds}`,
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

  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: t.errors.usernameRequired },
      { status: 400 }
    );
  }

  try {
    let cachedShame = null;

    // Check cache first before making external API calls
    cachedShame = await shameCacheController.get(
      username,
      preferredLanguage,
      modelToUse
    );

    // Use cached results if available and caching is enabled
    if (cachedShame && isCacheEnabled) {
      return NextResponse.json({
        shame: cachedShame.shame_text,
        language: cachedShame.language,
        fromCache: true,
        model: cachedShame.llm_model || modelToUse,
      });
    }

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

    // Prepare data for LLM
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

    // Set system prompt from translations
    const systemPrompt = t.api.prompts.system;

    // Correctly type the messages for AI SDK
    const messages: Message[] = [
      {
        id: "system",
        role: "system",
        content: systemPrompt,
      },
      {
        id: "user",
        role: "user",
        content: `Roast this GitHub profile in a funny way: ${JSON.stringify(
          githubProfile
        )}`,
      },
    ];

    // Set shouldStream to true by default when no cache is available
    const shouldStream = true;

    if (shouldStream) {
      if (modelToUse === "deepseek") {
        const { textStream } = streamText({
          model: deepseek("deepseek-chat"),
          messages,
          temperature: 0.7,
          maxTokens: 500,
        });

        // Create a variable to collect the full text for saving to cache
        let fullStreamText = "";

        return new Response(
          new ReadableStream({
            async start(controller) {
              try {
                const encoder = new TextEncoder();
                for await (const delta of textStream) {
                  fullStreamText += delta; // Collect the full text
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text: delta })}\n\n`
                    )
                  );
                }

                // Save to cache after the stream is complete
                await shameCacheController
                  .cacheUser({
                    username: username,
                    shame_text: fullStreamText,
                    language: preferredLanguage,
                    llm_model: modelToUse,
                  })
                  .catch((err) =>
                    console.error("Failed to save to cache:", err)
                  );

                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              } catch (error) {
                console.error("Stream error:", error);
                controller.error(error);
              }
            },
          }),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          }
        );
      } else {
        const { textStream } = streamText({
          model: openai("gpt-3.5-turbo"),
          messages,
          temperature: 0.7,
          maxTokens: 500,
        });

        // Create a variable to collect the full text for saving to cache
        let fullStreamText = "";

        return new Response(
          new ReadableStream({
            async start(controller) {
              try {
                const encoder = new TextEncoder();
                for await (const delta of textStream) {
                  fullStreamText += delta; // Collect the full text
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ text: delta })}\n\n`
                    )
                  );
                }

                // Save to cache after the stream is complete
                await shameCacheController
                  .cacheUser({
                    username: username,
                    shame_text: fullStreamText,
                    language: preferredLanguage,
                    llm_model: modelToUse,
                  })
                  .catch((err) =>
                    console.error("Failed to save to cache:", err)
                  );

                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              } catch (error) {
                console.error("Stream error:", error);
                controller.error(error);
              }
            },
          }),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          }
        );
      }
    }

    // This part should never be reached with the new logic
    // but keep as fallback
    let shameText = "";

    // Generate shame with the model specified in environment variable
    try {
      if (modelToUse === "deepseek") {
        // Generate shame with DeepSeek
        const stream = streamText({
          model: deepseek("deepseek-chat"),
          messages,
          temperature: 0.7,
          maxTokens: 500,
        });

        // Collect all chunks into a single string
        let fullText = "";
        for await (const chunk of stream.textStream) {
          fullText += chunk;
        }
        shameText = fullText;
      } else {
        // Default to OpenAI gpt-3.5-turbo using Vercel AI SDK
        const stream = streamText({
          model: openai("gpt-3.5-turbo"),
          messages,
          temperature: 0.7,
          maxTokens: 500,
        });

        // Collect all chunks into a single string
        let fullText = "";
        for await (const chunk of stream.textStream) {
          fullText += chunk;
        }
        shameText = fullText;
      }
    } catch (error) {
      console.error("Error generating text:", error);
      shameText = "";
    }

    // Use fallback text from translations if the response is empty
    const finalShameText = shameText || t.api.fallbackText;

    // Always store the result in cache regardless of cache setting
    await shameCacheController.cacheUser({
      username: username,
      shame_text: finalShameText,
      language: preferredLanguage,
      llm_model: modelToUse,
    });

    return NextResponse.json({
      shame: finalShameText,
      language: preferredLanguage,
      fromCache: false,
      model: modelToUse,
    });
  } catch (error) {
    console.error("Error:", error);

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json(
        { error: t.errors.userNotFound },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: t.errors.requestFailed },
      { status: 500 }
    );
  }
}
