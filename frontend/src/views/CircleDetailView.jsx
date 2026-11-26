import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Link2, MessageCircle, Plus, Users } from 'lucide-react';
import { io } from 'socket.io-client';
import { apiDelete, apiGet, apiPatch, apiPost, getAuthToken, getSocketUrl } from '../api/client';
import ReportModerationCard from '../components/common/ReportModerationCard';
import PostDetailModal from '../components/discover/PostDetailModal';
import { useAuth } from '../hooks/useAuth';
import { compressImageFile } from '../utils/imageUpload';

const isManager = (role) => ['owner', 'admin'].includes(role);
const isModerator = (role) => ['owner', 'admin', 'moderator'].includes(role);
const inviteLinkModeFor = (circle) => {
  if (circle.joinPolicy === 'approval_required') return 'request';
  if (circle.joinPolicy === 'invite_only' || circle.visibility !== 'public') return 'invitation';
  return 'join';
};

export default function CircleDetailView() {
  const { circleId } = useParams();
  const { onOpenCreate, showToast } = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [circleState, setCircleState] = useState({ circleId: null, circle: null, error: '' });
  const [tab, setTab] = useState('Home');
  const [activePost, setActivePost] = useState(null);
  const [tabState, setTabState] = useState({ circleId: null, tab: null, data: null, error: '' });
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [requests, setRequests] = useState([]);
  const [bannedMembers, setBannedMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteSearchState, setInviteSearchState] = useState({ query: '', users: [] });
  const [inviteLink, setInviteLink] = useState(null);
  const [inviteNotice, setInviteNotice] = useState('');
  const [circleImageUploads, setCircleImageUploads] = useState({});
  const handledInviteTokens = useRef(new Set());
  const currentImageUploads = circleImageUploads[circleId] || {};

  const loadCircle = async () => {
    const response = await apiGet(`/circles/${circleId}`);
    setCircleState({ circleId, circle: response.circle, error: '' });
  };

  useEffect(() => {
    if (inviteToken && user) return undefined;
    let active = true;
    apiGet(`/circles/${circleId}`)
      .then((response) => {
        if (active) setCircleState({ circleId, circle: response.circle, error: '' });
      })
      .catch((requestError) => {
        if (active) setCircleState({ circleId, circle: null, error: requestError.message || 'Unable to load this Circle.' });
      });
    return () => { active = false; };
  }, [circleId, inviteToken, user]);

  const circle = circleState.circleId === circleId ? circleState.circle : null;
  const circleLoading = circleState.circleId !== circleId;

  useEffect(() => {
    if (!user || !inviteToken || handledInviteTokens.current.has(inviteToken)) return undefined;
    handledInviteTokens.current.add(inviteToken);
    let active = true;
    const redeem = async () => {
      try {
        const result = await apiPost(`/circles/invite-links/${encodeURIComponent(inviteToken)}/redeem`, {});
        if (active) {
          if (result.status === 'pending') {
            setInviteNotice('Your request to join this Circle is awaiting approval.');
            showToast('Circle join request sent.');
          } else {
            showToast(
              result.mode === 'invitation'
                ? 'Circle invitation accepted.'
                : result.alreadyMember
                  ? 'You are already a member of this Circle.'
                  : 'You joined the Circle.'
            );
            const response = await apiGet(`/circles/${circleId}`);
            if (active) setCircleState({ circleId, circle: response.circle, error: '' });
          }
        }
      } catch (requestError) {
        if (active) showToast(requestError.message || 'Unable to use this Circle link.');
      } finally {
        if (active) {
          setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete('invite');
            return next;
          }, { replace: true });
        }
      }
    };
    redeem();
    return () => { active = false; };
  }, [circleId, inviteToken, setSearchParams, showToast, user]);

  useEffect(() => {
    if (!circle) return undefined;
    let active = true;
    const endpointByTab = {
      Home: `/circles/${circle._id}/home`,
      Posts: `/circles/${circle._id}/posts`,
      Discussions: `/circles/${circle._id}/discussions`,
      Knowledge: `/circles/${circle._id}/knowledge`,
      Members: `/circles/${circle._id}/members`,
      Activity: `/circles/${circle._id}/activity`,
      Moderation: `/circles/${circle._id}/reports`,
      Analytics: `/circles/${circle._id}/analytics`,
      Invitations: `/circles/${circle._id}/invitations`,
    };
    const endpoint = endpointByTab[tab];
    if (!endpoint) return undefined;
    apiGet(endpoint)
      .then((response) => {
        if (active) {
          setTabState({ circleId: circle._id, tab, data: response, error: '' });
          if (tab === 'Invitations') setInvitations(response.invitations || []);
        }
      })
      .catch((requestError) => {
        if (active) {
          setTabState({
            circleId: circle._id,
            tab,
            data: null,
            error: requestError.message || `Unable to load Circle ${tab.toLowerCase()}.`,
          });
        }
      });
    return () => { active = false; };
  }, [circle, tab]);

  useEffect(() => {
    if (!circle || !user) return undefined;
    const token = getAuthToken();
    if (!token) return undefined;
    const socket = io(getSocketUrl(), { auth: { token } });
    const onRemoved = (event) => {
      if (event.circleId !== circle._id) return;
      setCircleState({ circleId, circle: null, error: 'Your Circle membership has ended.' });
      setTabState({ circleId: circle._id, tab: null, data: null, error: '' });
      showToast('Your Circle membership has ended.');
      navigate('/circles');
    };
    socket.on('circle_membership_removed', onRemoved);
    return () => socket.disconnect();
  }, [circle, circleId, navigate, showToast, user]);

  useEffect(() => {
    if (!circle || !isManager(circle.role)) return;
    apiGet(`/circles/${circle._id}/membership-requests`)
      .then((response) => setRequests(response.requests || []))
      .catch((requestError) => showToast(requestError.message || 'Unable to load membership requests.'));
  }, [circle, showToast]);

  useEffect(() => {
    apiGet('/circles/categories')
      .then((response) => setCategories(response.categories || []))
      .catch((requestError) => showToast(requestError.message || 'Unable to load Circle categories.'));
  }, [showToast]);

  useEffect(() => {
    if (!circle || !isManager(circle.role) || tab !== 'Members') return undefined;
    let active = true;
    apiGet(`/circles/${circle._id}/members?status=banned`)
      .then((response) => {
        if (active) setBannedMembers(response.members || []);
      })
      .catch((requestError) => showToast(requestError.message || 'Unable to load banned members.'));
    return () => { active = false; };
  }, [circle, showToast, tab]);

  useEffect(() => {
    if (!circle || tab !== 'Members' || !inviteSearch.trim()) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      apiGet(`/users?limit=6&q=${encodeURIComponent(inviteSearch.trim())}`)
        .then((response) => {
          if (active) setInviteSearchState({
            query: inviteSearch,
            users: response.users || [],
          });
        })
        .catch((requestError) => showToast(requestError.message || 'Unable to search for members.'));
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [circle, inviteSearch, showToast, tab]);

  const handleJoin = async () => {
    try {
      const response = await apiPost(`/circles/${circle._id}/join`, {});
      setCircleState((previous) => ({
        ...previous,
        circle: {
          ...previous.circle,
        joined: response.joined,
        membershipStatus: response.status,
          membersCount: response.membersCount ?? previous.circle.membersCount,
        },
      }));
      showToast(response.status === 'pending' ? 'Join request sent.' : 'You joined the Circle.');
      if (response.joined) await loadCircle();
    } catch (requestError) {
      showToast(requestError.message || 'Unable to join this Circle.');
    }
  };

  const handleLeave = async () => {
    try {
      await apiPost(`/circles/${circle._id}/leave`, {});
      navigate('/circles');
      showToast('You left the Circle.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to leave this Circle.');
    }
  };

  const handleRequest = async (requestId, decision) => {
    try {
      await apiPost(`/circles/${circle._id}/membership-requests/${requestId}/${decision}`, {});
      setRequests((previous) => previous.filter((request) => request._id !== requestId));
      showToast(decision === 'approve' ? 'Membership approved.' : 'Request declined.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to update the request.');
    }
  };

  const handleInvite = async (inviteeId) => {
    try {
      await apiPost(`/circles/${circle._id}/invitations`, { inviteeId });
      setInviteSearch('');
      setInviteSearchState({ query: '', users: [] });
      showToast('Invitation sent.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to invite this member.');
    }
  };

  const handleGenerateInviteLink = async () => {
    try {
      const result = await apiPost(`/circles/${circle._id}/invite-link`, {});
      const url = new URL(`/circles/${encodeURIComponent(circle._id)}`, window.location.origin);
      url.searchParams.set('invite', result.token);
      setInviteLink({ url: url.toString(), mode: result.mode, expiresAt: result.expiresAt });
      showToast('Circle link generated. It expires in 30 days.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to generate a Circle link.');
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable. Select the link to copy it manually.');
      await navigator.clipboard.writeText(inviteLink.url);
      showToast('Circle link copied.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to copy the Circle link.');
    }
  };

  const handleRevokeInviteLink = async () => {
    try {
      await apiDelete(`/circles/${circle._id}/invite-link`);
      setInviteLink(null);
      showToast('Circle link revoked.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to revoke the Circle link.');
    }
  };

  const handleChangeRole = async (userId, role) => {
    try {
      await apiPatch(`/circles/${circle._id}/members/${userId}/role`, { role });
      await loadCircle();
      showToast('Circle role updated.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to update this role.');
    }
  };

  const handleRemoveMember = async (userId, ban = false) => {
    const reason = window.prompt(ban ? 'Reason for banning this member?' : 'Reason for removing this member?');
    if (reason === null || (ban && !reason.trim())) return;
    try {
      const path = `/circles/${circle._id}/members/${userId}${ban ? '/ban' : ''}`;
      if (ban) await apiPost(path, { reason });
      else await apiDelete(path, { reason });
      await loadCircle();
      showToast(ban ? 'Member banned.' : 'Member removed.');
    } catch (requestError) {
      showToast(requestError.message || `Unable to ${ban ? 'ban' : 'remove'} this member.`);
    }
  };

  const handleAnnouncement = async (event) => {
    event.preventDefault();
    try {
      await apiPost(`/circles/${circle._id}/announcements`, {
        title: announcementTitle,
        body: announcementBody,
      });
      setAnnouncementTitle('');
      setAnnouncementBody('');
      const response = await apiGet(`/circles/${circle._id}/home`);
      setTabState({ circleId: circle._id, tab: 'Home', data: response, error: '' });
      showToast('Announcement published.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to publish announcement.');
    }
  };

  const handleAnnouncementAction = async (announcement, action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this announcement?')) return;
        await apiDelete(`/circles/${circle._id}/announcements/${announcement._id}`);
      } else if (action === 'pin') {
        await apiPatch(`/circles/${circle._id}/announcements/${announcement._id}`, { pinned: !announcement.pinned });
      } else {
        const title = window.prompt('Edit announcement title', announcement.title);
        if (title === null) return;
        const body = window.prompt('Edit announcement', announcement.body);
        if (body === null) return;
        await apiPatch(`/circles/${circle._id}/announcements/${announcement._id}`, { title, body });
      }
      const response = await apiGet(`/circles/${circle._id}/home`);
      setTabState({ circleId: circle._id, tab: 'Home', data: response, error: '' });
      showToast(`Announcement ${action === 'delete' ? 'deleted' : action === 'pin' ? 'updated' : 'edited'}.`);
    } catch (requestError) {
      showToast(requestError.message || 'Unable to update announcement.');
    }
  };

  const handleFeature = async (contentType, contentId) => {
    try {
      await apiPost(`/circles/${circle._id}/featured`, { contentType, contentId });
      const response = await apiGet(`/circles/${circle._id}/home`);
      setTab('Home');
      setTabState({ circleId: circle._id, tab: 'Home', data: response, error: '' });
      showToast('Content featured in the Circle.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to feature this content.');
    }
  };

  const handleReportContent = async (targetType, targetId) => {
    const reason = window.prompt(`Why are you reporting this ${targetType}?`);
    if (!reason?.trim()) return;
    try {
      await apiPost(`/circles/${circle._id}/reports`, {
        targetType,
        targetId,
        reason: reason.trim(),
      });
      showToast('Content reported to Circle moderators.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to report this content.');
    }
  };

  const handleModerateDelete = async (contentType, contentId) => {
    const reason = window.prompt(`Why are you removing this ${contentType}?`);
    if (!reason?.trim()) return;
    try {
      await apiPost(`/circles/${circle._id}/moderation/content/${contentType}/${contentId}/delete`, { reason: reason.trim() });
      setTabState((previous) => ({
        ...previous,
        data: previous.data ? {
          ...previous.data,
          posts: previous.data.posts?.filter((item) => item._id !== contentId),
          discussions: previous.data.discussions?.filter((item) => item._id !== contentId),
          knowledge: previous.data.knowledge?.filter((item) => item._id !== contentId),
          featured: previous.data.featured?.filter((item) =>
            item.contentId?.toString() !== contentId && item.content?._id?.toString() !== contentId
          ),
        } : previous.data,
      }));
      showToast(`${contentType} removed from the Circle.`);
    } catch (requestError) {
      showToast(requestError.message || `Unable to remove this ${contentType}.`);
    }
  };

  const handlePostUpdated = (updatedPost) => {
    if (updatedPost.status === 'deleted') {
      setTabState((previous) => ({
        ...previous,
        data: previous.data ? { ...previous.data, posts: previous.data.posts?.filter((item) => item._id !== updatedPost._id) } : previous.data,
      }));
      return;
    }
    setTabState((previous) => ({
      ...previous,
      data: previous.data ? { ...previous.data, posts: previous.data.posts?.map((item) => item._id === updatedPost._id ? updatedPost : item) } : previous.data,
    }));
  };

  const handleUnfeature = async (featuredId) => {
    try {
      await apiDelete(`/circles/${circle._id}/featured/${featuredId}`);
      const response = await apiGet(`/circles/${circle._id}/home`);
      setTabState({ circleId: circle._id, tab: 'Home', data: response, error: '' });
      showToast('Featured content removed.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to remove featured content.');
    }
  };

  const handleFeaturedOrder = async (items, index, offset) => {
    const reordered = [...items];
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= reordered.length) return;
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    try {
      await apiPatch(`/circles/${circle._id}/featured/order`, {
        orderedIds: reordered.map((item) => item._id),
      });
      const response = await apiGet(`/circles/${circle._id}/home`);
      setTabState({ circleId: circle._id, tab: 'Home', data: response, error: '' });
    } catch (requestError) {
      showToast(requestError.message || 'Unable to reorder featured content.');
    }
  };

  const handleUnbanMember = async (userId) => {
    try {
      await apiPost(`/circles/${circle._id}/members/${userId}/unban`, {});
      setBannedMembers((previous) => previous.filter((member) => member.userId?._id !== userId));
      showToast('Member unbanned.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to unban this member.');
    }
  };

  const handleMuteMember = async (userId, muted) => {
    const reason = muted ? '' : window.prompt('Reason for muting this member?');
    if (!muted && !reason?.trim()) return;
    try {
      if (muted) {
        await apiPost(`/circles/${circle._id}/members/${userId}/unmute`, {});
      } else {
        const durationHours = Number(window.prompt('Mute duration in hours (1–720)', '24'));
        if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 720) return;
        await apiPost(`/circles/${circle._id}/members/${userId}/mute`, {
          reason: reason.trim(),
          durationMs: durationHours * 60 * 60 * 1000,
        });
      }
      const response = await apiGet(`/circles/${circle._id}/members`);
      setTabState({ circleId: circle._id, tab: 'Members', data: response, error: '' });
      showToast(muted ? 'Member unmuted.' : 'Member muted.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to update member mute.');
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      await apiDelete(`/circles/${circle._id}/invitations/${invitationId}`);
      setInvitations((previous) => previous.filter((item) => item._id !== invitationId));
      showToast('Invitation cancelled.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to cancel this invitation.');
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tags = String(form.get('tags') || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 10);
    const rules = String(form.get('rules') || '').split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 10);
    const settings = {
      allowVisitorPosts: form.get('allowVisitorPosts') === 'on',
      allowVisitorDiscussions: form.get('allowVisitorDiscussions') === 'on',
      allowMemberInvites: form.get('allowMemberInvites') === 'on',
      allowModeratorRemoval: form.get('allowModeratorRemoval') === 'on',
      allowModeratorAnnouncements: form.get('allowModeratorAnnouncements') === 'on',
      maxFeaturedContent: Number(form.get('maxFeaturedContent')),
    };
    const updates = {
        name: form.get('name'),
        description: form.get('description'),
        category: form.get('category'),
        tags,
        rules,
        avatar: currentImageUploads.avatar ?? circle.avatar ?? '',
        coverImage: currentImageUploads.coverImage ?? circle.coverImage ?? '',
        welcomeMessage: form.get('welcomeMessage'),
        communityGuidelines: form.get('communityGuidelines'),
    };
    if (circle.role === 'owner') {
      updates.visibility = form.get('visibility');
      updates.joinPolicy = form.get('joinPolicy');
      updates.settings = settings;
    }
    try {
      const response = await apiPatch(`/circles/${circle._id}`, updates);
      setCircleState((previous) => ({ ...previous, circle: { ...previous.circle, ...response.circle } }));
      setCircleImageUploads((previous) => ({
        ...previous,
        [circle._id]: { avatar: null, coverImage: null },
      }));
      showToast('Circle settings saved.');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to save Circle settings.');
    }
  };

  const setCircleImageUpload = (field, image) => {
    setCircleImageUploads((previous) => ({
      ...previous,
      [circle._id]: { ...previous[circle._id], [field]: image },
    }));
  };

  const handleCircleImageUpload = async (event, field, maxDimension) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setCircleImageUpload(field, await compressImageFile(file, { maxDimension }));
    } catch (uploadError) {
      showToast(uploadError.message || 'Unable to process this image.');
    }
  };

  const handleArchiveCircle = async () => {
    if (!window.confirm('Archive this Circle? Members will no longer be able to access it.')) return;
    try {
      await apiDelete(`/circles/${circle._id}`);
      showToast('Circle archived.');
      navigate('/circles');
    } catch (requestError) {
      showToast(requestError.message || 'Unable to archive this Circle.');
    }
  };

  const handleReportAction = async (report, { action, reason }) => {
    try {
      const body = action === 'remove_content'
        ? { action, actionTaken: reason }
        : { status: 'dismissed', actionTaken: reason };
      const response = await apiPatch(`/circles/${circle._id}/reports/${report._id}`, body);
      setTabState((previous) => ({
        ...previous,
        data: {
          ...previous.data,
          reports: previous.data.reports.filter((item) => item._id !== report._id),
          actions: [response.moderationAction, ...(previous.data.actions || [])].filter(Boolean).slice(0, 100),
        },
      }));
      showToast(action === 'remove_content'
        ? 'Content taken down and the writer was notified.'
        : 'Report dismissed.');
      return true;
    } catch (requestError) {
      showToast(requestError.message || 'Unable to update the report.');
      return false;
    }
  };

  const handleOpenReportedPost = async (report) => {
    try {
      const response = await apiGet(`/posts/${report.targetId}`);
      if (!response?.post) throw new Error('The original post is no longer available.');
      setActivePost(response.post);
    } catch (requestError) {
      showToast(requestError.message || 'Unable to open the reported post.');
    }
  };

  if (circleLoading) {
    return <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading Circle…</div>;
  }
  if (!circle) {
    return (
      <div className="py-16 text-center space-y-3">
        {inviteNotice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{inviteNotice}</p>}
        {!inviteNotice && inviteToken && !user && <p className="text-sm text-slate-600 dark:text-slate-300">Sign in to use this Circle link.</p>}
        {!inviteNotice && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{circleState.error || 'Circle not found.'}</p>}
        {!inviteNotice && inviteToken && !user && <Link to="/login" state={{ from: { pathname: `/circles/${circleId}`, search: `?invite=${encodeURIComponent(inviteToken)}` } }} className="block text-sm font-bold text-indigo-600 dark:text-indigo-400">Sign in</Link>}
        <Link to="/circles" className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Back to Circles</Link>
      </div>
    );
  }
  const tabs = ['Home', 'Posts', 'Discussions', 'Knowledge', 'Members', 'About', 'Activity'];
  if (isModerator(circle.role)) tabs.push('Moderation');
  if (isManager(circle.role)) tabs.push('Invitations', 'Analytics');
  if (isModerator(circle.role)) tabs.push('Settings');
  const isStaticTab = ['About', 'Settings'].includes(tab);
  const tabLoading = !isStaticTab && (tabState.circleId !== circle._id || tabState.tab !== tab);
  const data = tabLoading ? null : tabState.data;
  const error = tabLoading || isStaticTab ? '' : tabState.error;
  const posts = data?.posts || [];
  const discussions = data?.discussions || [];
  const articles = data?.knowledge || [];
  const inviteLinkMode = inviteLinkModeFor(circle);
  const canGenerateInviteLink = circle.joined && (
    (inviteLinkMode === 'join' && ['owner', 'admin', 'moderator', 'member'].includes(circle.role)) ||
    (inviteLinkMode === 'request' && isModerator(circle.role)) ||
    (inviteLinkMode === 'invitation' && isManager(circle.role))
  );

  return (
    <div className="space-y-5">
      <Link to="/circles" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#737b8d] hover:text-[#3f5ce8] dark:text-slate-400 dark:hover:text-blue-400">
        <ArrowLeft className="w-3.5 h-3.5" /> All Circles
      </Link>
      {inviteToken && !user && (
        <p role="status" className="rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
          <Link to="/login" state={{ from: { pathname: `/circles/${circleId}`, search: `?invite=${encodeURIComponent(inviteToken)}` } }} className="font-bold underline">Sign in</Link> to use this Circle link.
        </p>
      )}
      {inviteNotice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{inviteNotice}</p>}

      <section className="overflow-hidden rounded-3xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="relative h-36 sm:h-48 bg-gradient-to-r from-[#e9a49a] via-[#8c65ce] to-[#536be0]">
          {circle.coverImage && <img src={circle.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute bottom-0 left-5 z-10 flex h-16 w-16 translate-y-1/2 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-2xl shadow-sm sm:left-7 dark:border-slate-900 dark:bg-slate-800">
            {circle.avatar ? <img src={circle.avatar} alt="" className="h-full w-full object-cover" /> : circle.icon || '✧'}
          </div>
        </div>
        <div className="px-5 pb-5 pt-10 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 pl-20">
              <h1 className="break-words text-xl font-extrabold leading-tight text-[#17213f] dark:text-white sm:text-2xl">{circle.name}</h1>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{circle.category} · {circle.membersCount || 0} members · {circle.visibility}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {circle.joined && circle.groupConversationId && (
                <button
                  type="button"
                  onClick={() => navigate(`/messages?conversation=${circle.groupConversationId}`, { state: { conversationId: circle.groupConversationId } })}
                  className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#17213f] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-900"
                >
                  <MessageCircle className="h-4 w-4 shrink-0" /> Group chat
                </button>
              )}
              {circle.joined ? (
                circle.role !== 'owner' && <button type="button" onClick={handleLeave} className="min-h-10 whitespace-nowrap rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Leave</button>
              ) : circle.membershipStatus === 'pending' ? (
                <button type="button" disabled className="min-h-10 whitespace-nowrap rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Request pending</button>
              ) : circle.joinPolicy !== 'invite_only' ? (
                <button type="button" onClick={handleJoin} className="min-h-10 whitespace-nowrap rounded-xl bg-[#3f5ce8] px-4 py-2 text-xs font-bold text-white hover:bg-[#324ecc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                  {circle.joinPolicy === 'approval_required' ? 'Request to join' : 'Join Circle'}
                </button>
              ) : <span className="min-h-10 whitespace-nowrap rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold leading-6 text-slate-500 dark:bg-slate-800">Invite only</span>}
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#596174] dark:text-slate-300">{circle.description}</p>
          {circle.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{circle.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[10px] text-slate-600 dark:text-slate-300">{tag}</span>)}</div>}
        </div>
      </section>

      {canGenerateInviteLink && (
        <section className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[#17213f] dark:text-white"><Link2 className="h-4 w-4" /> Circle link</h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {inviteLinkMode === 'join' ? 'Anyone with the link can join.' : inviteLinkMode === 'request' ? 'Anyone with the link can request to join.' : 'Anyone with the link can accept an invitation and join.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleGenerateInviteLink} className="rounded-lg bg-[#3f5ce8] px-3 py-2 text-xs font-bold text-white">
                {inviteLink ? 'Regenerate link' : 'Generate link'}
              </button>
              {inviteLink && <button type="button" onClick={handleCopyInviteLink} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Copy className="h-3.5 w-3.5" /> Copy</button>}
              {inviteLink && <button type="button" onClick={handleRevokeInviteLink} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">Revoke</button>}
            </div>
          </div>
          {inviteLink && (
            <input
              aria-label="Generated Circle link"
              readOnly
              value={inviteLink.url}
              onFocus={(event) => event.target.select()}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            />
          )}
        </section>
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-[#e9e9ed] dark:border-slate-800">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap px-3 py-2 text-xs font-bold ${tab === item ? 'border-b-2 border-[#3f5ce8] text-[#3f5ce8] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {item}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      {tabLoading ? <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">Loading {tab.toLowerCase()}…</div> : (
        <section className="space-y-4">
          {circle.joined && ['Posts', 'Discussions', 'Knowledge'].includes(tab) && (
            <div className="flex flex-wrap gap-2">
              {['Post', 'Discussion'].map((type) => (
                <button key={type} onClick={() => onOpenCreate(type, circle._id)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#3f5ce8] px-3 py-2 text-xs font-bold text-white">
                  <Plus className="w-3.5 h-3.5" /> Create {type}
                </button>
              ))}
              <button
                type="button"
                onClick={() => navigate(`/knowledge/studio?circleId=${encodeURIComponent(circle._id)}`)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3f5ce8] px-3 py-2 text-xs font-bold text-white"
              >
                <Plus className="w-3.5 h-3.5" /> Create Knowledge article
              </button>
            </div>
          )}

          {tab === 'Home' && (
            <>
              {(data?.featured || []).length > 0 && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4">
                  <h2 className="text-sm font-bold text-[#17213f] dark:text-white">Featured in this Circle</h2>
                  <div className="mt-2 space-y-2">
                    {data.featured.map((item, index) => (
                      <div key={item._id} className="flex items-start gap-2">
                        <ContentList items={[item.content]} type={item.contentType} />
                        {isManager(circle.role) && <div className="flex shrink-0 flex-col gap-1">
                          <button disabled={index === 0} onClick={() => handleFeaturedOrder(data.featured, index, -1)} className="rounded bg-white dark:bg-slate-800 px-2 py-1 text-[10px] disabled:opacity-40">↑</button>
                          <button disabled={index === data.featured.length - 1} onClick={() => handleFeaturedOrder(data.featured, index, 1)} className="rounded bg-white dark:bg-slate-800 px-2 py-1 text-[10px] disabled:opacity-40">↓</button>
                          <button onClick={() => handleUnfeature(item._id)} className="rounded bg-white dark:bg-slate-800 px-2 py-1 text-[10px] text-red-600">Remove</button>
                        </div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {circle.joined && (isManager(circle.role) || circle.role === 'moderator') && (
                <form onSubmit={handleAnnouncement} className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                  <h2 className="text-sm font-bold text-[#17213f] dark:text-white">Post an announcement</h2>
                  <input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} required maxLength={160} placeholder="Announcement title" className="w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" />
                  <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} required maxLength={5000} rows={3} placeholder={`Share an update with ${circle.name}…`} className="w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" />
                  <button className="rounded-lg bg-[#3f5ce8] px-3 py-2 text-xs font-bold text-white">Publish announcement</button>
                </form>
              )}
              {(data?.announcements || []).map((announcement) => (
                <article key={announcement._id} className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 p-4">
                  <h2 className="text-sm font-bold text-[#17213f] dark:text-white">{announcement.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{announcement.body}</p>
                  {announcement.pinned && <span className="mt-2 inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-300">Pinned</span>}
                  {(isManager(circle.role) || announcement.authorId?.toString() === (user?._id || user?.id)?.toString()) && <div className="mt-3 flex gap-3 text-[10px] font-bold">
                    <button onClick={() => handleAnnouncementAction(announcement, 'edit')} className="text-indigo-600 dark:text-indigo-300">Edit</button>
                    {isManager(circle.role) && <button onClick={() => handleAnnouncementAction(announcement, 'pin')} className="text-indigo-600 dark:text-indigo-300">{announcement.pinned ? 'Unpin' : 'Pin'}</button>}
                    <button onClick={() => handleAnnouncementAction(announcement, 'delete')} className="text-red-600 dark:text-red-400">Delete</button>
                  </div>}
                </article>
              ))}
              <ContentList title="Recent posts" items={data?.posts} type="post" onOpenPost={setActivePost} onModerateDelete={isModerator(circle.role) ? handleModerateDelete : null} />
              <ContentList title="Recent discussions" items={data?.discussions} type="discussion" onModerateDelete={isModerator(circle.role) ? handleModerateDelete : null} />
              <ContentList title="Recent knowledge" items={data?.knowledge} type="knowledge" onModerateDelete={isModerator(circle.role) ? handleModerateDelete : null} />
              {circle.rules?.length > 0 && <div className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 p-4"><h2 className="text-sm font-bold text-[#17213f] dark:text-white">Circle rules</h2><ol className="mt-2 list-decimal pl-5 text-xs text-slate-600 dark:text-slate-300">{circle.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol></div>}
            </>
          )}
          {tab === 'Posts' && <ContentList items={posts} type="post" onOpenPost={setActivePost} onFeature={isManager(circle.role) ? handleFeature : null} onReport={circle.joined ? handleReportContent : null} onModerateDelete={isModerator(circle.role) ? handleModerateDelete : null} />}
          {tab === 'Discussions' && <ContentList items={discussions} type="discussion" onFeature={isManager(circle.role) ? handleFeature : null} onReport={circle.joined ? handleReportContent : null} onModerateDelete={isModerator(circle.role) ? handleModerateDelete : null} />}
          {tab === 'Knowledge' && <ContentList items={articles} type="knowledge" onFeature={isManager(circle.role) ? handleFeature : null} onReport={circle.joined ? handleReportContent : null} onModerateDelete={isModerator(circle.role) ? handleModerateDelete : null} />}
          {tab === 'Members' && (
            <div className="space-y-2">
              <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Filter Circle members" className="w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-[#17213f] dark:text-white" />
              {(isManager(circle.role) || circle.settings?.allowMemberInvites) && circle.joined && (
                <div className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <label className="block text-xs font-bold text-[#17213f] dark:text-white">Invite a member
                    <input value={inviteSearch} onChange={(event) => setInviteSearch(event.target.value)} placeholder="Search by name or username" className="mt-2 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs font-normal text-[#17213f] dark:text-white" />
                  </label>
                  {inviteSearch.trim() && inviteSearchState.query !== inviteSearch && <p className="mt-2 text-[10px] text-slate-500">Searching…</p>}
                  {inviteSearchState.query === inviteSearch && inviteSearchState.users.length > 0 && <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{inviteSearchState.users.map((candidate) => <div key={candidate._id} className="flex items-center justify-between gap-2 py-2"><span className="text-xs text-slate-700 dark:text-slate-300">{candidate.displayName} · @{candidate.username}</span><button onClick={() => handleInvite(candidate._id)} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Invite</button></div>)}</div>}
                </div>
              )}
              {(data?.members || []).filter((member) => {
                const query = memberSearch.trim().toLowerCase();
                return !query || `${member.userId?.displayName || ''} ${member.userId?.username || ''}`.toLowerCase().includes(query);
              }).map((member) => (
                <div key={member._id} className="flex items-center justify-between rounded-xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <div><p className="text-xs font-bold text-[#17213f] dark:text-white">{member.userId?.displayName || 'Member'}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">@{member.userId?.username || 'member'}</p></div>
                  <div className="flex items-center gap-2">
                    {isManager(circle.role) && member.role !== 'owner' && (circle.role === 'owner' || member.role !== 'admin') ? (
                      <select value={member.role} onChange={(event) => handleChangeRole(member.userId?._id, event.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[10px] capitalize text-slate-600 dark:text-slate-300">
                        {['member', 'moderator', ...(circle.role === 'owner' ? ['admin'] : [])].map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    ) : <span className="text-[10px] font-semibold capitalize text-slate-500 dark:text-slate-400">{member.role}</span>}
                    {(circle.role === 'owner' || circle.role === 'admin' || (circle.role === 'moderator' && circle.settings?.allowModeratorRemoval)) && member.role === 'member' && <button onClick={() => handleRemoveMember(member.userId?._id)} className="text-[10px] font-bold text-red-500">Remove</button>}
                    {isManager(circle.role) && member.role === 'member' && <button onClick={() => handleRemoveMember(member.userId?._id, true)} className="text-[10px] font-bold text-red-500">Ban</button>}
                    {isModerator(circle.role) && member.role === 'member' && <button onClick={() => handleMuteMember(member.userId?._id, Boolean(member.mutedUntil && new Date(member.mutedUntil) > new Date()))} className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{member.mutedUntil && new Date(member.mutedUntil) > new Date() ? 'Unmute' : 'Mute'}</button>}
                  </div>
                </div>
              ))}
              {(data?.members || []).length === 0 && <EmptyState text="No Circle members to display." />}
              {isManager(circle.role) && requests.length > 0 && (
                <div className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 p-4 space-y-2">
                  <h2 className="text-sm font-bold text-[#17213f] dark:text-white">Membership requests</h2>
                  {requests.map((request) => <div key={request._id} className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"><span>{request.userId?.displayName || 'Member'}</span><div className="flex gap-2"><button onClick={() => handleRequest(request._id, 'approve')} className="font-bold text-emerald-600">Approve</button><button onClick={() => handleRequest(request._id, 'reject')} className="font-bold text-red-600">Decline</button></div></div>)}
                </div>
              )}
              {isManager(circle.role) && bannedMembers.length > 0 && (
                <div className="rounded-2xl border border-red-100 dark:border-red-900/40 p-4 space-y-2">
                  <h2 className="text-sm font-bold text-[#17213f] dark:text-white">Banned members</h2>
                  {bannedMembers.map((member) => <div key={member._id} className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"><span>{member.userId?.displayName || member.userId?.username || 'Member'}</span><button onClick={() => handleUnbanMember(member.userId?._id)} className="font-bold text-indigo-600 dark:text-indigo-400">Unban</button></div>)}
                </div>
              )}
            </div>
          )}
          {tab === 'About' && <div className="space-y-3">
            <section className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#17213f] dark:text-white">About this Circle</h2>
                {isModerator(circle.role) && <button type="button" onClick={() => setTab('Settings')} className="rounded-lg bg-[#f0f4ff] px-3 py-1.5 text-[10px] font-bold text-[#3f5ce8] dark:bg-slate-800 dark:text-indigo-300">Edit About</button>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{circle.description}</p>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">Visibility: {circle.visibility} · Joining: {circle.joinPolicy.replaceAll('_', ' ')}</p>
              {circle.welcomeMessage && <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">{circle.welcomeMessage}</p>}
              {circle.communityGuidelines && <><h3 className="mt-4 text-xs font-bold text-[#17213f] dark:text-white">Community guidelines</h3><p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{circle.communityGuidelines}</p></>}
              {circle.rules?.length > 0 && <><h3 className="mt-4 text-xs font-bold text-[#17213f] dark:text-white">Rules</h3><ol className="mt-1 list-decimal pl-5 text-xs text-slate-600 dark:text-slate-300">{circle.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol></>}
            </section>
          </div>}
          {tab === 'Invitations' && isManager(circle.role) && <div className="space-y-2">
            {invitations.map((invitation) => <article key={invitation._id} className="flex items-center justify-between rounded-xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"><div><p className="text-xs font-bold text-[#17213f] dark:text-white">{invitation.inviteeId?.displayName || 'Invited member'}</p><p className="text-[10px] text-slate-500 dark:text-slate-400">@{invitation.inviteeId?.username || 'member'} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div><button onClick={() => handleCancelInvitation(invitation._id)} className="text-[10px] font-bold text-red-600">Cancel</button></article>)}
            {invitations.length === 0 && <EmptyState text="No pending invitations." />}
          </div>}
          {tab === 'Settings' && isModerator(circle.role) && <form onSubmit={handleSaveSettings} className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#17213f] dark:text-white">Circle settings</h2>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Name<input name="name" required minLength={3} maxLength={60} defaultValue={circle.name} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Description<textarea name="description" required maxLength={1000} defaultValue={circle.description} rows={3} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Category<select name="category" defaultValue={circle.category} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-[#17213f] dark:text-white">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            {circle.role === 'owner' && <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Visibility<select name="visibility" defaultValue={circle.visibility} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-[#17213f] dark:text-white"><option value="public">Public</option><option value="private">Private</option><option value="hidden">Hidden / invite-only</option></select></label>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Joining policy<select name="joinPolicy" defaultValue={circle.joinPolicy} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-[#17213f] dark:text-white"><option value="open">Open</option><option value="approval_required">Approval required</option><option value="invite_only">Invite only</option></select></label>
            </div>}
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Tags (comma separated)<input name="tags" defaultValue={(circle.tags || []).join(', ')} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <CircleImageUpload
                label="Circle avatar"
                image={currentImageUploads.avatar ?? circle.avatar ?? ''}
                onChange={(event) => handleCircleImageUpload(event, 'avatar', 512)}
                onRemove={() => setCircleImageUpload('avatar', '')}
                shape="avatar"
              />
              <CircleImageUpload
                label="Cover image"
                image={currentImageUploads.coverImage ?? circle.coverImage ?? ''}
                onChange={(event) => handleCircleImageUpload(event, 'coverImage', 1600)}
                onRemove={() => setCircleImageUpload('coverImage', '')}
                shape="cover"
              />
            </div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Welcome message<textarea name="welcomeMessage" maxLength={1000} defaultValue={circle.welcomeMessage || ''} rows={2} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Community guidelines<textarea name="communityGuidelines" maxLength={3000} defaultValue={circle.communityGuidelines || ''} rows={3} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" /></label>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Rules (one per line)<textarea name="rules" defaultValue={(circle.rules || []).join('\n')} rows={3} className="mt-1 w-full rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-[#17213f] dark:text-white" /></label>
            {circle.role === 'owner' && <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600 dark:text-slate-300">
              <CheckSetting name="allowVisitorPosts" checked={circle.settings?.allowVisitorPosts} label="Allow visitors to post" />
              <CheckSetting name="allowVisitorDiscussions" checked={circle.settings?.allowVisitorDiscussions} label="Allow visitors to start discussions" />
              <CheckSetting name="allowMemberInvites" checked={circle.settings?.allowMemberInvites} label="Allow members to invite" />
              <CheckSetting name="allowModeratorRemoval" checked={circle.settings?.allowModeratorRemoval} label="Allow moderators to mute/remove members" />
              <CheckSetting name="allowModeratorAnnouncements" checked={circle.settings?.allowModeratorAnnouncements} label="Allow moderators to post announcements" />
              <label>Maximum featured content<input name="maxFeaturedContent" type="number" min="1" max="20" defaultValue={circle.settings?.maxFeaturedContent || 5} className="ml-2 w-16 rounded border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1" /></label>
            </div>}
            <button className="rounded-lg bg-[#3f5ce8] px-4 py-2 text-xs font-bold text-white">Save settings</button>
            {circle.role === 'owner' && <button type="button" onClick={handleArchiveCircle} className="ml-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white">Archive Circle</button>}
          </form>}
          {tab === 'Activity' && <div className="space-y-2">{(data?.activity || []).map((item) => <div key={`${item.type}-${item._id}`} className="rounded-xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-3"><p className="text-xs font-bold text-[#17213f] dark:text-white">{item.title || item.authorName || item.username || 'Circle activity'}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{item.type.replace('_', ' ')} · {new Date(item.createdAt).toLocaleString()}</p></div>)}</div>}
          {tab === 'Moderation' && <div className="space-y-3">
            {(data?.reports || []).map((report) => (
              <ReportModerationCard
                key={report._id}
                report={report}
                onOpenPost={handleOpenReportedPost}
                onAction={handleReportAction}
              />
            ))}
            {(data?.reports || []).length === 0 && <EmptyState text="No pending Circle reports." />}
            {(data?.actions || []).length > 0 && <section className="mt-6 space-y-2"><h2 className="text-sm font-bold text-[#17213f] dark:text-white">Moderation history</h2>{data.actions.map((action) => <article key={action._id} className="rounded-xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-3"><p className="text-xs font-bold text-[#17213f] dark:text-white">{action.action.replaceAll('_', ' ')}</p><p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{action.reason || 'No reason recorded'} · {new Date(action.createdAt).toLocaleString()}</p></article>)}</section>}
          </div>}
          {tab === 'Analytics' && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries(data?.analytics || {}).map(([key, value]) => <div key={key} className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-2xl font-extrabold text-[#17213f] dark:text-white">{value}</p><p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{key.replace(/([A-Z])/g, ' $1')}</p></div>)}</div>}
        </section>
      )}
      {activePost && <PostDetailModal
        post={activePost}
        onClose={() => setActivePost(null)}
        onPostUpdated={handlePostUpdated}
        onOpenDiscussion={(discussionId) => navigate(`/discussions/${discussionId}`)}
        onOpenCreateKnowledge={async (post) => {
          setActivePost(null);
          try {
            const response = await apiPost(`/posts/${post._id}/knowledge-drafts`, {});
            if (response?.draft?._id) {
              showToast?.('Knowledge Studio opened from post');
              navigate(`/knowledge/studio/${response.draft._id}`);
            }
          } catch (requestError) {
            alert(requestError.message || 'Could not start Knowledge draft');
          }
        }}
      />}
    </div>
  );
}

function ContentList({ title, items = [], type, onFeature, onReport, onModerateDelete, onOpenPost }) {
  if (!items.length) return <EmptyState text={title ? `No ${title.toLowerCase()} yet.` : `No ${type} found.`} />;
  return (
    <div className="space-y-2">
      {title && <h2 className="text-sm font-extrabold text-[#17213f] dark:text-white">{title}</h2>}
      {items.map((item) => {
        const href = type === 'knowledge' ? `/knowledge/${item._id}` : type === 'discussion' ? `/discussions/${item._id}` : null;
        const timestamp = item.createdAt || item.publishedAt;
        const publishedDate = timestamp ? new Date(timestamp).toLocaleDateString() : '';
        const rawBody = type === 'knowledge'
          ? item.summary || item.content || ''
          : item.body || item.summary || item.excerpt || '';
        const markdownImage = typeof rawBody === 'string'
          ? rawBody.match(/!\[[^\]]*\]\((https?:\/\/[^)]+)\)/)?.[1]
          : null;
        const imageUrl = item.imageUrl || item.coverImage || markdownImage;
        const body = (typeof rawBody === 'string' ? rawBody : '')
          .replace(/!\[[^\]]*\]\(https?:\/\/[^)]+\)/g, '')
          .trim();
        const content = <>{imageUrl && <img src={imageUrl} alt={item.title || 'Circle content image'} className="mb-3 max-h-64 w-full rounded-xl bg-slate-100 object-cover dark:bg-slate-800" onError={(event) => { event.currentTarget.hidden = true; }} />}<p className="text-sm font-bold text-[#17213f] dark:text-white">{item.title || 'Community post'}</p><p className="mt-1 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-300">{body}</p><p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{item.authorName || 'Circle member'} · {publishedDate}</p></>;
        return <div key={item._id}>
          {type === 'post' && onOpenPost
            ? <button type="button" onClick={() => onOpenPost(item)} className="block w-full rounded-2xl border border-[#e9e9ed] bg-white p-4 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700">{content}</button>
            : href
              ? <Link to={href} className="block rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">{content}</Link>
              : <article className="rounded-2xl border border-[#e9e9ed] dark:border-slate-800 bg-white dark:bg-slate-900 p-4">{content}</article>}
          <div className="flex gap-3 px-2">
            {onFeature && <button onClick={() => onFeature(type, item._id)} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Feature in Circle</button>}
            {onReport && <button onClick={() => onReport(type, item._id)} className="text-[10px] font-bold text-red-600 dark:text-red-400">Report</button>}
            {onModerateDelete && <button onClick={() => onModerateDelete(type, item._id)} className="text-[10px] font-bold text-red-700 dark:text-red-300">Remove</button>}
          </div>
        </div>;
      })}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-2xl border border-dashed border-[#e9e9ed] dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 p-8 text-center text-xs text-slate-500 dark:text-slate-400"><Users className="mx-auto mb-2 h-5 w-5 opacity-50" />{text}</div>;
}

function CheckSetting({ name, checked, label }) {
  return <label className="flex items-center gap-2"><input type="checkbox" name={name} defaultChecked={checked} className="accent-indigo-600" />{label}</label>;
}

function CircleImageUpload({ label, image, onChange, onRemove, shape }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold dark:text-slate-300 dark:file:bg-slate-800"
        />
      </label>
      {image ? (
        <div className="mt-3 flex items-center gap-3">
          <img
            src={image}
            alt={`${label} preview`}
            className={shape === 'avatar' ? 'h-14 w-14 rounded-xl object-cover' : 'h-14 w-full max-w-48 rounded-xl object-cover'}
          />
          <button type="button" onClick={onRemove} className="text-xs font-bold text-red-600 dark:text-red-400">Remove</button>
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">Optional · JPG, PNG, or WebP</p>
      )}
    </div>
  );
}
