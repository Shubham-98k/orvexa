import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SignupPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill out all required fields.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);
      await register({
        displayName: displayName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[460px] bg-white rounded-3xl p-7 sm:p-9 border border-[#e9e9ed] shadow-[0_12px_40px_rgba(23,33,63,0.06)]">
        {/* Brand header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-1.5 group">
            <span className="text-2xl font-black tracking-[-1.5px] text-[#17213f]">orvexa</span>
            <span className="text-[#e66c68] text-xl font-black transition-transform duration-300 group-hover:rotate-45">✳</span>
          </Link>
          <h1 className="text-xl font-black text-[#17213f] mt-3 tracking-tight">Create your Orvexa account</h1>
          <p className="text-xs text-[#737b8d] mt-1">Join the community to discover, share ideas, and publish knowledge.</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#fff0ee] border border-[#fddedb] text-[#bd625e] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1" htmlFor="displayName">
              Full / Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alicia Lee"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] focus:ring-2 focus:ring-[#3f5ce8]/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g. alicialee"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] focus:ring-2 focus:ring-[#3f5ce8]/10 transition-all"
            />
            <span className="text-[10px] text-[#8b92a1] mt-0.5 block">Alphanumeric and underscores only (3-30 chars).</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alicia@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] focus:ring-2 focus:ring-[#3f5ce8]/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#17213f] mb-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
            <span className="text-[10px] text-[#8b92a1] mt-0.5 block">Must be at least 8 characters.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-[0_4px_12px_rgba(63,92,232,0.24)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            <span>{submitting ? 'Creating account...' : 'Create Account'}</span>
            {!submitting && <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f0f0f2] text-center">
          <p className="text-xs text-[#737b8d]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#3f5ce8] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
