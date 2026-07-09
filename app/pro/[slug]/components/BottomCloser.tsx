import { MessageCircle, Phone } from "lucide-react";

export function BottomCloser() {
  return (
    <div className="bg-[#1B3A6B] rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
      <div className="flex items-center gap-3 text-center sm:text-left">
        <MessageCircle size={20} className="text-white shrink-0 hidden sm:block" />
        <div>
          <p className="text-white font-semibold text-sm">Ready to get started?</p>
          <p className="text-blue-100/80 text-xs mt-0.5">Use the bar below to call or request a free quote.</p>
        </div>
      </div>
    </div>
  );
}
