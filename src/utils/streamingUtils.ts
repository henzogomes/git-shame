/**
 * Simulates streaming text by gradually revealing the content with random delays
 */
export const simulateStreamingText = async (
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

/**
 * Handles a server-sent event stream for real-time text streaming
 */
export const handleSSEStream = async (
  response: Response,
  onChunk: (chunk: { text: string; avatarUrl?: string }) => void
): Promise<{ text: string; avatarUrl?: string }> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let avatarUrl: string | undefined;

  if (!reader) {
    throw new Error("Response body is null");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const jsonData = JSON.parse(line.substring(6));

            if (jsonData.text) {
              fullText += jsonData.text;

              // If this chunk contains the avatar URL
              if (jsonData.avatarUrl) {
                avatarUrl = jsonData.avatarUrl;
              }

              onChunk(jsonData);
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        }
      }
    }

    return { text: fullText, avatarUrl };
  } finally {
    reader.releaseLock();
  }
};

/**
 * Helper function to detect language from browser
 */
export const getInitialLanguage = (): "en-US" | "pt-BR" => {
  if (typeof window !== "undefined") {
    return window.navigator.language.startsWith("pt") ? "pt-BR" : "en-US";
  }
  return "en-US"; // Default fallback
};
