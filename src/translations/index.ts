export type Language = "en-US" | "pt-BR";

export type TranslationStrings = {
  title: string;
  placeholder: string;
  button: string;
  loading: string;
  shameReportTitle: string;
  errors: {
    rateLimitExceeded: string;
    seconds: string;
    userNotFound: string;
    failedToProcess: string;
    usernameRequired: string;
    requestFailed: string;
  };
  api: {
    prompts: {
      system: string;
    };
    fallbackText: string;
  };
};

const translations: Record<Language, TranslationStrings> = {
  "en-US": {
    title: "roast my github",
    placeholder: "Enter GitHub username to roast",
    button: "Roast Them! 🔥",
    loading: "Roasting... 🍗",
    shameReportTitle: "The Roast Report:",
    errors: {
      rateLimitExceeded: "Rate limit exceeded. Try again in",
      seconds: "seconds",
      userNotFound: "GitHub user not found",
      failedToProcess: "Failed to roast GitHub user",
      usernameRequired: "GitHub username is required",
      requestFailed: "Failed to process request",
    },
    api: {
      prompts: {
        system:
          "You are a sarcastic and humorous tech critic. Your job is to playfully roast someone's GitHub profile in a funny way. Keep it light-hearted, don't be actually mean or offensive. Select a few repositories to make fun of, and use the user's bio and other information to create a funny roast. Use a few emojis. IMPORTANT: Respond ONLY in English.",
      },
      fallbackText:
        "Hmm, I couldn't think of anything clever to say. This GitHub profile is too boring to roast.",
    },
  },
  "pt-BR": {
    title: "fritar meu github",
    placeholder: "Digite o nome de usuário do GitHub",
    button: "Fritar! 🔥",
    loading: "Preparando a fritura... 🍳",
    shameReportTitle: "O Relatório da Vergonha:",
    errors: {
      rateLimitExceeded: "Limite de requisições excedido. Tente novamente em",
      seconds: "segundos",
      userNotFound: "Usuário do GitHub não encontrado",
      failedToProcess: "Falha ao zoar usuário do GitHub",
      usernameRequired: "Nome de usuário do GitHub é obrigatório",
      requestFailed: "Falha ao processar a requisição",
    },
    api: {
      prompts: {
        system:
          "Você é um crítico de tecnologia sarcástico e bem-humorado. Seu trabalho é zoar o perfil do GitHub de alguém de forma divertida. Mantenha um tom leve, não seja ofensivo de verdade. Selecione alguns repositórios para fazer piada, e use a bio do usuário e outras informações para criar uma zoação engraçada. Use alguns emojis na resposta. IMPORTANTE: Responda APENAS em português brasileiro.",
      },
      fallbackText:
        "Hmm, não consegui pensar em algo inteligente para dizer. Este perfil do GitHub é entediante demais para zoar.",
    },
  },
};

export default translations;
