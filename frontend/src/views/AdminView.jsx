import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPatch, apiDelete } from '../api/client';
import PostDetailModal from '../components/discover/PostDetailModal';
import {
  ShieldAlert,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Search,
  Shield,
  RefreshCw,
  Eye,
  Trash2,
  X,
  MessageSquare,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

export default function AdminView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.platformRole === 'admin';
  const isModerator = user?.role === 'moderator' || user?.platformRole === 'moderator';
  const isStaff = isAdmin || isModerator;

  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User management state
  const [adminUsers, setAdminUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // User Inspection Modal state
  const [inspectingUser, setInspectingUser] = useState(null);
  const [inspectingData, setInspectingData] = useState(null);
  const [loadingInspect, setLoadingInspect] = useState(false);
  const [inspectActiveTab, setInspectActiveTab] = useState('posts'); // 'posts' | 'discussions' | 'knowledge'

  // Delete Prompt Modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, title }
  const [deleteReason, setDeleteReason] = useState('Content violates community guidelines.');
  const [deleting, setDeleting] = useState(false);
  const [activeInspectedPost, setActiveInspectedPost] = useState(null);

  // Moderation state
  const [reports, setReports] = useState([]);
  const [actioningReportId, setActioningReportId] = useState(null);

  const loadOverview = () => {
    setLoading(true);
    apiGet('/admin/overview')
      .then((data) => {
        setOverview(data);
        if (data?.recentReports) setReports(data.recentReports);
      })
      .catch((err) => setError(err.message || 'Failed to load admin data'))
      .finally(() => setLoading(false));
  };

  const loadUsers = () => {
    setLoadingUsers(true);
    apiGet(`/admin/users${userSearch ? `?q=${encodeURIComponent(userSearch)}` : ''}`)
      .then((data) => setAdminUsers(data?.users || []))
      .catch((err) => console.warn('Failed to load users:', err.message))
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    if (isStaff) {
      loadOverview();
    }
  }, [isStaff]);

  useEffect(() => {
    if (isStaff && activeTab === 'users') {
      loadUsers();
    }
  }, [isStaff, activeTab, userSearch]);

  const handleInspectUser = async (targetUser) => {
    setInspectingUser(targetUser);
    setLoadingInspect(true);
    try {
      const res = await apiGet(`/admin/users/${targetUser._id}/content`);
      setInspectingData(res);
    } catch (err) {
      alert(err.message || 'Failed to load user content');
      setInspectingUser(null);
    } finally {
      setLoadingInspect(false);
    }
  };

  const executeDeleteContent = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const endpoint =
        deleteTarget.type === 'post'
          ? `/posts/${deleteTarget.id}`
          : deleteTarget.type === 'discussion'
          ? `/discussions/${deleteTarget.id}`
          : `/knowledge/${deleteTarget.id}`;

      await apiDelete(endpoint, { reason: deleteReason });

      // Update inspecting data state
      if (inspectingData) {
        if (deleteTarget.type === 'post') {
          setInspectingData((prev) => ({
            ...prev,
            posts: prev.posts.filter((p) => p._id !== deleteTarget.id),
          }));
        } else if (deleteTarget.type === 'discussion') {
          setInspectingData((prev) => ({
            ...prev,
            discussions: prev.discussions.filter((d) => d._id !== deleteTarget.id),
          }));
        } else if (deleteTarget.type === 'knowledge') {
          setInspectingData((prev) => ({
            ...prev,
            knowledge: prev.knowledge.filter((k) => k._id !== deleteTarget.id),
          }));
        }
      }

      setDeleteTarget(null);
      alert('Content removed and reason notification sent to the author.');
    } catch (err) {
      alert(err.message || 'Failed to remove content');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateReport = async (reportId, status, actionTaken) => {
    setActioningReportId(reportId);
    try {
      await apiPatch(`/admin/reports/${reportId}`, { status, actionTaken });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status, actionTaken } : r))
      );
      loadOverview();
    } catch (err) {
      alert(err.message || 'Failed to update report');
    } finally {
      setActioningReportId(null);
    }
  };

  const handleToggleUserStatus = async (targetUser) => {
    const nextStatus = targetUser.accountStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await apiPatch(`/admin/users/${targetUser._id}/status`, { status: nextStatus });
      setAdminUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, accountStatus: nextStatus } : u))
      );
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleToggleUserRole = async (targetUser) => {
    if (!isAdmin) {
      alert('Only administrators can promote or change user roles.');
      return;
    }
    const nextRole = targetUser.platformRole === 'admin' ? 'user' : 'admin';
    try {
      await apiPatch(`/admin/users/${targetUser._id}/role`, { role: nextRole });
      setAdminUsers((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, platformRole: nextRole, role: nextRole } : u))
      );
    } catch (err) {
      alert(err.message || 'Failed to update user role');
    }
  };

  if (!isStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 font-sans">
        <span className="text-4xl">🔒</span>
        <h2 className="text-lg font-bold text-[#17213f] dark:text-white">Access Denied</h2>
        <p className="text-sm text-[#737b8d] dark:text-slate-400">
          You need administrator or moderator privileges to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68]">
              {isAdmin ? 'ADMIN CONSOLE' : 'MODERATOR CONSOLE'}
            </span>
            <span className="text-xs text-slate-400">●</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              {isAdmin ? 'Full Tier' : 'Tier 2 Staff'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17213f] dark:text-white">
            Platform Moderation & Health
          </h1>
          <p className="text-xs text-[#737b8d] dark:text-slate-400 mt-1">
            Oversee community health, resolve disputes, inspect member content, and enforce guidelines.
          </p>
        </div>

        <button
          onClick={loadOverview}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#17213f] dark:text-white hover:bg-[#f7f7f8] dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-[#fff0ee] dark:bg-red-950/40 text-[#bd625e] dark:text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#f0f0f2] dark:border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview & Activity', icon: Shield },
          { id: 'users', label: 'Users & Content Inspection', icon: Users },
          { id: 'reports', label: `Moderation Queue (${reports.filter((r) => r.status === 'pending').length})`, icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#17213f] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-[#737b8d] dark:text-slate-400 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 hover:text-[#17213f]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Users', count: overview.stats?.users ?? 0 },
              { label: 'Published Posts', count: overview.stats?.posts ?? 0 },
              { label: 'Discussions', count: overview.stats?.discussions ?? 0 },
              { label: 'Knowledge Base', count: overview.stats?.knowledge ?? 0 },
              { label: 'Active Circles', count: overview.stats?.circles ?? 0 },
              { label: 'Pending Reports', count: overview.stats?.pendingReports ?? 0, alert: (overview.stats?.pendingReports || 0) > 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 ${
                  stat.alert ? 'border-[#ffd4d1] dark:border-red-900 bg-[#fffbfb] dark:bg-red-950/20' : 'border-[#e9e9ed] dark:border-slate-800'
                }`}
              >
                <div className="text-[11px] font-bold text-[#737b8d] dark:text-slate-400">{stat.label}</div>
                <div className={`text-xl sm:text-2xl font-black mt-1 ${stat.alert ? 'text-[#bd625e]' : 'text-[#17213f] dark:text-white'}`}>
                  {stat.count}
                </div>
              </div>
            ))}
          </div>

          {/* Audit trail */}
          {overview.recentAudit?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-black text-[#17213f] dark:text-white uppercase tracking-wider">Recent Audit Trail</h2>
              <div className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-2xl divide-y divide-[#f0f0f4] dark:divide-slate-800 overflow-hidden shadow-2xs">
                {overview.recentAudit.map((log) => (
                  <div key={log._id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#17213f] dark:text-white">{log.actorName || 'Staff'}</span>
                      <span className="text-[#737b8d] dark:text-slate-400"> performed </span>
                      <span className="font-semibold text-[#3f5ce8]">{log.action}</span>
                      {log.reason && <p className="text-[11px] text-[#8b92a1] mt-0.5">{log.reason}</p>}
                    </div>
                    <span className="text-[10px] text-[#9ba2b1]">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab 2: Users & Content Inspection */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8b92a1] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, username, or email..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#17213f] dark:text-white focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-12 text-center text-xs text-[#8b92a1]">Loading users...</div>
          ) : adminUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b92a1] bg-white dark:bg-slate-900 border border-dashed border-[#e9e9ed] dark:border-slate-800 rounded-2xl">
              No users found matching your search.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#f0f0f4] dark:divide-slate-800">
              {adminUsers.map((u) => (
                <div key={u._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#17213f] dark:text-white">{u.displayName}</span>
                      <span className="text-[11px] text-[#737b8d] dark:text-slate-400">@{u.username}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          u.platformRole === 'admin'
                            ? 'bg-[#fee2e2] text-[#dc2626]'
                            : u.platformRole === 'moderator'
                            ? 'bg-[#fef3c7] text-[#d97706]'
                            : 'bg-[#f1f5f9] text-[#475569]'
                        }`}
                      >
                        {u.platformRole}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          u.accountStatus === 'suspended'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {u.accountStatus || 'active'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8b92a1]">{u.email}</div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleInspectUser(u)}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-[#eef1ff] dark:bg-blue-950/40 text-[#3f5ce8] dark:text-blue-300 hover:bg-[#dce3ff] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Content</span>
                    </button>

                    {isAdmin && u._id !== user._id && (
                      <button
                        onClick={() => handleToggleUserRole(u)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-[#e9e9ed] dark:border-slate-700 text-[#17213f] dark:text-slate-300 hover:bg-[#f7f7f8] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {u.platformRole === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    )}

                    {u._id !== user._id && (
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                          u.accountStatus === 'suspended'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
                        }`}
                      >
                        {u.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Moderation Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#8b92a1] bg-white dark:bg-slate-900 border border-dashed border-[#e9e9ed] dark:border-slate-800 rounded-2xl">
              ✓ All clear! No moderation reports in the queue.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-[#e9e9ed] dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#f0f0f4] dark:divide-slate-800">
              {reports.map((report) => (
                <div key={report._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚩</span>
                      <span className="text-xs font-bold text-[#17213f] dark:text-white">{report.reason}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fff0ee] dark:bg-red-950/40 text-[#c65d59] dark:text-red-300 px-2 py-0.5 rounded">
                        {report.targetType}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          report.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : report.status === 'actioned'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    {report.details && <p className="text-xs text-[#55607a] dark:text-slate-400">{report.details}</p>}
                    <div className="text-[10.5px] text-[#8b92a1]">
                      Reported by {report.reporterName || 'Member'} · {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {report.status === 'pending' && (
                      <>
                        <button
                          disabled={actioningReportId === report._id}
                          onClick={() => handleUpdateReport(report._id, 'actioned', 'Resolved by moderation staff')}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white cursor-pointer disabled:opacity-50"
                        >
                          Resolve
                        </button>
                        <button
                          disabled={actioningReportId === report._id}
                          onClick={() => handleUpdateReport(report._id, 'dismissed', 'Dismissed as non-violating')}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#e9e9ed] dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Content Inspector Modal */}
      {inspectingUser && (
        <div
          onClick={(e) => e.target === e.currentTarget && setInspectingUser(null)}
          className="fixed inset-0 bg-[#17213f]/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 font-sans"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#e9e9ed] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f2] dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-[#17213f] dark:text-white">
                  Inspect User Content: {inspectingUser.displayName} (@{inspectingUser.username})
                </h3>
                <p className="text-xs text-[#737b8d] dark:text-slate-400">
                  Role: <b className="uppercase">{inspectingUser.platformRole}</b> · Email: {inspectingUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingInspect ? (
              <div className="py-16 text-center text-xs text-slate-400">Loading user content...</div>
            ) : !inspectingData ? (
              <div className="py-12 text-center text-xs text-slate-400">Unable to load content</div>
            ) : (
              <div className="space-y-4">
                {/* Content Type Selector */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  {[
                    { id: 'posts', label: `Posts (${inspectingData.posts?.length || 0})` },
                    { id: 'discussions', label: `Discussions (${inspectingData.discussions?.length || 0})` },
                    { id: 'knowledge', label: `Knowledge (${inspectingData.knowledge?.length || 0})` },
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setInspectActiveTab(subTab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        inspectActiveTab === subTab.id
                          ? 'bg-[#3f5ce8] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>

                {/* Content List */}
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {inspectActiveTab === 'posts' && (
                    inspectingData.posts?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">No posts found for this user.</p>
                    ) : (
                      inspectingData.posts.map((post) => (
                        <div
                          key={post._id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                        >
                          <div
                            onClick={() => setActiveInspectedPost(post)}
                            className="space-y-1 min-w-0 cursor-pointer flex-1 group"
                            title="Click to view full post details"
                          >
                            <div className="flex items-center gap-1.5">
                              {post.title && (
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[#3f5ce8]">
                                  {post.title}
                                </h4>
                              )}
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{post.body}</p>
                            <span className="text-[10px] text-slate-400">{new Date(post.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveInspectedPost(post)}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1"
                              title="View full post"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: 'post', id: post._id, title: post.title || post.body.slice(0, 40) })}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {inspectActiveTab === 'discussions' && (
                    inspectingData.discussions?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">No discussions found for this user.</p>
                    ) : (
                      inspectingData.discussions.map((disc) => (
                        <div
                          key={disc._id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                        >
                          <div
                            onClick={() => navigate(`/discussions/${disc._id}`)}
                            className="space-y-1 min-w-0 cursor-pointer flex-1 group"
                            title="Click to open discussion page"
                          >
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                                {disc.title}
                              </h4>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{disc.body}</p>
                            <span className="text-[10px] text-slate-400">{new Date(disc.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => navigate(`/discussions/${disc._id}`)}
                              className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1"
                              title="Open discussion reader"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: 'discussion', id: disc._id, title: disc.title })}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {inspectActiveTab === 'knowledge' && (
                    inspectingData.knowledge?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">No knowledge articles found for this user.</p>
                    ) : (
                      inspectingData.knowledge.map((art) => (
                        <div
                          key={art._id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-start justify-between gap-3 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
                        >
                          <div
                            onClick={() => navigate(`/knowledge/${art._id}`)}
                            className="space-y-1 min-w-0 cursor-pointer flex-1 group"
                            title="Click to open knowledge guide"
                          >
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                                {art.title}
                              </h4>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{art.summary}</p>
                            <span className="text-[10px] text-slate-400">{new Date(art.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => navigate(`/knowledge/${art._id}`)}
                              className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1"
                              title="Open knowledge article"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: 'knowledge', id: art._id, title: art.title })}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Reason Prompt Modal */}
      {deleteTarget && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-[#17213f]/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 font-sans"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Remove Content with Reason</span>
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Removing: <b className="text-slate-900 dark:text-white">"{deleteTarget.title}"</b>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Removal (will be sent as a notification to the user)
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Explain why this content was removed..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || !deleteReason.trim()}
                onClick={executeDeleteContent}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Removing...' : 'Delete & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Inspected Post Detail Modal */}
      {activeInspectedPost && (
        <PostDetailModal
          post={activeInspectedPost}
          onClose={() => setActiveInspectedPost(null)}
          onOpenDiscussion={(disc) => {
            setActiveInspectedPost(null);
            const discId = typeof disc === 'string' ? disc : disc?._id;
            if (discId) navigate(`/discussions/${discId}`);
          }}
          onOpenKnowledgeDraft={(kData) => {
            setActiveInspectedPost(null);
            navigate('/knowledge-studio', { state: { draft: kData } });
          }}
        />
      )}
    </div>
  );
}
