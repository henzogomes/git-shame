import { NextResponse } from "next/server";
import axios from "axios";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { headers } from "next/headers";
import { isRateLimited, getRateLimitReset } from "@/lib/rate-limiter";
import { shameCacheController } from "@/controllers/ShameCacheController";
import { GitHubRepo, GitHubProfile } from "@/types/types";

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
const modelToUse = (process.env.NEXT_PUBLIC_LLM || "chatgpt").toLowerCase();

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

  // Check rate limit
  if (isRateLimited(clientIp)) {
    const resetSeconds = getRateLimitReset(clientIp);

    const errorMessage =
      preferredLanguage === "pt-BR"
        ? "Limite de requisições excedido. Tente novamente mais tarde."
        : "Rate limit exceeded. Try again later.";

    return NextResponse.json(
      {
        error: errorMessage,
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
    const errorMessage =
      preferredLanguage === "pt-BR"
        ? "Nome de usuário do GitHub é obrigatório"
        : "GitHub username is required";

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    // Check cache first before making external API calls (only if caching is enabled)
    if (isCacheEnabled) {
      const cachedShame = await shameCacheController.get(
        username,
        preferredLanguage
      );

      if (cachedShame) {
        return NextResponse.json({
          shame: cachedShame.shame_text,
          language: cachedShame.language,
          fromCache: true,
          model: modelToUse,
        });
      }
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

    // Set system prompt based on language
    let systemPrompt: string;
    if (preferredLanguage === "pt-BR") {
      systemPrompt =
        "Você é um crítico de tecnologia sarcástico e bem-humorado. Seu trabalho é zoar o perfil do GitHub de alguém de forma divertida. Mantenha um tom leve, não seja ofensivo de verdade. Selecione alguns repositórios para fazer piada, e use a bio do usuário e outras informações para criar uma zoação engraçada. Use alguns emojis na resposta. IMPORTANTE: Responda APENAS em português brasileiro.";
    } else {
      systemPrompt =
        "You are a sarcastic and humorous tech critic. Your job is to playfully roast someone's GitHub profile in a funny way. Keep it light-hearted, don't be actually mean or offensive. Select a few repositories to make fun of, and use the user's bio and other information to create a funny roast. Use a few emojis. IMPORTANT: Respond ONLY in English.";
    }

    let shameText = "";

    // Generate shame with the model specified in environment variable
    if (modelToUse === "deepseek") {
      // Generate shame with DeepSeek
      const { text } = await generateText({
        model: deepseek("deepseek-chat"),
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Roast this GitHub profile in a funny way: ${JSON.stringify(
              githubProfile
            )}`,
          },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });

      shameText = text || "";
    } else {
      // Default to OpenAI ChatGPT using Vercel AI SDK
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Roast this GitHub profile in a funny way: ${JSON.stringify(
              githubProfile
            )}`,
          },
        ],
        temperature: 0.7,
        maxTokens: 500,
      });

      shameText = text || "";
    }

    // Use fallback text if the response is empty
    const finalShameText =
      shameText ||
      (preferredLanguage === "pt-BR"
        ? "Hmm, não consegui pensar em algo inteligente para dizer. Este perfil do GitHub é entediante demais para zoar."
        : "Hmm, I couldn't think of anything clever to say. This GitHub profile is too boring to roast.");

    // Store the result in cache (only if caching is enabled)
    if (isCacheEnabled) {
      await shameCacheController.create({
        username: username,
        shame_text: finalShameText,
        language: preferredLanguage,
      });
    }

    return NextResponse.json({
      shame: finalShameText,
      language: preferredLanguage,
      fromCache: false,
      model: modelToUse,
    });
  } catch (error) {
    console.error("Error:", error);

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      const errorMessage =
        preferredLanguage === "pt-BR"
          ? "Usuário do GitHub não encontrado"
          : "GitHub user not found";

      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    const errorMessage =
      preferredLanguage === "pt-BR"
        ? "Falha ao processar a requisição"
        : "Failed to process request";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
