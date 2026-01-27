import { supabaseAdmin, pgPool } from "../utils/db.js";
import { AI_MODELS } from "../utils/config.js";

export async function logAIUsage(userId, toolType) {
  console.log(`Logging AI usage for user ${userId}, tool: ${toolType}`);

  try {
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("ai_actions_used")
      .eq("id", userId)
      .single();

    if (fetchError) {
      console.error("Failed to fetch profile for AI usage:", fetchError);
      return;
    }

    const currentUsage = profile?.ai_actions_used || 0;
    const newUsage = currentUsage + 1;

    try {
      await pgPool.query(`UPDATE profiles SET ai_actions_used = $1 WHERE id = $2`, [
        newUsage,
        userId,
      ]);
      console.log(`AI usage updated: ${currentUsage} -> ${newUsage}`);
    } catch (updateError) {
      console.error("Failed to update AI usage:", updateError);
    }

    try {
      await pgPool.query(`INSERT INTO ai_usage_logs (user_id, tool_type) VALUES ($1, $2)`, [
        userId,
        toolType,
      ]);
    } catch (logErr) {}
  } catch (err) {
    console.error("Failed to log AI usage:", err);
  }
}

export async function getAIUsageInfo(userId) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("ai_actions_used, ai_actions_limit, ai_billing_cycle_start")
      .eq("id", userId)
      .single();

    if (!profile) return null;

    const cycleStart = new Date(profile.ai_billing_cycle_start || Date.now());
    const resetDate = new Date(cycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);

    const actionsUsed = profile.ai_actions_used || 0;
    const actionsLimit = profile.ai_actions_limit || 300;

    return {
      actions_used: actionsUsed,
      actions_limit: actionsLimit,
      reset_date: resetDate.toISOString(),
      is_at_limit: actionsUsed >= actionsLimit,
      is_warning: actionsUsed >= 250 && actionsUsed < actionsLimit,
    };
  } catch (err) {
    console.error("Failed to get AI usage info:", err);
    return null;
  }
}

export const VOICE_COMMAND_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_client",
      description: "Create a new client/customer in the system",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Full name of the client" },
          phone: { type: "string", description: "Phone number (optional)" },
          email: { type: "string", description: "Email address (optional)" },
          address: { type: "string", description: "Street address (optional)" },
          notes: { type: "string", description: "Additional notes (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_inventory_item",
      description: "Add an item to inventory",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the inventory item" },
          quantity: { type: "number", description: "Quantity to add (default 1)" },
          unit_price: { type: "number", description: "Price per unit in dollars" },
          category: {
            type: "string",
            description: "Category of the item",
            enum: ["Electrical", "Plumbing", "HVAC", "Tools", "Materials", "Other"],
          },
          notes: { type: "string", description: "Additional notes (optional)" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_quote",
      description: "Create a quote/estimate for a client",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          address: { type: "string", description: "Job address (optional)" },
          job_type: { type: "string", description: "Type of job" },
          line_items: {
            type: "array",
            description: "List of items/services in the quote",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Brief service/item description" },
                quantity: { type: "number", description: "Quantity (default 1)" },
                unit_price: { type: "number", description: "Price per unit in dollars" },
              },
              required: ["description", "unit_price"],
            },
          },
          notes: { type: "string", description: "Additional notes (optional)" },
        },
        required: ["client_name", "line_items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_invoice",
      description: "Create an invoice for a client",
      parameters: {
        type: "object",
        properties: {
          client_name: { type: "string", description: "Name of the client" },
          address: { type: "string", description: "Job address (optional)" },
          job_type: { type: "string", description: "Type of job" },
          line_items: {
            type: "array",
            description: "List of items/services in the invoice",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Brief service/item description" },
                quantity: { type: "number", description: "Quantity (default 1)" },
                unit_price: { type: "number", description: "Price per unit in dollars" },
              },
              required: ["description", "unit_price"],
            },
          },
          notes: { type: "string", description: "Additional notes (optional)" },
        },
        required: ["client_name", "line_items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Schedule a job or appointment on the calendar",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the event" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
          time: { type: "string", description: "Time in HH:MM format (24-hour)" },
          duration_hours: { type: "number", description: "Duration in hours (default 1)" },
          location: { type: "string", description: "Location (optional)" },
          notes: { type: "string", description: "Additional notes (optional)" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "unknown_command",
      description: "Use when the user's intent is unclear or doesn't match any command",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Helpful message to the user" },
        },
        required: ["message"],
      },
    },
  },
];

export { AI_MODELS };
