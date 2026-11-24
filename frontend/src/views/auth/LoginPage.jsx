import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/app';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setError('Please provide your username/email and password.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);
      await login(emailOrUsername.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email/username or password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-7 sm:p-9 border border-[#e9e9ed] shadow-[0_12px_40px_rgba(23,33,63,0.06)]">
        {/* Brand header */}
        <div className="text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-1.5 group">
            <span className="text-2xl font-black tracking-[-1.5px] text-[#17213f]">orvexa</span>
            <span className="text-[#e66c68] text-xl font-black transition-transform duration-300 group-hover:rotate-45">✳</span>
          </Link>
          <h1 className="text-xl font-black text-[#17213f] mt-3 tracking-tight">Log in to Orvexa</h1>
          <p className="text-xs text-[#737b8d] mt-1">Discover ideas, explore perspectives, and share knowledge.</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#fff0ee] border border-[#fddedb] text-[#bd625e] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1.5" htmlFor="identifier">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              required
              autoFocus
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="username or email"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] focus:ring-2 focus:ring-[#3f5ce8]/10 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#17213f]" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="text-[11px] font-semibold text-[#3f5ce8] hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] focus:ring-2 focus:ring-[#3f5ce8]/10 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b92a1] hover:text-[#17213f] p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-[0_4px_12px_rgba(63,92,232,0.24)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            {!submitting && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f0f0f2] text-center">
          <p className="text-xs text-[#737b8d]">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-[#3f5ce8] hover:underline">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
