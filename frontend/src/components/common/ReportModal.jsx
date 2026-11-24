import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { apiPost } from '../../api/client';

const REPORT_REASONS = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Violence or dangerous content',
  'Sexual content',
  'False or harmful information',
  'Intellectual property violation',
  'Other',
];

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (reason === 'Other' && !details.trim()) {
      setError('Please add a brief description for “Other”.');
      return;
    }

    try {
      setSubmitting(true);
      await apiPost('/reports', { targetType, targetId, reason, details: details.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#17213f]/50 p-4 backdrop-blur-xs"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="w-full max-w-md rounded-2xl border border-[#e9e9ed] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#fff0ee] p-2 text-[#c65d59]"><Flag className="h-4 w-4" /></span>
            <div>
              <h2 id="report-modal-title" className="text-base font-bold text-[#17213f]">
                {submitted ? 'Report submitted' : 'Report content'}
              </h2>
              <p className="text-[11px] text-[#737b8d]">
                {submitted ? 'Thank you for helping keep the community safe.' : 'Choose the reason that best describes the issue.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close report dialog" className="rounded-lg p-1 text-[#8b92a1] hover:bg-[#f7f7f8]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-[#17213f] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#253358]"
          >
            Done
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-bold text-[#17213f]">Reason for reporting</legend>
              {REPORT_REASONS.map((option) => (
                <label key={option} className="flex cursor-pointer items-center gap-2.5 text-xs text-[#38425b]">
                  <input
                    type="radio"
                    name="report-reason"
                    value={option}
                    checked={reason === option}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="accent-[#c65d59]"
                  />
                  {option}
                </label>
              ))}
            </fieldset>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#17213f]">
                Additional details {reason === 'Other' ? '(required)' : '(optional)'}
              </span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                required={reason === 'Other'}
                placeholder="Share any context that could help our moderation team."
                className="w-full resize-y rounded-xl border border-[#e9e9ed] px-3 py-2 text-xs text-[#38425b] focus:border-[#3f5ce8] focus:outline-none"
              />
              <span className="block text-right text-[10px] text-[#8b92a1]">{details.length}/1000</span>
            </label>

            {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-[#f0f0f2] pt-3">
              <button type="button" onClick={onClose} className="rounded-xl px-3.5 py-2 text-xs font-bold text-[#737b8d] hover:bg-[#f7f7f8]">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason}
                className="rounded-xl bg-[#c65d59] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#b54d49] disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
