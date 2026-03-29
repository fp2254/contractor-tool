import { z } from "zod";
import { getOpenAIClient } from "@/lib/openai";
import { buildMessages, type AiPromptConfig } from "@/lib/ai/prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAiLimit } from "@/lib/ai/limits";

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number = 503
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

export interface AiRequestConfig<T> {
  feature: string;
  orgId: string;
  userId?: string | null;
  promptConfig: AiPromptConfig;
  input: string;
  schema: z.ZodSchema<T>;
  inputJson?: Record<string, unknown>;
  options?: {
    maxTokens?: number;
    log?: boolean;
  };
}

export interface AiResponse<T> {
  result: T;
  aiRunId: string | null;
  /** Present when the org is approaching their daily AI request limit */
  usageWarning?: string;
}

export async function callOpenAI(
  messages: ReturnType<typeof buildMessages>,
  maxTokens = 1000
): Promise<string> {
  const client = getOpenAIClient();
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
      messages,
    });
    return completion.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    console.error("[callOpenAI] error:", err);
    throw new AiServiceError("AI service unavailable — please try again");
  }
}

export function validateAIResponse<T>(
  schema: z.ZodSchema<T>,
  raw: string
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiServiceError("AI returned malformed JSON", 500);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error("[validateAIResponse] schema mismatch:", result.error.flatten());
    throw new AiServiceError("AI response did not match expected schema", 500);
  }
  return result.data;
}

export async function logAIRun(
  feature: string,
  orgId: string,
  userId: string | null | undefined,
  inputText: string,
  inputJson: Record<string, unknown> | null | undefined,
  outputJson: unknown
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await (admin as ReturnType<typeof createAdminClient>)
      .from("ai_runs" as "orgs")
      .insert({
        org_id: orgId,
        user_id: userId ?? null,
        feature,
        input_text: inputText.slice(0, 2000),
        input_json: inputJson ?? null,
        output_json: outputJson,
      } as never)
      .select("id")
      .single();
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.warn("[logAIRun] non-fatal log failure:", err);
    return null;
  }
}

export async function handleAIRequest<T>(
  cfg: AiRequestConfig<T>
): Promise<AiResponse<T>> {
  const { maxTokens = 1000, log = true } = cfg.options ?? {};

  // ── Limit check (runs before the OpenAI call so we never waste tokens) ───
  const limitStatus = await checkAiLimit(cfg.orgId);
  if (!limitStatus.allowed) {
    throw new AiServiceError(
      limitStatus.error ?? "Daily AI limit reached. Contact support to increase your limit.",
      429
    );
  }

  const messages = buildMessages(cfg.promptConfig, cfg.input);

  const raw = await callOpenAI(messages, maxTokens);

  const result = validateAIResponse(cfg.schema, raw);

  let aiRunId: string | null = null;
  if (log) {
    aiRunId = await logAIRun(
      cfg.feature,
      cfg.orgId,
      cfg.userId,
      cfg.input,
      cfg.inputJson ?? null,
      result
    );
  }

  return { result, aiRunId, usageWarning: limitStatus.warning };
}
