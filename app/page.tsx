import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Bebas_Neue, Oswald, JetBrains_Mono } from "next/font/google";

const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-bebas", display: "swap" });
const oswald = Oswald({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const mono = JetBrains_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono", display: "swap" });

const BK = "#0a0a0a";
const BK2 = "#141414";
const ST = "#1f1f1f";
const ST2 = "#2a2a2a";
const BN = "#f4f1ea";
const OR = "#ff5b1f";
const YE = "#ffd400";
const GR = "#00d96e";

export const metadata: Metadata = {
  title: "TradeBase — The Operating System for Contractors",
  description:
    "TradeBase replaces five tools with one. Capture leads from your site, send quotes in 60 seconds, follow up with one tap, and get paid faster. Built for the truck — not the desk.",
  openGraph: {
    title: "TradeBase — The Operating System for Contractors",
    description:
      "TradeBase replaces five tools with one. Capture leads from your site, send quotes in 60 seconds, follow up with one tap, and get paid faster.",
    url: "https://tradebase.contractors",
    siteName: "TradeBase",
    type: "website",
  },
};

const SN = ({ n, label }: { n: string; label: string }) => (
  <div
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      letterSpacing: "0.25em",
      textTransform: "uppercase" as const,
      marginBottom: 20,
      color: OR,
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}
  >
    <div style={{ width: 32, height: 2, background: OR, flexShrink: 0 }} />
    {n} — {label}
  </div>
);

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <div
      className={`${bebasNeue.variable} ${oswald.variable} ${mono.variable}`}
      style={{
        background: BN,
        color: BK,
        fontFamily: "'Inter', sans-serif",
        WebkitFontSmoothing: "antialiased",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes tb-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .tb-pulse { animation: tb-pulse 2s infinite; }
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        details[open] > summary .faq-icon::after { content: "−"; background: ${OR}; color: ${BK}; }
        details > summary .faq-icon::after { content: "+"; background: ${BK}; color: ${BN}; }
        .faq-icon { font-family: 'Bebas Neue', sans-serif; font-size: 32px; width: 32px; height: 32px; display: grid; place-items: center; flex-shrink: 0; line-height: 0; }
        a.tb-nav:hover { color: ${YE} !important; }
        .tb-btn-primary:hover { background: ${YE} !important; transform: translateY(-2px); }
        .tb-card-flow:hover { background: #e8e3d6 !important; }
        .tb-ai-tool:hover { background: ${ST} !important; }
        .tb-footer-link:hover { color: ${YE} !important; }
      `}</style>

      {/* ── TOPBAR ── */}
      <div
        style={{
          background: BK,
          color: BN,
          padding: "9px 0",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: YE }}>
            <div
              className="tb-pulse"
              style={{ width: 6, height: 6, background: YE, borderRadius: "50%" }}
            />
            <span>Founder Pricing — First 200 Contractors at $20/mo</span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              opacity: 0.65,
              color: BN,
            }}
            className="hidden sm:flex"
          >
            <span>BUILT IN MAINE</span>
            <span>FOR THE FIELD</span>
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav
        style={{
          background: BK,
          color: BN,
          padding: "18px 0",
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: BN }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                background: OR,
                display: "grid",
                placeItems: "center",
                color: BK,
                fontWeight: 900,
                fontSize: 17,
                transform: "rotate(-3deg)",
                boxShadow: `3px 3px 0 ${YE}`,
                fontFamily: "sans-serif",
              }}
            >
              TB
            </div>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.04em" }}>
              TRADEBASE
            </span>
          </Link>
          <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
            {[
              { label: "Features", href: "#features" },
              { label: "Earn", href: "#earn" },
              { label: "Pricing", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="tb-nav"
                style={{
                  color: "rgba(244,241,234,0.75)",
                  textDecoration: "none",
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  transition: "color 0.15s",
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <Link
            href="/waitlist"
            className="tb-btn-primary"
            style={{
              background: OR,
              color: BK,
              padding: "10px 18px",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 13,
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            Join Founders
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header style={{ background: BK, color: BN, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle at 80% 20%, rgba(255,91,31,0.10) 0%, transparent 50%),
              linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
            backgroundSize: "auto, 48px 48px, 48px 48px",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "64px 24px 80px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
            gap: 48,
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left: copy */}
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,91,31,0.08)",
                border: "1px solid rgba(255,91,31,0.3)",
                padding: "8px 14px",
                marginBottom: 28,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: OR,
              }}
            >
              <div className="tb-pulse" style={{ width: 6, height: 6, background: OR, borderRadius: "50%" }} />
              <span>The Operating System for Contractors</span>
            </div>

            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "clamp(54px, 8vw, 108px)",
                lineHeight: 0.88,
                letterSpacing: "-0.005em",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              Your Website,
              <br />
              Leads, Quotes &amp;
              <br />
              <span style={{ position: "relative", display: "inline-block" }}>
                Jobs
                <span
                  style={{
                    position: "absolute",
                    left: -4,
                    right: -4,
                    bottom: 8,
                    height: 14,
                    background: OR,
                    zIndex: -1,
                    transform: "skew(-6deg)",
                    opacity: 0.85,
                    display: "block",
                  }}
                />
              </span>
              {" "}— In <span style={{ color: OR }}>One App</span>.
            </h1>

            <p
              style={{
                fontSize: "clamp(18px, 2vw, 20px)",
                lineHeight: 1.55,
                color: "rgba(244,241,234,0.78)",
                maxWidth: 540,
                marginBottom: 32,
              }}
            >
              TradeBase replaces five tools with one.{" "}
              <strong style={{ color: BN }}>
                Capture leads from your site, send quotes in 60 seconds, follow up with one tap, and get paid
                faster.
              </strong>{" "}
              Built for the truck — not the desk.
            </p>

            <ul style={{ listStyle: "none", marginBottom: 36, display: "grid", gap: 12, maxWidth: 540, padding: 0 }}>
              {[
                "Branded website included — connect your own domain",
                "Full CRM, quoting, invoicing, receipts, inventory",
                "8 AI tools that save hours every week",
                "Earn 10–20% lifetime commission referring other contractors",
              ].map((b) => (
                <li key={b} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "rgba(244,241,234,0.92)" }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      background: OR,
                      color: BK,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 13,
                    }}
                  >
                    ✓
                  </div>
                  {b}
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <Link
                href="/waitlist"
                className="tb-btn-primary"
                style={{
                  background: OR,
                  color: BK,
                  padding: "18px 32px",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontSize: 16,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s",
                }}
              >
                Claim Founder Spot — $20/mo →
              </Link>
              <a
                href="#features"
                style={{
                  background: "transparent",
                  color: BN,
                  padding: "18px 28px",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontSize: 16,
                  textDecoration: "none",
                  border: "2px solid rgba(244,241,234,0.25)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                See How It Works
              </a>
            </div>

            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "rgba(244,241,234,0.45)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: GR, marginRight: 4 }}>✓</span> No contract &nbsp;
              <span style={{ color: GR, margin: "0 4px" }}>✓</span> Cancel anytime &nbsp;
              <span style={{ color: GR, margin: "0 4px" }}>✓</span> Locked-in price for life
            </div>
          </div>

          {/* Right: mockups */}
          <div style={{ position: "relative", minHeight: 520, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* Dashboard window */}
            <div
              style={{
                position: "absolute",
                top: 20,
                left: 0,
                right: 40,
                background: BK2,
                border: `2px solid ${ST}`,
                boxShadow: `14px 14px 0 ${OR}`,
                transform: "rotate(-1deg)",
              }}
            >
              <div
                style={{
                  background: "#000",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  borderBottom: `1px solid ${ST}`,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                <div
                  style={{
                    marginLeft: 10,
                    background: ST,
                    padding: "5px 10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    flex: 1,
                    color: "#888",
                  }}
                >
                  app.tradebase.contractors/dashboard
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: BN }}>
                    Today&apos;s Pipeline
                  </div>
                  <div
                    style={{
                      background: GR,
                      color: BK,
                      padding: "4px 10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    ● LIVE
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                  {[
                    { n: "12", l: "New Leads", c: OR },
                    { n: "8", l: "Quoted", c: YE },
                    { n: "$8.4K", l: "Booked", c: GR },
                  ].map((s) => (
                    <div key={s.l} style={{ background: ST, padding: 12, borderLeft: `3px solid ${s.c}` }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, lineHeight: 1, color: BN }}>{s.n}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.1em", color: "#888", textTransform: "uppercase", marginTop: 3 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: ST, padding: 12 }}>
                  {[
                    { name: "Smith — 47 Oak St", stage: "NEW", c: OR },
                    { name: "Doyle — Basement test", stage: "QUOTED", c: YE },
                    { name: "Mills — Mitigation", stage: "BOOKED", c: GR },
                    { name: "Kane — Re-test", stage: "PAID", c: GR },
                  ].map((row, i) => (
                    <div
                      key={row.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 0",
                        borderBottom: i < 3 ? "1px solid #333" : "none",
                        fontSize: 11,
                        color: BN,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{row.name}</span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8,
                          padding: "3px 7px",
                          letterSpacing: "0.1em",
                          background: row.c,
                          color: BK,
                          fontWeight: 700,
                        }}
                      >
                        {row.stage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Phone */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 190,
                background: "#000",
                borderRadius: 30,
                padding: 9,
                boxShadow: `0 30px 60px rgba(0,0,0,0.6), 0 0 0 2px ${ST}`,
                transform: "rotate(6deg)",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  background: BK2,
                  borderRadius: 22,
                  overflow: "hidden",
                  aspectRatio: "9/19",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 60,
                    height: 14,
                    background: "#000",
                    borderRadius: 8,
                    zIndex: 3,
                  }}
                />
                <div style={{ padding: "30px 12px 12px", color: BN }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.15em", color: OR, marginBottom: 6 }}>⬢ FOLLOW-UP READY</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, lineHeight: 1, marginBottom: 8 }}>Tom — 22 Pine Rd</div>
                  {[
                    { name: "Quote sent 24h ago", meta: "Not opened yet", amt: "$1,450", c: YE },
                    { name: "Draft ready to send", meta: "Tap to open Messages", amt: null, c: OR },
                    { name: "Send Reminder →", meta: "One tap. You stay in control.", amt: null, c: GR },
                  ].map((card) => (
                    <div key={card.name} style={{ background: ST, padding: 10, marginBottom: 8, borderLeft: `3px solid ${card.c}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{card.name}</div>
                      <div style={{ fontSize: 9, color: "#888", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>{card.meta}</div>
                      {card.amt && (
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: GR, marginTop: 4 }}>{card.amt}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── TRUST BAR ── */}
      <div style={{ background: BK, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px 0" }}>
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 24,
            alignItems: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(244,241,234,0.5)",
          }}
        >
          {["Radon", "HVAC", "Plumbing", "Electrical", "Roofing", "Landscaping", "+ Every Trade"].map((t) => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: OR,
                  transform: "rotate(45deg)",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── FLOW ── */}
      <section style={{ padding: "80px 0", background: BN }} id="features">
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 01" label="THE SYSTEM" />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 24,
              maxWidth: "16ch",
            }}
          >
            Lead → Quote → Job → <span style={{ color: OR }}>Paid</span>.
            <br />
            One App. Not Five.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#444", maxWidth: 580, marginBottom: 0 }}>
            Most contractors juggle a website, a CRM, a quoting tool, an invoicing app, and a notebook. TradeBase
            replaces all of it with one workflow that lives on your phone.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 0,
              marginTop: 48,
              border: `2px solid ${BK}`,
            }}
          >
            {[
              { num: "01", title: "Lead Hits Your Site", body: "Click-to-call, contact form, or quote request — every lead lands in your inbox automatically.", tick: "▶ INSTANT NOTIFICATION" },
              { num: "02", title: "Quote In 60 Seconds", body: "Pick the service, hit send. Customer gets a branded quote on their phone in under a minute.", tick: "▶ TRACKED + TIMESTAMPED" },
              { num: "03", title: "Tap-To-Send Follow-Up", body: "Quote not opened? TradeBase drafts the message and opens your texts. You hit send.", tick: "▶ ONE TAP, NO TYPING" },
              { num: "04", title: "Job Booked + Paid", body: "Schedule it, complete it, invoice it. Money in the bank without leaving your truck.", tick: "▶ TAX-READY EXPORTS" },
            ].map((step, i) => (
              <div
                key={step.num}
                className="tb-card-flow"
                style={{
                  padding: "36px 28px",
                  borderRight: i < 3 ? `2px solid ${BK}` : "none",
                  borderBottom: 0,
                  background: BN,
                  transition: "background 0.2s",
                }}
              >
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 60, lineHeight: 0.85, color: OR, marginBottom: 12 }}>{step.num}</div>
                <h4 style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 18, marginBottom: 8 }}>{step.title}</h4>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.55 }}>{step.body}</p>
                <div style={{ marginTop: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", color: OR, textTransform: "uppercase", fontWeight: 700 }}>{step.tick}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARE ── */}
      <section style={{ padding: "80px 0", background: BK, color: BN }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 02" label="VS THE OTHERS" />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 40,
              maxWidth: "16ch",
              color: BN,
            }}
          >
            Jobber Sells Pieces. Housecall Sells Pieces. We Sell{" "}
            <span style={{ color: OR }}>The Whole Truck</span>.
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: `2px solid ${ST}` }}>
              <thead>
                <tr>
                  {[
                    { label: "What You Need", highlight: false },
                    { label: "TRADEBASE", highlight: true },
                    { label: "Jobber", highlight: false },
                    { label: "Housecall Pro", highlight: false },
                  ].map(({ label, highlight }) => (
                    <th
                      key={label}
                      style={{
                        padding: "18px 20px",
                        textAlign: "left",
                        background: highlight ? OR : ST,
                        color: highlight ? BK : BN,
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontSize: 13,
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { f: "Website Included", us: "✓", j: "✕", h: "✕" },
                  { f: "Custom Domain", us: "✓", j: "✕", h: "✕" },
                  { f: "CRM + Quotes + Invoices", us: "✓", j: "✓", h: "✓" },
                  { f: "8 AI Tools Built-In", us: "✓", j: "Limited", h: "Limited" },
                  { f: "Receipt + Card Scanner", us: "✓", j: "✕", h: "Add-on" },
                  { f: "Tax Export", us: "✓", j: "Add-on", h: "Add-on" },
                  { f: "Earn Commissions", us: "10–20%", j: "✕", h: "✕" },
                  { f: "Starting Price", us: "$20/mo", j: "$69/mo", h: "$89/mo" },
                ].map((row, ri) => (
                  <tr key={row.f}>
                    <td style={{ padding: "18px 20px", borderBottom: ri < 7 ? `1px solid ${ST}` : "none", fontWeight: 600, color: BN, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 13 }}>{row.f}</td>
                    <td style={{ padding: "18px 20px", borderBottom: ri < 7 ? `1px solid ${ST}` : "none", background: "rgba(255,91,31,0.08)", fontWeight: 700, color: row.us === "✓" ? GR : BN, fontSize: row.us === "✓" ? 18 : 14 }}>{row.us}</td>
                    <td style={{ padding: "18px 20px", borderBottom: ri < 7 ? `1px solid ${ST}` : "none", fontSize: row.j === "✕" ? 18 : 13, color: row.j === "✕" ? "#ff4d4d" : "rgba(244,241,234,0.7)", fontWeight: row.j === "✕" ? 900 : 400 }}>{row.j}</td>
                    <td style={{ padding: "18px 20px", borderBottom: ri < 7 ? `1px solid ${ST}` : "none", fontSize: row.h === "✕" ? 18 : 13, color: row.h === "✕" ? "#ff4d4d" : "rgba(244,241,234,0.7)", fontWeight: row.h === "✕" ? 900 : 400 }}>{row.h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── WORKFLOWS ── */}
      <section style={{ padding: "80px 0", background: BN }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 03" label="WORKFLOWS" />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 0,
              maxWidth: "16ch",
            }}
          >
            Four Things. Done <span style={{ color: OR }}>Stupid Fast</span>.
          </h2>

          {[
            {
              num: "01",
              title: "Capture",
              accent: "Every Lead",
              body: "Your TradeBase website is wired into your inbox. Phone calls, forms, click-to-call — every lead lands in one place. The second it hits, your phone buzzes.",
              bullets: ["Live Notifications", "Auto-Tagged By Service", "Source Tracked"],
              tag: "⬢ INBOX — LIVE",
              rows: [
                { n: "Tom Walsh", m: "Form · 22 sec ago", stage: "NEW", c: OR },
                { n: "Sarah K.", m: "Phone call · 4 min", stage: "NEW", c: OR },
                { n: "Mike Doyle", m: "Click-to-call · 8 min", stage: "NEW", c: OR },
              ],
              flip: false,
            },
            {
              num: "02",
              title: "Quote In",
              accent: "60 Seconds",
              body: "Pick the service, set the price, tap send. Customer opens it on their phone with a branded portal — no PDF attachments, no email back-and-forth.",
              bullets: ["Saved Service Templates", "One-Tap Accept", "Read Receipts"],
              tag: "⬢ QUOTE BUILDER",
              rows: [
                { n: "Sub-slab Depressurization", m: "Standard · 1 day", stage: "$1,450", c: YE },
                { n: "Post-Mitigation Test", m: "Add-on · 48hr", stage: "$185", c: YE },
                { n: "TOTAL", m: "Tap to send", stage: "$1,635", c: GR },
              ],
              flip: true,
            },
            {
              num: "03",
              title: "Follow Up With",
              accent: "One Tap",
              body: 'Quote sits unopened? TradeBase tells you who needs a nudge, drafts the message, and opens your texts ready to send. You stay in control — no spammy auto-messages going out under your name.',
              bullets: ["Smart Reminder Detection", "Pre-Written Drafts", "Send From Your Number"],
              tag: "⬢ FOLLOW-UP READY",
              rows: [
                { n: "Smith — Quote #2841", m: "Sent 24h ago · Unread", stage: "NUDGE", c: OR },
                { n: "Doyle — Quote #2840", m: "Draft ready · Tap to send", stage: "DRAFTED", c: YE },
                { n: "Kane — Quote #2838", m: "Reminder sent · WON", stage: "+$2,400", c: GR },
              ],
              flip: false,
            },
            {
              num: "04",
              title: "Get",
              accent: "Paid Faster",
              body: 'Job done? Tap "Complete." Invoice fires automatically with a payment link. Customer taps once, money hits your account. Tax season? Three taps, full export.',
              bullets: ["Auto-Invoice On Completion", "Stripe / Square / ACH", "Tax-Ready Exports"],
              tag: "⬢ PAYMENTS — THIS WEEK",
              rows: [
                { n: "Mills — Mitigation", m: "Paid · 2 days", stage: "+$1,450", c: GR },
                { n: "Kane — Re-test", m: "Paid · 4 days", stage: "+$185", c: GR },
                { n: "Doyle — Inspection", m: "Paid · 6 days", stage: "+$2,400", c: GR },
              ],
              flip: true,
            },
          ].map((wf, i) => (
            <div
              key={wf.num}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
                gap: 40,
                alignItems: "center",
                padding: "60px 0",
                borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.08)" : "none",
              }}
            >
              <div style={{ order: wf.flip ? 1 : 0 }}>
                <div
                  style={{
                    display: "inline-flex",
                    background: BK,
                    color: OR,
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 28,
                    marginBottom: 18,
                  }}
                >
                  {wf.num}
                </div>
                <h3
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(36px, 5vw, 52px)",
                    lineHeight: 0.95,
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  {wf.title} <span style={{ color: OR }}>{wf.accent}</span>
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.6, color: "#444", maxWidth: 480, marginBottom: 18 }}>{wf.body}</p>
                <ul style={{ listStyle: "none", display: "grid", gap: 8, padding: 0 }}>
                  {wf.bullets.map((b) => (
                    <li key={b} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: "#222", fontWeight: 700 }}>
                      <span style={{ color: OR, fontSize: 10 }}>▶</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ order: wf.flip ? 0 : 1, background: BK, color: BN, padding: 24, boxShadow: `8px 8px 0 ${OR}`, minHeight: 280, border: `1px solid ${ST}` }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.15em", color: OR, marginBottom: 14, textTransform: "uppercase" }}>{wf.tag}</div>
                {wf.rows.map((row) => (
                  <div key={row.n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: ST, marginBottom: 8, borderLeft: `3px solid ${row.c}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{row.n}</div>
                      <div style={{ fontSize: 10, color: "#999", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>{row.m}</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, background: row.c, color: BK, padding: "5px 8px", fontWeight: 700, letterSpacing: "0.1em" }}>{row.stage}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI TOOLKIT ── */}
      <section style={{ padding: "80px 0", background: BK, color: BN }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 04" label="AI TOOLKIT" />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 24,
              maxWidth: "16ch",
              color: BN,
            }}
          >
            8 AI Tools That Save You <span style={{ color: OR }}>Hours</span> A Week.
          </h2>
          <p style={{ color: "rgba(244,241,234,0.7)", fontSize: 17, lineHeight: 1.6, maxWidth: 580, marginBottom: 48 }}>
            Not gimmicks. Practical tools that save time on the jobs you do every day. Every one of these is live
            in the app right now.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", border: `1px solid ${ST}` }}>
            {[
              { title: "AI Job Capture", body: "Describe a job in plain English. TradeBase fills in the customer, scope, and line items.", icon: "⚡" },
              { title: "Scope Generator", body: "Add line items. AI writes the professional scope of work. Drop it on any quote.", icon: "📄" },
              { title: "Receipt Scanner", body: "Point your camera at any receipt. TradeBase reads it and logs the expense.", icon: "📸" },
              { title: "Card Scanner", body: "Scan a sub's business card on the jobsite. Add to Trade Contacts instantly.", icon: "🪪" },
              { title: "Permit Assistant", body: "Ask about permits, inspections, and code requirements in plain language.", icon: "📋" },
              { title: "Client Intel", body: "AI summary of a customer's history, open jobs, and balances before you call.", icon: "👤" },
              { title: "Follow-Up Drafter", body: "AI writes a professional follow-up message. You review and tap send.", icon: "💬" },
              { title: "Daily Ops Summary", body: "Open the app each morning. See exactly what needs attention today.", icon: "⏱" },
            ].map((tool) => (
              <div
                key={tool.title}
                className="tb-ai-tool"
                style={{
                  padding: "28px 24px",
                  borderBottom: `1px solid ${ST}`,
                  borderRight: `1px solid ${ST}`,
                  background: BK,
                  transition: "background 0.2s",
                }}
              >
                <div style={{ width: 44, height: 44, background: ST2, display: "grid", placeItems: "center", marginBottom: 18, fontSize: 20 }}>{tool.icon}</div>
                <h4 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, lineHeight: 1, marginBottom: 8, color: BN }}>{tool.title}</h4>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(244,241,234,0.65)" }}>{tool.body}</p>
                <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: GR, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, background: GR, borderRadius: "50%" }} />
                  LIVE
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARN ── */}
      <section
        style={{
          padding: "80px 0",
          background: `linear-gradient(135deg, ${OR} 0%, #ff7842 100%)`,
          color: BK,
          position: "relative",
          overflow: "hidden",
        }}
        id="earn"
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 14px)",
          }}
        />
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 20, color: BK, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 32, height: 2, background: BK }} />
            SEC // 05 — EARN
          </div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 24,
              color: BK,
            }}
          >
            Earn With{" "}
            <span style={{ background: BK, color: OR, padding: "0 12px", display: "inline-block", transform: "skew(-4deg)" }}>
              TradeBase
            </span>
            .
          </h2>
          <p style={{ color: BK, fontSize: 17, lineHeight: 1.6, maxWidth: 580, marginBottom: 48, fontWeight: 500 }}>
            Refer another contractor, earn recurring commission for as long as they&apos;re a customer. No cap on
            referrals. No expiration. Get paid quarterly, direct deposit.{" "}
            <strong>Use TradeBase for free — or use it to make money.</strong>
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginBottom: 48 }}>
            {[
              {
                tier: "⬢ Founders Tier — First 200",
                pct: "20%",
                sub: "Recurring · For Life",
                perks: ["Locked at 20% forever", "No referral cap", "Quarterly direct deposit", "First-200 contractors only"],
                featured: true,
              },
              {
                tier: "⬢ Standard Tier",
                pct: "10%",
                sub: "Recurring Commission",
                perks: ["10% baseline, no cap", "Quarterly direct deposit", "Bumped to 20% after 5 active referrals", "Earn for as long as they subscribe"],
                featured: false,
              },
              {
                tier: "⬢ Performance Bonus",
                pct: "+%",
                sub: "Discretionary Bumps",
                perks: ["Power referrers bumped manually", "Trade influencers + advocates", "Custom payout deals available", "The more you bring, the more you earn"],
                featured: false,
              },
            ].map((card) => (
              <div
                key={card.tier}
                style={{
                  background: card.featured ? BN : BK,
                  color: card.featured ? BK : BN,
                  padding: "32px 28px",
                  position: "relative",
                  boxShadow: card.featured ? `8px 8px 0 ${BK}` : "none",
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14, opacity: 0.6 }}>{card.tier}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 96, lineHeight: 0.85, color: OR, marginBottom: 6 }}>{card.pct}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 14, marginBottom: 18, opacity: 0.85 }}>{card.sub}</div>
                <ul style={{ listStyle: "none", borderTop: `1px solid rgba(${card.featured ? "0,0,0" : "255,255,255"},0.1)`, paddingTop: 18, padding: 0 }}>
                  {card.perks.map((p) => (
                    <li key={p} style={{ padding: "8px 0", display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.4 }}>
                      <span style={{ color: OR, fontWeight: 900, flexShrink: 0 }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ background: BK, color: BN, padding: 32, textAlign: "center", border: `2px solid ${BK}`, boxShadow: "8px 8px 0 rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: OR, marginBottom: 14 }}>⬢ FOUNDER MATH — REAL NUMBERS</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, textTransform: "uppercase" }}>
              10 Referrals <span style={{ color: OR, margin: "0 8px" }}>×</span> $49/mo{" "}
              <span style={{ color: OR, margin: "0 8px" }}>×</span> 20%{" "}
              <span style={{ color: OR, margin: "0 8px" }}>=</span>{" "}
              <span style={{ color: YE, background: ST, padding: "0 12px", display: "inline-block", marginLeft: 8 }}>$98/mo</span>
            </div>
            <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", color: "rgba(244,241,234,0.5)", textTransform: "uppercase" }}>
              Refer 3 contractors and TradeBase pays for itself.
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section style={{ padding: "80px 0", background: BN }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 06" label="FOUNDER ROADMAP" />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 24,
              maxWidth: "16ch",
            }}
          >
            What&apos;s Coming. <span style={{ color: OR }}>Founders Get In First</span>.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#444", maxWidth: 580, marginBottom: 0 }}>
            Lock in $20/mo today and you don&apos;t pay extra when these ship. Founders get every new feature
            included, forever.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 40 }}>
            {[
              {
                tag: "COMING 2026",
                title: "The Trade Network",
                body: "A private network of verified contractors. Send a referral to another trade in one tap. Swap jobs you can't take. Build a real book of business with the people you trust.",
                perks: ["Verified contractor profiles", "One-tap warm referrals", "Trade-to-trade messaging"],
              },
              {
                tag: "COMING 2026",
                title: "Trade Perks",
                body: "Discounts at Home Depot, fuel rewards, equipment deals, and contractor-only offers. Negotiated by us. Exclusive to TradeBase members. The bigger the network, the better the deals.",
                perks: ["Home Depot + supplier discounts", "Fuel + fleet rewards", "Equipment + tool deals"],
              },
            ].map((card) => (
              <div key={card.title} style={{ background: BN, border: `2px dashed ${BK}`, padding: "36px 32px", position: "relative" }}>
                <div style={{ position: "absolute", top: -12, left: 24, background: BK, color: YE, padding: "4px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>
                  {card.tag}
                </div>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, lineHeight: 1, marginBottom: 14, marginTop: 8 }}>{card.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#444", marginBottom: 16 }}>{card.body}</p>
                <ul style={{ listStyle: "none", display: "grid", gap: 6, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.1)", padding: 0 }}>
                  {card.perks.map((p) => (
                    <li key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: "#222" }}>
                      <span style={{ color: OR }}>◆</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FIND CONTRACTORS ── */}
      <section style={{ padding: "80px 0", background: BK, color: BN }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 06B" label="FIND CONTRACTORS" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
              gap: 48,
              alignItems: "center",
            }}
          >
            {/* Left: copy */}
            <div>
              <h2
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "clamp(42px, 7vw, 82px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.005em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                Find Verified
                <br />
                Contractors <span style={{ color: OR }}>Near You</span>.
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(244,241,234,0.75)", maxWidth: 520, marginBottom: 28 }}>
                Every TradeBase contractor has a live public profile. Browse verified tradespeople on the map,
                read real reviews, and request a quote — right from their profile.
              </p>
              <ul style={{ listStyle: "none", display: "grid", gap: 12, marginBottom: 36, padding: 0 }}>
                {[
                  "Live map — pinned to real business addresses",
                  "Verified contractor profiles with photos & reviews",
                  "One-tap quote request direct to their inbox",
                ].map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "rgba(244,241,234,0.9)" }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        background: OR,
                        color: BK,
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      ◆
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href="/find-contractors"
                className="tb-btn-primary"
                style={{
                  background: OR,
                  color: BK,
                  padding: "18px 32px",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontSize: 16,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.2s",
                }}
              >
                Open the Map →
              </Link>
            </div>

            {/* Right: map preview card */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  background: "#1a2332",
                  border: `2px solid ${ST2}`,
                  boxShadow: `12px 12px 0 ${OR}`,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Fake map header bar */}
                <div
                  style={{
                    background: "#0f172a",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: `1px solid ${ST2}`,
                  }}
                >
                  <div style={{ flex: 1, background: ST, padding: "7px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#888", letterSpacing: "0.05em" }}>
                    tradebase.contractors/find-contractors
                  </div>
                  <div style={{ background: GR, color: BK, padding: "4px 10px", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>
                    ● LIVE
                  </div>
                </div>

                {/* Fake map body */}
                <div style={{ position: "relative", height: 300, background: "#1e2d3d", overflow: "hidden" }}>
                  {/* Grid lines to suggest a map */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
                      backgroundSize: "48px 48px",
                    }}
                  />
                  {/* "Roads" */}
                  <div style={{ position: "absolute", top: "40%", left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.08)" }} />
                  <div style={{ position: "absolute", top: "65%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: "30%", width: 2, background: "rgba(255,255,255,0.07)" }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: "60%", width: 1, background: "rgba(255,255,255,0.05)" }} />

                  {/* Map pins */}
                  {[
                    { top: "28%", left: "24%", label: "Radon Pro", trade: "Radon" },
                    { top: "52%", left: "55%", label: "Elite HVAC", trade: "HVAC" },
                    { top: "38%", left: "70%", label: "ProPlumb", trade: "Plumbing" },
                  ].map((pin) => (
                    <div key={pin.label} style={{ position: "absolute", top: pin.top, left: pin.left, transform: "translate(-50%, -100%)" }}>
                      <div
                        style={{
                          background: OR,
                          color: BK,
                          padding: "5px 9px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                          position: "relative",
                          boxShadow: "0 3px 10px rgba(0,0,0,0.5)",
                        }}
                      >
                        📍 {pin.label}
                        <div
                          style={{
                            position: "absolute",
                            bottom: -5,
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 0,
                            height: 0,
                            borderLeft: "5px solid transparent",
                            borderRight: "5px solid transparent",
                            borderTop: `5px solid ${OR}`,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* CTA overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(10,10,10,0.85) 0%, transparent 50%)",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      padding: 20,
                    }}
                  >
                    <Link
                      href="/find-contractors"
                      style={{
                        background: OR,
                        color: BK,
                        padding: "12px 24px",
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        fontSize: 14,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      View Live Map →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: -14,
                  background: YE,
                  color: BK,
                  padding: "8px 14px",
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  transform: "rotate(3deg)",
                  zIndex: 2,
                }}
              >
                Free to Browse
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "80px 0", background: BK, color: BN }} id="pricing">
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <SN n="SEC // 07" label="PRICING" />
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "clamp(42px, 7vw, 82px)",
              lineHeight: 0.92,
              letterSpacing: "-0.005em",
              textTransform: "uppercase",
              marginBottom: 24,
              color: BN,
            }}
          >
            One Plan. <span style={{ color: OR }}>No Bloat</span>. No Tiers To Decode.
          </h2>
          <p style={{ color: "rgba(244,241,234,0.7)", fontSize: 17, lineHeight: 1.6, maxWidth: 580, marginBottom: 0 }}>
            First 200 contractors lock in $20/mo for life. After that, it&apos;s $49/mo. The product is the same
            — the timing is what matters.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              marginTop: 48,
              maxWidth: 900,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {[
              {
                name: "⬢ Founder",
                price: "20",
                label: "Locked In For Life · First 200 Only",
                nameColor: OR,
                features: [
                  "Branded contractor website + custom domain",
                  "Lead inbox + full CRM",
                  "Quotes + invoices + payments",
                  "Receipts + inventory + tax export",
                  "Trade Contacts + one-tap referrals",
                  "All 8 AI tools included",
                  "20% recurring commission on referrals",
                  "All future features included, forever",
                ],
                cta: "Claim Founder Spot →",
                featured: true,
              },
              {
                name: "⬢ Standard (After Launch)",
                price: "49",
                label: "Same Product · Different Price",
                nameColor: "rgba(244,241,234,0.5)",
                features: [
                  "Everything Founders get",
                  "Same features, same support",
                  "10% commission on referrals (20% after 5)",
                  "Available after 200 founder spots fill",
                ],
                cta: "Wait Until Launch",
                featured: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                style={{
                  background: BK2,
                  border: plan.featured ? `3px solid ${OR}` : `2px solid ${ST}`,
                  padding: "36px 32px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: plan.featured ? `10px 10px 0 ${YE}` : "none",
                }}
              >
                {plan.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: OR,
                      color: BK,
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      padding: "6px 14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    FOUNDER — FIRST 200
                  </div>
                )}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: plan.nameColor, marginBottom: 14 }}>{plan.name}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 0.85, marginBottom: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 30, alignSelf: "flex-start", marginTop: 8, color: OR }}>$</span>
                  <span style={{ fontSize: 96, color: OR }}>{plan.price}</span>
                  <span style={{ fontSize: 15, fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "rgba(244,241,234,0.5)", textTransform: "lowercase" }}>/mo</span>
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 13, color: YE, marginBottom: 18 }}>{plan.label}</div>
                <ul style={{ listStyle: "none", margin: 0, paddingTop: 18, borderTop: `1px solid ${ST}`, flexGrow: 1, padding: 0, marginBottom: 28 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ padding: "9px 0", display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "rgba(244,241,234,0.85)" }}>
                      <span style={{ background: OR, color: BK, width: 18, height: 18, display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0, fontSize: 11 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/waitlist"
                  style={{
                    background: plan.featured ? OR : ST,
                    color: plan.featured ? BK : BN,
                    padding: "14px 20px",
                    textAlign: "center",
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontSize: 14,
                    textDecoration: "none",
                    border: `2px solid ${plan.featured ? OR : ST}`,
                    display: "block",
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: 32,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(244,241,234,0.5)",
            }}
          >
            ✓ NO CONTRACT &nbsp;·&nbsp; ✓ CANCEL ANYTIME &nbsp;·&nbsp; ✓ ONE JOB PAYS FOR THIS
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "80px 0", background: BN }} id="faq">
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 48 }}>
            <div>
              <SN n="SEC // 08" label="FAQ" />
              <h2
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "clamp(42px, 7vw, 82px)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.005em",
                  textTransform: "uppercase",
                  marginBottom: 0,
                  maxWidth: "16ch",
                }}
              >
                Questions, Answered <span style={{ color: OR }}>Straight</span>.
              </h2>
              <p style={{ color: "#555", fontSize: 15, lineHeight: 1.6, maxWidth: "36ch", marginTop: 16 }}>
                Don&apos;t see it here? Email{" "}
                <strong>support@tradebase.contractors</strong> — a real person answers.
              </p>
            </div>
            <div style={{ borderTop: `2px solid ${BK}` }}>
              {[
                {
                  q: "Do I need a website already?",
                  a: "Nope. We build it for you. Pick a layout, drop in your business info, you're live. No designer needed, no developer needed.",
                },
                {
                  q: "Can I use my own domain?",
                  a: "Yes. You can connect your own domain anytime — included in the founder plan. We'll walk you through DNS so you don't have to think about it.",
                },
                {
                  q: "Are the AI tools real or marketing fluff?",
                  a: "All 8 are live in the app right now. Job capture, scope generator, receipt scanner, business card scanner, permit assistant, client intel, follow-up drafter, daily ops summary — all working today.",
                },
                {
                  q: "How does the follow-up actually work?",
                  a: "TradeBase notices when a quote hasn't been opened or replied to, drafts a professional follow-up message, and opens it in your phone's Messages or email app pre-filled. You hit send. No spammy auto-messages going out under your name without you knowing.",
                },
                {
                  q: "How does Earn With TradeBase work?",
                  a: "Refer another contractor with your unique link. They subscribe, you earn recurring commission — 20% if you're a Founder, 10% standard (bumped to 20% after 5 active referrals). Paid quarterly via direct deposit. No cap, no expiration.",
                },
                {
                  q: "What happens after the 200 founder spots fill?",
                  a: "Pricing goes to $49/mo for new sign-ups. Founders stay locked at $20/mo for life. If you're on the fence, this is the only thing that matters — same product, less than half the price, forever.",
                },
                {
                  q: "Will this actually get me leads?",
                  a: "The website is built to convert. Click-to-call, contact forms, instant quote requests on every page. But TradeBase isn't a marketing agency — it's the system that captures and closes the leads you already get. The faster you respond, the more you close. That's what TradeBase is built for.",
                },
              ].map((item) => (
                <details key={item.q} style={{ borderBottom: `2px solid ${BK}` }}>
                  <summary
                    style={{
                      padding: "24px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 20,
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: 18,
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {item.q}
                    <span className="faq-icon" />
                  </summary>
                  <div style={{ padding: "0 0 28px", fontSize: 15, lineHeight: 1.6, color: "#555", maxWidth: "62ch" }}>
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        style={{
          background: OR,
          color: BK,
          textAlign: "center",
          borderTop: `6px solid ${YE}`,
          padding: "80px 24px",
        }}
        id="cta"
      >
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(48px, 8vw, 108px)", lineHeight: 0.88, textTransform: "uppercase", marginBottom: 20 }}>
          Stop Reading.
          <br />
          Start Closing.
        </h2>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 32, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
          The first 200 contractors lock in $20/mo for life. After that, $49/mo. Same product — different price.
        </p>
        <Link
          href="/waitlist"
          style={{
            background: BK,
            color: OR,
            padding: "22px 44px",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: 18,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          Claim My Founder Spot →
        </Link>
        <div
          style={{
            marginTop: 20,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          ⬢ NO CONTRACT &nbsp;·&nbsp; CANCEL ANYTIME &nbsp;·&nbsp; LOCKED IN FOR LIFE ⬢
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: BK, color: BN, padding: "64px 0 24px", borderTop: `6px solid ${OR}` }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 36, marginBottom: 48 }}>
            <div style={{ gridColumn: "span 1" }}>
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: BN }}>
                <div style={{ width: 34, height: 34, background: OR, display: "grid", placeItems: "center", color: BK, fontWeight: 900, fontSize: 17, transform: "rotate(-3deg)", boxShadow: `3px 3px 0 ${YE}` }}>
                  TB
                </div>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: "0.04em" }}>TRADEBASE</span>
              </Link>
              <p style={{ color: "rgba(244,241,234,0.5)", fontSize: 14, lineHeight: 1.6, maxWidth: 320, marginTop: 14 }}>
                The operating system for contractors. Built for the truck, not the desk.
              </p>
            </div>
            {[
              {
                heading: "Product",
                links: [
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Earn With TradeBase", href: "#earn" },
                  { label: "Early Access", href: "/waitlist" },
                ],
              },
              {
                heading: "Trades",
                links: [
                  { label: "Radon", href: "/waitlist" },
                  { label: "HVAC", href: "/waitlist" },
                  { label: "Plumbing", href: "/waitlist" },
                  { label: "Electrical", href: "/waitlist" },
                ],
              },
              {
                heading: "Support",
                links: [
                  { label: "FAQ", href: "#faq" },
                  { label: "Contact", href: "mailto:support@tradebase.contractors" },
                  { label: "Login", href: "/auth/login" },
                ],
              },
            ].map((col) => (
              <div key={col.heading}>
                <h5
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: OR,
                    marginBottom: 18,
                  }}
                >
                  {col.heading}
                </h5>
                <ul style={{ listStyle: "none", display: "grid", gap: 10, padding: 0 }}>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("mailto:") || link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="tb-footer-link"
                          style={{ color: "rgba(244,241,234,0.7)", textDecoration: "none", fontSize: 14, transition: "color 0.15s" }}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="tb-footer-link"
                          style={{ color: "rgba(244,241,234,0.7)", textDecoration: "none", fontSize: 14, transition: "color 0.15s" }}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div
            style={{
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "rgba(244,241,234,0.4)",
            }}
          >
            <span>© 2026 TRADEBASE — BUILT IN MAINE BY A CONTRACTOR</span>
            <span>NO CONTRACTS · CANCEL ANYTIME</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
