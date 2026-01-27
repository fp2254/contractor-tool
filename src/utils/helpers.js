import { execSync } from "child_process";

let cachedChromiumPath = undefined;

export function getChromiumPath() {
  if (cachedChromiumPath !== undefined) return cachedChromiumPath;

  const commands = ["which chromium", "which chromium-browser", "which google-chrome"];
  for (const cmd of commands) {
    try {
      cachedChromiumPath = execSync(cmd, { encoding: "utf-8" }).trim();
      if (cachedChromiumPath) return cachedChromiumPath;
    } catch (e) {}
  }

  const fallbacks = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    process.env.CHROMIUM_PATH,
  ];
  for (const p of fallbacks) {
    if (p) {
      cachedChromiumPath = p;
      return cachedChromiumPath;
    }
  }

  cachedChromiumPath = null;
  return null;
}

const badWordsList = ["damn", "hell", "crap", "shit", "fuck", "ass", "bitch", "bastard", "piss"];
export const filter = {
  clean: (text) => {
    if (!text) return text;
    let result = text;
    badWordsList.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      result = result.replace(regex, "*".repeat(word.length));
    });
    return result;
  },
};

export function makeReferralCode(userId) {
  if (userId) {
    return userId.replace(/-/g, "").slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function buildPaymentUrl(provider, value, amount, invoiceNumber) {
  if (!provider || !value) return null;

  const cleanValue = value.trim();
  const formattedAmount = parseFloat(amount).toFixed(2);
  const encodedNote = encodeURIComponent(invoiceNumber || "");

  switch (provider.toLowerCase()) {
    case "venmo":
      return `https://venmo.com/${encodeURIComponent(cleanValue.replace(/^@/, ""))}?txn=pay&amount=${formattedAmount}&note=${encodedNote}`;
    case "paypal":
      return `https://paypal.me/${encodeURIComponent(cleanValue.replace(/^@/, ""))}/${formattedAmount}`;
    case "cashapp":
      const cashappUsername = cleanValue.startsWith("$") ? cleanValue.slice(1) : cleanValue;
      return `https://cash.app/$${encodeURIComponent(cashappUsername)}/${formattedAmount}`;
    case "zelle":
      return cleanValue;
    case "square":
    case "stripe":
    case "custom":
      return cleanValue.startsWith("http") ? cleanValue : `https://${cleanValue}`;
    default:
      return cleanValue.startsWith("http") ? cleanValue : null;
  }
}
