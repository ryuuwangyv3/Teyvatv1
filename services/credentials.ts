
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
      requireKey("REACT_APP_API_KEY") ||
      process.env.API_KEY,

    huggingface: requireKey("HUGGINGFACE_API_KEY"),

    // --- GOOGLE SERVICE ACCOUNT INTEGRATION ---
    serviceAccount: {
      type: "service_account",
      project_id: requireKey("GCP_PROJECT_ID") || "alyaai",
      private_key_id: requireKey("GCP_PRIVATE_KEY_ID") || "key_id",
      private_key: requireKey("GCP_PRIVATE_KEY") || "private_key",
      client_email: requireKey("GCP_CLIENT_EMAIL") || "ryuuwangyv3@alyaai.iam.gserviceaccount.com",
      client_id: requireKey("GCP_CLIENT_ID") || "1028478115566727******",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/ryuuwangyv3%40alyaai.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    }
  };
};
