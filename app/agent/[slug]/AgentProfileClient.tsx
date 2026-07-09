import { Phone, MessageCircle, MapPin, BadgeCheck, Award, Home, DollarSign, ShieldCheck, Handshake, TrendingUp, MapPinned, Repeat } from "lucide-react";

type Props = {
  displayName: string;
  agencyName: string | null;
  licenseNumber: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  serviceArea: string | null;
  bannerUrl?: string | null;
  yearsExperience?: number | null;
  homesSold?: number | null;
  salesVolume?: number | null;
};

function fmtVolume(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toLocaleString()}`;
}

const HELP_ITEMS = [
  { icon: Home, label: "Buy a Home" },
  { icon: DollarSign, label: "Sell a Home" },
  { icon: TrendingUp, label: "Home Valuation" },
  { icon: Award, label: "Investment Properties" },
  { icon: ShieldCheck, label: "Veteran / VA Buyers" },
  { icon: Repeat, label: "Relocation" },
];

export default function AgentProfileClient({
  displayName,
  agencyName,
  licenseNumber,
  phone,
  bio,
  avatarUrl,
  serviceArea,
  bannerUrl,
  yearsExperience,
  homesSold,
  salesVolume,
}: Props) {
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RE";

  const firstName = displayName.split(" ")[0];

  const stats = [
    yearsExperience != null && { icon: Award, value: `${yearsExperience}+`, label: "Years Experience" },
    homesSold != null && { icon: Home, value: `${homesSold}`, label: "Homes Sold" },
    salesVolume != null && { icon: DollarSign, value: fmtVolume(salesVolume), label: "Sales Volume" },
    licenseNumber && { icon: BadgeCheck, value: "Licensed", label: serviceArea || "Realtor" },
  ].filter(Boolean) as { icon: typeof Award; value: string; label: string }[];

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: bannerUrl
            ? `linear-gradient(180deg, rgba(11,26,58,0.75), rgba(11,26,58,0.9)), url(${bannerUrl})`
            : "linear-gradient(135deg, #0f2652 0%, #1B3A6B 60%, #2a4d85 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 pb-6 sm:pt-10 sm:pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/90 shadow-lg shrink-0"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-white/90 shadow-lg shrink-0"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{displayName}</h1>
              <p className="text-sm text-blue-100/90 font-medium mt-0.5">
                REALTOR{agencyName ? ` \u00b7 ${agencyName}` : ""}
              </p>
              {serviceArea && (
                <p className="flex items-center gap-1.5 text-xs text-blue-100/80 mt-2">
                  <MapPin size={13} />
                  Serving {serviceArea}
                </p>
              )}
            </div>

            {phone && (
              <div className="flex flex-col gap-2 sm:items-end shrink-0">
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-white text-[#1B3A6B] shadow-sm hover:bg-blue-50 transition-colors"
                >
                  <Phone size={15} />
                  Call {firstName}
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors"
                >
                  <MessageCircle size={15} />
                  Message
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 space-y-4">
        {/* Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(({ icon: Icon, value, label }, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "#EAF0FB" }}>
                  <Icon size={16} style={{ color: "#1B3A6B" }} />
                </div>
                <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* About */}
        {bio && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <h2 className="text-base font-bold text-slate-800 mb-2">About {firstName}</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{bio}</p>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium text-gray-500">
              <Handshake size={14} style={{ color: "#1B3A6B" }} />
              Proudly serving the community with honesty and integrity
            </div>
          </div>
        )}

        {/* How I can help */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">How I Can Help</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {HELP_ITEMS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#EAF0FB" }}>
                  <Icon size={18} style={{ color: "#1B3A6B" }} />
                </div>
                <p className="text-[11px] font-medium text-gray-600 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        {phone && (
          <div id="contact" className="rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 justify-between" style={{ backgroundColor: "#1B3A6B" }}>
            <div className="flex items-center gap-3 text-center sm:text-left">
              <MessageCircle size={20} className="text-white shrink-0 hidden sm:block" />
              <div>
                <p className="text-white font-semibold text-sm">Have a question? I&apos;m here to help.</p>
                <p className="text-blue-100/80 text-xs mt-0.5">Let&apos;s talk about your real estate goals.</p>
              </div>
            </div>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold bg-white text-[#1B3A6B] shrink-0 hover:bg-blue-50 transition-colors"
            >
              <Phone size={15} />
              Call {firstName}
            </a>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-2">
          Realtor profile powered by TradeBase
        </p>
      </div>
    </div>
  );
}
