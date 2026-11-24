import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiPost } from '../../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    try {
      setError('');
      setSubmitting(true);
      await apiPost('/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to process reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-7 sm:p-9 border border-[#e9e9ed] shadow-[0_12px_40px_rgba(23,33,63,0.06)]">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#737b8d] hover:text-[#17213f] mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to login</span>
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-xl font-black text-[#17213f] tracking-tight">Forgot password?</h1>
          <p className="text-xs text-[#737b8d] mt-1.5 leading-relaxed">
            Enter your account email address. If an account matches, we'll generate password reset instructions.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#fff0ee] border border-[#fddedb] text-[#bd625e] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-4 rounded-2xl bg-[#eff8f4] border border-[#e4f0ea] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#5aa789] mx-auto" />
            <h4 className="text-xs font-bold text-[#17213f]">Instructions Sent</h4>
            <p className="text-[11px] text-[#718278] leading-relaxed">
              If an account exists with that email address, password reset instructions have been generated.
            </p>
            <div className="pt-2">
              <Link to="/login" className="inline-block text-xs font-bold text-[#3f5ce8] hover:underline">
                Return to log in →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1.5" htmlFor="email">
                Your Account Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8] focus:ring-2 focus:ring-[#3f5ce8]/10 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{submitting ? 'Sending...' : 'Send reset instructions'}</span>
              {!submitting && <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
