import { Phone, MapPin, BadgeCheck } from "lucide-react";

type Props = {
  displayName: string;
  agencyName: string | null;
  licenseNumber: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  serviceArea: string | null;
};

export default function AgentProfileClient({
  displayName,
  agencyName,
  licenseNumber,
  phone,
  bio,
  avatarUrl,
  serviceArea,
}: Props) {
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RE";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-28" style={{ backgroundColor: "#1B3A6B" }} />

      <div className="max-w-2xl mx-auto px-6 -mt-14 pb-16">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md -mt-14"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white border-4 border-white shadow-md -mt-14"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                {initials}
              </div>
            )}

            <h1 className="text-2xl font-bold text-slate-800 mt-4">{displayName}</h1>
            {agencyName && <p className="text-sm text-gray-500 mt-0.5">{agencyName}</p>}

            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
              {serviceArea && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                  <MapPin size={12} />
                  {serviceArea}
                </span>
              )}
              {licenseNumber && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-3 py-1">
                  <BadgeCheck size={12} />
                  License #{licenseNumber}
                </span>
              )}
            </div>

            {bio && (
              <p className="text-sm text-gray-600 leading-relaxed mt-5 max-w-md">{bio}</p>
            )}

            {phone && (
              <a
                href={`tel:${phone}`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: "#1B3A6B" }}
              >
                <Phone size={16} />
                {phone}
              </a>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Realtor profile powered by TradeBase
        </p>
      </div>
    </div>
  );
}
