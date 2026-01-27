import { supabaseAdmin, pgPool } from "../utils/db.js";

export async function authMiddleware(req, res, next) {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.userId = null;
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    req.userId = error || !data.user ? null : data.user.id;
  } catch (err) {
    req.userId = null;
  }

  next();
}

export async function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }
  next();
}

export async function requireSubscription(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }
  next();
}

export async function requireAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", req.userId)
    .single();

  if (error || !profile || !profile.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

export async function requireAI(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: "Not authenticated", needsAuth: true });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("ai_enabled, ai_actions_used, ai_actions_limit, ai_billing_cycle_start")
    .eq("id", req.userId)
    .single();

  if (error || !profile || !profile.ai_enabled) {
    return res.status(403).json({ error: "AI subscription required", needsAI: true });
  }

  const cycleStart = new Date(profile.ai_billing_cycle_start || Date.now());
  const now = new Date();
  const monthsPassed =
    (now.getFullYear() - cycleStart.getFullYear()) * 12 + (now.getMonth() - cycleStart.getMonth());

  if (monthsPassed >= 1) {
    try {
      await pgPool.query(
        `UPDATE profiles SET ai_actions_used = 0, ai_billing_cycle_start = $1 WHERE id = $2`,
        [now.toISOString(), req.userId]
      );
    } catch (resetErr) {
      console.error("[requireAI] Failed to reset billing cycle:", resetErr);
    }
    req.aiActionsUsed = 0;
    req.aiActionsLimit = profile.ai_actions_limit || 300;
  } else {
    req.aiActionsUsed = profile.ai_actions_used || 0;
    req.aiActionsLimit = profile.ai_actions_limit || 300;
  }

  if (req.aiActionsUsed >= req.aiActionsLimit) {
    const resetDate = new Date(cycleStart);
    resetDate.setMonth(resetDate.getMonth() + 1);
    return res.status(429).json({
      error: "AI action limit reached",
      needsUpgrade: true,
      actionsUsed: req.aiActionsUsed,
      actionsLimit: req.aiActionsLimit,
      resetDate: resetDate.toISOString(),
      message: `You've used ${req.aiActionsUsed}/${req.aiActionsLimit} AI actions this month.`,
    });
  }

  next();
}

export async function hasActiveSubscription(userId) {
  if (!userId) return false;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_status, trial_ends_at, subscription_ends_at")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  if (profile.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at);
    if (trialEnd > new Date()) return true;
  }

  if (profile.subscription_status === "active") {
    if (!profile.subscription_ends_at) return true;
    const subEnd = new Date(profile.subscription_ends_at);
    if (subEnd > new Date()) return true;
  }

  return false;
}
