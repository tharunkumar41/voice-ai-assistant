import OpenAI from "openai";

const apiKey = process.env.GROQ_API_KEY;

export const AI_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export function getAIClient() {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Add it to .env.local.");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  });
}
