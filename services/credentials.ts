
/**
 * 🔐 SECURE CREDENTIAL RESONANCE MODULE
 * Mengotomatisasi deteksi kunci dari .env (Process Environment)
 */

type Env = Record<string, string | undefined>;

const getEnv = (): Env => {
  if (typeof process !== "undefined" && process.env) {
    return process.env as Env;
  }
  // Fallback untuk browser runtime jika diinjeksikan via build tool
  return (window as any)._env_ || {};
};

export const getSystemCredentials = () => {
  const env = getEnv();

  const getK = (key: string) => env[key] || "";

  return {
    // ☁️ Supabase Cloud Coordinates
    supabase: {
      url: getK("SUPABASE_URL"),
      key: getK("SUPABASE_ANON_KEY") || getK("SUPABASE_KEY")
    },

    // 🤖 AI Neural Hubs
    openai: getK("OPENAI_API_KEY"),
    openrouter: getK("OPENROUTER_API_KEY"),
    pollinations: getK("POLLINATIONS_API_KEY"),
    huggingface: getK("HUGGINGFACE_API_KEY"),
    google: getK("API_KEY") || getK("GEMINI_API_KEY") || getK("GOOGLE_API_KEY"),

    // 🏛️ GCP Service Account (Automated)
    serviceAccount: {
      type: getK("GCP_TYPE") || "service_account",
      project_id: getK("GCP_PROJECT_ID"),
      private_key_id: getK("GCP_PRIVATE_KEY_ID"),
      private_key: (getK("GCP_PRIVATE_KEY") || "").replace(/\\n/g, '\n'),
      client_email: getK("GCP_CLIENT_EMAIL"),
      client_id: getK("GCP_CLIENT_ID"),
      auth_uri: getK("GCP_AUTH_URI") || "https://accounts.google.com/o/oauth2/auth",
      token_uri: getK("GCP_TOKEN_URI") || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: getK("GCP_AUTH_PROVIDER_X509_CERT_URL") || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: getK("GCP_CLIENT_X509_CERT_URL"),
      universe_domain: getK("GCP_UNIVERSE_DOMAIN") || "googleapis.com"
    }
  };
};
