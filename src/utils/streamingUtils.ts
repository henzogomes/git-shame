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
  onUpdate: (text: string) => void
) => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  let fullText = "";
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.substring(6);
          if (data === "[DONE]") {
            // Stream completed
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              onUpdate(fullText);
            }
          } catch (e) {
            console.log(e);
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
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
