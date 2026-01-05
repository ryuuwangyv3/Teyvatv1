
/**
 * 🔐 SECURITY MODULE — ENV ONLY (PRODUCTION SAFE)
 * No hardcoded credentials.
 * Compatible with Vite, React, Next.js, Node.js
 */

type Env = Record<string, string | undefined>;

const getEnv = (): Env => {
  // Priority: process.env (Vite/Node/Next)
  if (typeof process !== "undefined" && process.env) {
    return process.env as Env;
  }
  return {};
};

export const getSystemCredentials = () => {
  const env = getEnv();

  const requireKey = (key: string) => {
    const value = env[key];
    return value || "";
  };

  return {
    // Supabase
    url: requireKey("SUPABASE_URL"),
    key:
      requireKey("SUPABASE_KEY") ||
      requireKey("SUPABASE_ANON_KEY"),

    // AI Providers
    openai: requireKey("OPENAI_API_KEY"),

    openrouter:
      requireKey("OPENROUTER_API_KEY") ||
      requireKey("OPENROUTER_KEY"),

    pollinations:
      requireKey("POLLINATIONS_API_KEY") ||
      requireKey("POLLINATIONS_KEY"),

    google:
      requireKey("GEMINI_API_KEY") ||
      requireKey("GOOGLE_API_KEY") ||
      requireKey("NEXT_PUBLIC_API_KEY") ||
      requireKey("REACT_APP_API_KEY"),

    huggingface: requireKey("HUGGINGFACE_API_KEY")
  };
};
