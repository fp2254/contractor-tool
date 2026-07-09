import { Phone, MessageCircle } from "lucide-react";

type Props = {
  phone: string;
  phoneFormatted: string;
  onQuoteClick: () => void;
};

export function StickyBar({ phone, phoneFormatted, onQuoteClick }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <a
        href={`tel:${phone}`}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border border-gray-200 text-slate-700 hover:bg-gray-50 transition-colors"
      >
        <Phone size={16} />
        Call
      </a>

      <button
        onClick={onQuoteClick}
        className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-[#1B3A6B] text-white shadow-sm hover:bg-[#152e55] transition-colors"
      >
        <MessageCircle size={16} />
        Get Free Quote
      </button>
    </div>
  );
}
