import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!emailPattern.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const session = await api.login({
        email: email.trim().toLowerCase(),
        password,
      });
      onLogin(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fb]">
      <div className="grid min-h-screen lg:grid-cols-[1.4fr_1fr]">
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(70,96,174,0.35),_transparent_24%),linear-gradient(135deg,_#152a58_0%,_#233a77_100%)]" />
          <div className="relative z-10 mx-auto max-w-2xl px-12 text-center text-white">
            <div className="mx-auto mb-10 flex h-20 w-20 items-center justify-center rounded-full bg-[#f2c75b]/10 ring-1 ring-[#f2c75b]/20 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2c75b] text-[#152a58] shadow-lg">
                <ShieldCheck size={22} />
              </div>
            </div>
            <h1 className="font-display text-6xl leading-tight text-[#fff2cf]">Nyaradzo Funeral Assurance</h1>
            <p className="mx-auto mt-6 max-w-2xl text-[18px] leading-10 text-[#d6c8a4]">
              Policy Management System — Comprehensive insurance management with AI-powered churn prediction analytics.
            </p>
            <div className="mt-12 flex items-center justify-center gap-6 text-[15px] text-[#b8ab88]">
              <span>Secure</span>
              <span className="h-5 w-px bg-white/20" />
              <span>5,000+ Policies</span>
              <span className="h-5 w-px bg-white/20" />
              <span>Real-time Analytics</span>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-md">
            <h2 className="font-display text-5xl text-slate-900">Welcome back</h2>
            <p className="mt-3 text-base text-slate-500">Sign in to your management account</p>

            <form className="mt-10 space-y-6" onSubmit={handleSubmit} autoComplete="off">
              <label className="block text-sm font-semibold text-slate-900">
                Email Address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="off"
                  className="mt-3 h-12 w-full rounded-xl border border-slate-200 bg-[#eef4ff] px-4 text-[15px] text-slate-900 outline-none transition focus:border-[#1a2e5b] focus:ring-2 focus:ring-[#1a2e5b]/10"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-900">
                Password
                <div className="relative mt-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-[#eef4ff] px-4 pr-12 text-[15px] text-slate-900 outline-none transition focus:border-[#1a2e5b] focus:ring-2 focus:ring-[#1a2e5b]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1d2f5d] px-5 py-3.5 text-base font-semibold text-white transition hover:bg-[#23376e] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <p className="mt-10 text-sm text-slate-500">© 2025 Nyaradzo Funeral Assurance. All rights reserved.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
