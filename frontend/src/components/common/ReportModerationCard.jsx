import { useState } from 'react';
import { ExternalLink, Flag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const getTargetLink = (report) => {
  const targetId = ['contribution', 'message'].includes(report.targetType)
    ? report.targetParentId
    : report.targetId;
  if (!targetId) return null;

  if (report.targetType === 'discussion' || report.targetType === 'contribution') {
    return { to: `/discussions/${targetId}`, label: 'Open original discussion' };
  }
  if (report.targetType === 'message') {
    return { to: `/messages?conversation=${encodeURIComponent(targetId)}`, label: 'Open reported group chat' };
  }
  if (report.targetType === 'knowledge') {
    return { to: `/knowledge/${targetId}`, label: 'Open original Knowledge article' };
  }
  if (report.targetType === 'circle') {
    return { to: `/circles/${targetId}`, label: 'Open Circle' };
  }
  return null;
};

export default function ReportModerationCard({ report, busy = false, onOpenPost, onAction }) {
  const [pendingAction, setPendingAction] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const targetLink = getTargetLink(report);
  const canModerate = ['pending', 'in_review'].includes(report.status);
  const canRemove = ['post', 'discussion', 'contribution', 'knowledge', 'message'].includes(report.targetType);
  const actionBusy = busy || submitting;

  const confirmAction = async () => {
    if (!pendingAction || !reason.trim() || actionBusy) return;
    setSubmitting(true);
    try {
      const saved = await onAction(report, {
        action: pendingAction === 'remove' ? 'remove_content' : 'dismiss',
        reason: reason.trim(),
      });
      if (saved) {
        setPendingAction(null);
        setReason('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="rounded-xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Flag className="h-4 w-4 text-red-500" />
            <span className="text-sm font-bold text-[#17213f] dark:text-white">
              {report.targetType === 'knowledge' ? 'Knowledge article' : report.targetType} report
            </span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              {report.status.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Reason: {report.reason}
          </p>
          {report.details && <p className="text-xs text-slate-600 dark:text-slate-400">{report.details}</p>}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Reported by {report.reporterName || report.reporterId?.displayName || report.reporterId?.username || 'Member'}
            {' · '}{new Date(report.createdAt).toLocaleString()}
          </p>
          {report.actionTaken && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Moderator note: {report.actionTaken}
            </p>
          )}
          {report.targetType === 'post' ? (
            <button
              type="button"
              onClick={() => onOpenPost(report)}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Open original post <ExternalLink className="h-3.5 w-3.5" />
            </button>
          ) : targetLink ? (
            <Link
              to={targetLink.to}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              {targetLink.label} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">This report has no directly openable content link.</p>
          )}
        </div>

        {canModerate && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {canRemove && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => { setReason(''); setPendingAction('remove'); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Take down content
              </button>
            )}
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => { setReason(''); setPendingAction('dismiss'); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Dismiss report
            </button>
          </div>
        )}
      </div>

      {pendingAction && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-bold text-[#17213f] dark:text-white">
            {pendingAction === 'remove' ? 'Take down reported content?' : 'Dismiss this report?'}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {pendingAction === 'remove'
              ? 'The content will be hidden, this report will be marked actioned, and the writer will receive your reason.'
              : 'The report will be dismissed. Add a note explaining why no removal is being taken.'}
          </p>
          <label className="mt-3 block text-xs font-semibold text-slate-700 dark:text-slate-200">
            {pendingAction === 'remove' ? 'Removal reason (sent to the writer)' : 'Dismissal note'}
            <textarea
              autoFocus
              maxLength={1000}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => { setPendingAction(null); setReason(''); }}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionBusy || !reason.trim()}
              onClick={confirmAction}
              className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                pendingAction === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'
              }`}
            >
              {actionBusy ? 'Saving…' : pendingAction === 'remove' ? 'Take down and notify writer' : 'Confirm dismissal'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
