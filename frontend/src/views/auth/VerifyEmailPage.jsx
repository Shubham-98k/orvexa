import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, MailCheck, ArrowRight } from 'lucide-react';
import { apiPost } from '../../api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please provide the verification token.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);
      await apiPost('/auth/verify-email', { token: token.trim() });
      setVerified(true);
    } catch (err) {
      setError(err.message || 'Verification token is invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-3xl p-7 sm:p-9 border border-[#e9e9ed] shadow-[0_12px_40px_rgba(23,33,63,0.06)] text-center">
        <MailCheck className="w-10 h-10 text-[#3f5ce8] mx-auto mb-3" />
        <h1 className="text-xl font-black text-[#17213f] tracking-tight">Verify your email</h1>
        <p className="text-xs text-[#737b8d] mt-1.5 mb-6">Confirm your email address to unlock full platform actions.</p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#fff0ee] border border-[#fddedb] text-[#bd625e] text-xs flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {verified ? (
          <div className="p-4 rounded-2xl bg-[#eff8f4] border border-[#e4f0ea] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#5aa789] mx-auto" />
            <h4 className="text-xs font-bold text-[#17213f]">Email Verified!</h4>
            <p className="text-[11px] text-[#718278]">Your email address is now verified.</p>
            <div className="pt-2">
              <Link to="/app" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3f5ce8] hover:underline">
                <span>Go to App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1.5" htmlFor="token">
                Verification Token
              </label>
              <input
                id="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter or paste token"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{submitting ? 'Verifying...' : 'Verify Email'}</span>
              {!submitting && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
