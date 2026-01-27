import dotenv from "dotenv";
dotenv.config();

export const BUILD_VERSION = 141;
export const BUILD_TIMESTAMP = "2025-01-27-v141-modular-refactor";
export const BUILD_ID = `v141-modular-${Date.now()}`;

export const AI_MODELS = {
  transcription: process.env.AI_TRANSCRIPTION_MODEL || "whisper-1",
  chat: process.env.AI_CHAT_MODEL || "gpt-4o-mini",
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0,
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 1024
};

export const port = process.env.PORT || 5000;
