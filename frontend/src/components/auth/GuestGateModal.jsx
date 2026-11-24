import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function GuestGateModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const handleLogin = () => {
    navigate('/login', { state: { from: location } });
  };

  const handleSignup = () => {
    navigate('/signup', { state: { from: location } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#e9e9ed] text-center space-y-6">
        <div className="w-14 h-14 bg-[#fff0ee] text-[#c65d59] rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#17213f] tracking-tight">
            Guest Preview Expired
          </h2>
          <p className="text-sm text-[#737b8d] leading-relaxed">
            Your 2-minute public preview has completed. To continue exploring Orvexa, participating in discussions, and reading knowledge articles, please sign in or create an account.
          </p>
        </div>

        <div className="bg-[#f7f7f8] rounded-2xl p-4 text-xs text-[#39425b] flex items-center gap-2.5 text-left">
          <ShieldCheck className="w-5 h-5 text-[#3f5ce8] shrink-0" />
          <span>Your current page will be remembered so you can return immediately after logging in.</span>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleSignup}
            className="w-full bg-[#3f5ce8] hover:bg-[#324ecc] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_2px_0_#2b41ab] transition-all cursor-pointer text-sm"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogin}
            className="w-full bg-white hover:bg-[#f7f7f8] text-[#17213f] font-bold py-3 px-4 rounded-xl border border-[#e9e9ed] transition-all cursor-pointer text-sm"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
