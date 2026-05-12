export function buildIcsContent(
  jobId: string,
  jobTitle: string,
  date: string,
  startTime: string,
  endTime: string,
  address: string
): string {
  const pad6 = (t: string) => (t || "000000").replace(":", "").padEnd(6, "0");
  const toIcsDate = (d: string, t: string) =>
    d.replace(/-/g, "") + "T" + pad6(t);

  const dtStart = toIcsDate(date, startTime);
  const computedEnd = startTime
    ? String(Number(startTime.split(":")[0]) + 2).padStart(2, "0") + ":00"
    : "10:00";
  const dtEnd = endTime ? toIcsDate(date, endTime) : toIcsDate(date, computedEnd);

  const nowIso = new Date().toISOString();
  const stamp = nowIso.split("").filter(c => c !== "-" && c !== ":" && c !== ".").join("").slice(0, 15) + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TradeBase//EN",
    "BEGIN:VEVENT",
    "DTSTART:" + dtStart,
    "DTEND:" + dtEnd,
    "SUMMARY:" + jobTitle,
    address ? "LOCATION:" + address : "",
    "DTSTAMP:" + stamp,
    "UID:" + jobId + "@tradebase",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}
