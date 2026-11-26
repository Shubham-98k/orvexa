import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { LockKeyhole, Plus, Search, Users } from 'lucide-react';
import { apiGet, apiPost } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function CirclesView() {
  const { onOpenCreate, showToast } = useOutletContext();
  const { user } = useAuth();
  const [circles, setCircles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('All');
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitationState, setInvitationState] = useState({ userId: null, invitations: [] });
  const userId = (user?._id || user?.id)?.toString() || null;
  const invitations = invitationState.userId === userId ? invitationState.invitations : [];

  useEffect(() => {
    apiGet('/circles/categories')
      .then((response) => setCategories(response.categories || []))
      .catch((requestError) => setError(requestError.message || 'Unable to load Circle categories.'));
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    apiGet('/circles/invitations')
      .then((response) => {
        if (active) setInvitationState({ userId, invitations: response.invitations || [] });
      })
      .catch((requestError) => showToast(requestError.message || 'Unable to load Circle invitations.'));
    return () => { active = false; };
  }, [showToast, userId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (search.trim()) params.set('q', search.trim());
      if (scope === 'joined') params.set('scope', 'joined');
      setLoading(true);
      setError('');
      apiGet(`/circles${params.size ? `?${params}` : ''}`)
        .then((response) => {
          if (active) setCircles(response.circles || []);
        })
        .catch((requestError) => {
          if (active) setError(requestError.message || 'Unable to load Circles.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, scope, search]);

  const handleJoin = async (circle) => {
    try {
      const response = await apiPost(`/circles/${circle._id}/join`, {});
      setCircles((previous) => previous.map((item) => item._id === circle._id
        ? { ...item, joined: response.joined, membershipStatus: response.status, membersCount: response.membersCount ?? item.membersCount }
        : item));
      showToast(response.status === 'pending' ? 'Join request sent.' : 'Joined Circle!');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to join this Circle.');
    }
  };

  const handleInvitation = async (invitation, decision) => {
    try {
      await apiPost(`/circles/${invitation.circleId._id}/invitations/${invitation._id}/${decision}`, {});
      setInvitationState((previous) => ({
        ...previous,
        invitations: previous.invitations.filter((item) => item._id !== invitation._id),
      }));
      showToast(decision === 'accept' ? 'Circle invitation accepted.' : 'Invitation declined.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to respond to this invitation.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#f0f0f2] dark:border-slate-800">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">ORVEXA COMMUNITIES</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] dark:text-white">Find your people</h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] dark:text-slate-400 mt-1">
            Interest-based communities, shared content, and group conversations.
          </p>
        </div>
        <button
          onClick={() => onOpenCreate('Circle')}
          className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          Create Circle
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Circles by name, topic, or tag"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#17213f] dark:text-white"
          />
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#17213f] dark:text-white"
        >
          <option value="All">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#17213f] dark:text-white"
        >
          <option value="all">Discover</option>
          <option value="joined">Joined Circles</option>
        </select>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

      {invitations.length > 0 && (
        <section className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 p-4">
          <h2 className="text-sm font-extrabold text-[#17213f] dark:text-white">Circle invitations</h2>
          <div className="mt-3 space-y-2">
            {invitations.map((invitation) => (
              <div key={invitation._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/70 dark:bg-slate-900/60 p-3">
                <div><p className="text-xs font-bold text-[#17213f] dark:text-white">{invitation.circleId?.name || 'Circle'}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">{invitation.circleId?.description}</p></div>
                <div className="flex gap-2"><button onClick={() => handleInvitation(invitation, 'accept')} className="rounded-lg bg-[#3f5ce8] px-3 py-1.5 text-[10px] font-bold text-white">Accept</button><button onClick={() => handleInvitation(invitation, 'decline')} className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">Decline</button></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-[#8b92a1] dark:text-slate-400">Loading Circles…</div>
        ) : circles.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[#8b92a1] dark:text-slate-400 border border-dashed border-[#e9e9ed] dark:border-slate-700 rounded-2xl">
            <p className="font-semibold text-[#17213f] dark:text-white">No Circles found.</p>
            <p className="mt-1">Try another search or create the first community.</p>
          </div>
        ) : circles.map((circle) => (
          <article key={circle._id} className="border border-[#e9e9ed] dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <Link to={`/circles/${circle.slug || circle._id}`} className="block">
              <div className="h-24 flex items-center justify-between px-5 bg-gradient-to-r from-[#e9a49a] to-[#536be0] text-white">
                {circle.coverImage
                  ? <img src={circle.coverImage} alt="" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-extrabold">{circle.icon || '✧'}</span>}
                {circle.visibility !== 'public' && <LockKeyhole className="w-4 h-4" aria-label="Private Circle" />}
              </div>
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#17213f] dark:text-white">{circle.name}</h2>
                    <p className="text-[10px] text-[#737b8d] dark:text-slate-400 mt-0.5">{circle.category}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#8b92a1] dark:text-slate-400">
                    <Users className="w-3.5 h-3.5" /> {circle.membersCount || 0}
                  </span>
                </div>
                <p className="text-xs text-[#737b8d] dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">{circle.description}</p>
              </div>
            </Link>
            <div className="px-5 pb-4 flex items-center justify-between gap-3">
              <span className="text-[10px] text-[#8b92a1] dark:text-slate-500">
                {circle.membershipStatus === 'pending' ? 'Request pending' : circle.joinPolicy === 'invite_only' ? 'Invite only' : circle.joinPolicy === 'approval_required' ? 'Approval required' : 'Open to join'}
              </span>
              {circle.joined ? (
                <Link to={`/circles/${circle.slug || circle._id}`} className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#f0f1f4] dark:bg-slate-800 text-[#737b8d] dark:text-slate-300">View Circle</Link>
              ) : circle.membershipStatus === 'pending' ? (
                <button disabled className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">Requested</button>
              ) : (
                <button
                  disabled={circle.joinPolicy === 'invite_only'}
                  onClick={() => handleJoin(circle)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#3f5ce8] hover:bg-[#324ecc] text-white disabled:opacity-50"
                >
                  {circle.joinPolicy === 'approval_required' ? 'Request to join' : circle.joinPolicy === 'invite_only' ? 'Invite only' : 'Join Circle'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
