import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface AiPromptConfig {
  role: string;
  rules: string[];
  context: Record<string, unknown>;
  task: string;
  schema: string;
}

export function buildSystemPrompt(cfg: AiPromptConfig): string {
  return [
    `## ROLE\n${cfg.role.trim()}`,
    `## RULES\n${cfg.rules.map((r) => `- ${r}`).join("\n")}`,
    `## OUTPUT SCHEMA\nReturn ONLY valid JSON matching this exact shape — no markdown, no prose:\n${cfg.schema}`,
  ].join("\n\n");
}

export function buildUserContent(cfg: AiPromptConfig, input: string): string {
  const contextLines = Object.entries(cfg.context)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("\n");

  const parts: string[] = [];
  if (contextLines) parts.push(`## CONTEXT\n${contextLines}`);
  parts.push(`## TASK\n${cfg.task}`);
  parts.push(`## INPUT\n${input.trim()}`);
  return parts.join("\n\n");
}

export function buildMessages(
  cfg: AiPromptConfig,
  input: string
): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: buildSystemPrompt(cfg) },
    { role: "user", content: buildUserContent(cfg, input) },
  ];
}
