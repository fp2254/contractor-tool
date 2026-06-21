const RETELL_BASE = "https://api.retellai.com";

function getApiKey(): string {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error("Missing RETELL_API_KEY. Add it to your Replit Secrets.");
  return key;
}

async function retellFetch(method: "GET" | "POST" | "DELETE" | "PATCH", path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${RETELL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (method === "DELETE" && (res.status === 204 || res.status === 200)) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Retell ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

export async function createRetellLlm(businessName: string): Promise<string> {
  const data = await retellFetch("POST", "/v2/create-retell-llm", {
    model: "gpt-5-mini",
    general_prompt: `You are a professional, friendly phone receptionist for ${businessName}. Your job is to:
1. Greet the caller warmly and ask how you can help
2. Listen to their reason for calling
3. Collect their name and phone number if not already known
4. Let them know someone will call them back shortly
5. Be brief, professional, and helpful

Do not discuss pricing or make commitments. Keep conversations under 3 minutes.`,
    begin_message: `Hi, thanks for calling ${businessName}! How can I help you today?`,
  });
  return data.llm_id;
}

export async function createRetellAgent(
  businessName: string,
  llmId: string,
  webhookUrl: string
): Promise<string> {
  const data = await retellFetch("POST", "/v2/create-agent", {
    agent_name: `${businessName} AI Receptionist`,
    voice_id: "11labs-Myra",
    response_engine: {
      type: "retell-llm",
      llm_id: llmId,
    },
    webhook_url: webhookUrl,
    enable_backchannel: true,
    language: "en-US",
    ambient_sound: null,
    responsiveness: 1,
    interruption_sensitivity: 1,
  });
  return data.agent_id;
}

export async function deleteRetellAgent(agentId: string): Promise<void> {
  await retellFetch("DELETE", `/v2/delete-agent/${agentId}`).catch(() => {});
}

export async function deleteRetellLlm(llmId: string): Promise<void> {
  await retellFetch("DELETE", `/v2/delete-retell-llm/${llmId}`).catch(() => {});
}

export function validateRetellWebhook(authHeader: string | null): boolean {
  const key = process.env.RETELL_API_KEY;
  if (!key || !authHeader) return false;
  return authHeader === `Bearer ${key}`;
}
