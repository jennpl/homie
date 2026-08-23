import dotenv from "dotenv";

let loaded = false;

export function loadEnv(): NodeJS.ProcessEnv {
  if (!loaded) {
    dotenv.config({ path: [".env.local", ".env"], quiet: true });
    loaded = true;
  }
  return process.env;
}

export function requireEnv(name: string): string {
  loadEnv();
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
