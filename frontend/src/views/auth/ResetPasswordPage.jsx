import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiPost } from '../../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim() || !newPassword) {
      setError('Please provide the reset token and your new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setError('');
      setSubmitting(true);
      await apiPost('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      setError(err.message || 'Invalid or expired token.');
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
          <h1 className="text-xl font-black text-[#17213f] tracking-tight">Set new password</h1>
          <p className="text-xs text-[#737b8d] mt-1.5">Enter your reset token and your new secure password.</p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#fff0ee] border border-[#fddedb] text-[#bd625e] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-2xl bg-[#eff8f4] border border-[#e4f0ea] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#5aa789] mx-auto" />
            <h4 className="text-xs font-bold text-[#17213f]">Password Updated</h4>
            <p className="text-[11px] text-[#718278]">Redirecting to login screen...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1.5" htmlFor="token">
                Reset Token
              </label>
              <input
                id="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your reset token"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17213f] mb-1.5" htmlFor="newPassword">
                New Password (min 8 chars)
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#e9e9ed] text-xs text-[#17213f] placeholder-[#8b92a1] focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#3f5ce8] hover:bg-[#324ecc] text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{submitting ? 'Updating...' : 'Update Password'}</span>
              {!submitting && <KeyRound className="w-3.5 h-3.5" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
