import { useState } from "react";
import { Shield, Eye, EyeOff, LogIn } from "lucide-react";

export function Login() {
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: "#1B3A6B" }}>
              <Shield size={22} color="white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Access required</h1>
            <p className="text-sm text-gray-400 mt-1">Enter your admin password to continue</p>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 pr-11 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 bg-white text-gray-900"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: "#1B3A6B", opacity: password ? 1 : 0.4 }}
            >
              <LogIn size={15} /> Continue
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-gray-300 mt-4">TradeBase · Admin Access</p>
      </div>
    </div>
  );
}
