import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPatch } from '../api/client';
import { ShieldAlert, Users, FileText, CheckCircle, XCircle, Search, Shield, RefreshCw } from 'lucide-react';

export default function AdminView() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.platformRole === 'admin';

  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User management state
  const [adminUsers, setAdminUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

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
    if (isAdmin) {
      loadOverview();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'users') {
      loadUsers();
    }
  }, [isAdmin, activeTab, userSearch]);

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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="text-4xl">🔒</span>
        <h2 className="text-lg font-bold text-[#17213f]">Access Denied</h2>
        <p className="text-sm text-[#737b8d]">You need administrator privileges to view this page.</p>
      </div>
    );
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-7 h-7 border-2 border-[#3f5ce8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={loadOverview}
          className="mt-2 text-xs font-bold bg-[#17213f] text-white px-4 py-2 rounded-xl cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: overview?.stats?.users ?? overview?.users ?? 0, icon: '👥' },
    { label: 'Posts', value: overview?.stats?.posts ?? overview?.posts ?? 0, icon: '📝' },
    { label: 'Discussions', value: overview?.stats?.discussions ?? overview?.discussions ?? 0, icon: '💬' },
    { label: 'Knowledge Articles', value: overview?.stats?.knowledge ?? overview?.knowledge ?? 0, icon: '📚' },
    { label: 'Circles', value: overview?.stats?.circles ?? overview?.circles ?? 0, icon: '⭕' },
    { label: 'Pending Reports', value: overview?.stats?.pendingReports ?? overview?.reports ?? 0, icon: '🚩' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2]">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            PLATFORM MANAGEMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight flex items-center gap-2">
            <span>Admin & Management Dashboard</span>
            <Shield className="w-5 h-5 text-[#c65d59]" />
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Real-time platform metrics, member administration, and moderation control.
          </p>
        </div>
        <button
          onClick={loadOverview}
          className="flex items-center gap-1.5 text-xs font-bold text-[#737b8d] hover:text-[#17213f] bg-white border border-[#e9e9ed] px-3 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e9e9ed] text-xs font-bold text-[#777f90]">
        {[
          { id: 'overview', label: 'Overview & Metrics' },
          { id: 'users', label: 'User Management' },
          { id: 'reports', label: `Moderation Reports (${overview?.stats?.pendingReports ?? overview?.reports ?? 0})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id ? 'border-[#e66c68] text-[#e66c68]' : 'border-transparent hover:text-[#17213f]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map(({ label, value, icon }) => (
              <div
                key={label}
                className="bg-white border border-[#e9e9ed] rounded-2xl p-5 flex flex-col gap-2 shadow-2xs hover:shadow-xs transition-shadow"
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-3xl font-extrabold text-[#17213f]">{Number(value).toLocaleString()}</span>
                <span className="text-xs text-[#737b8d] font-semibold">{label}</span>
              </div>
            ))}
          </div>

          {/* Audit Logs */}
          {overview?.recentAudit?.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-black text-[#17213f] uppercase tracking-wider">Recent Audit Trail</h2>
              <div className="bg-white border border-[#e9e9ed] rounded-2xl divide-y divide-[#f0f0f4] overflow-hidden shadow-2xs">
                {overview.recentAudit.map((log) => (
                  <div key={log._id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#17213f]">{log.actorName || 'Admin'}</span>
                      <span className="text-[#737b8d]"> performed </span>
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

      {/* Tab 2: User Management */}
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
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#e9e9ed] bg-white text-xs text-[#17213f] focus:outline-none focus:border-[#3f5ce8]"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-12 text-center text-xs text-[#8b92a1]">Loading users...</div>
          ) : adminUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b92a1] bg-white border border-dashed border-[#e9e9ed] rounded-2xl">
              No users found matching your search.
            </div>
          ) : (
            <div className="bg-white border border-[#e9e9ed] rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#f0f0f4]">
              {adminUsers.map((u) => (
                <div key={u._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#17213f]">{u.displayName}</span>
                      <span className="text-[11px] text-[#737b8d]">@{u.username}</span>
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
                    {u._id !== user._id && (
                      <>
                        <button
                          onClick={() => handleToggleUserRole(u)}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#e9e9ed] hover:bg-[#f7f7f8] text-[#17213f] transition-colors cursor-pointer"
                        >
                          {u.platformRole === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            u.accountStatus === 'suspended'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                          }`}
                        >
                          {u.accountStatus === 'suspended' ? 'Activate User' : 'Suspend User'}
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

      {/* Tab 3: Moderation Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#8b92a1] bg-white border border-dashed border-[#e9e9ed] rounded-2xl">
              ✓ All clear! No moderation reports in the queue.
            </div>
          ) : (
            <div className="bg-white border border-[#e9e9ed] rounded-2xl overflow-hidden shadow-2xs divide-y divide-[#f0f0f4]">
              {reports.map((report) => (
                <div key={report._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚩</span>
                      <span className="text-xs font-bold text-[#17213f]">{report.reason}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#fff0ee] text-[#c65d59] px-2 py-0.5 rounded">
                        {report.targetType}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          report.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : report.status === 'actioned'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                    {report.details && <p className="text-xs text-[#737b8d]">{report.details}</p>}
                    {report.actionTaken && (
                      <p className="text-[11px] text-green-700 font-medium">Resolution: {report.actionTaken}</p>
                    )}
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        disabled={actioningReportId === report._id}
                        onClick={() => handleUpdateReport(report._id, 'actioned', 'Violation confirmed and content flagged')}
                        className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Action Report
                      </button>
                      <button
                        disabled={actioningReportId === report._id}
                        onClick={() => handleUpdateReport(report._id, 'dismissed', 'Reviewed and dismissed as benign')}
                        className="bg-[#f0f0f4] hover:bg-[#e4e4e8] text-[#17213f] text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Session Info */}
      <div className="p-4 bg-white rounded-2xl border border-[#e9e9ed] shadow-2xs flex items-center justify-between">
        <p className="text-xs text-[#737b8d]">
          <span className="font-bold text-[#3f5ce8]">Signed in as Administrator:</span>{' '}
          {user?.displayName || user?.username} · {user?.email}
        </p>
        <span className="text-[10px] font-bold uppercase bg-[#eef1ff] text-[#3f5ce8] px-2.5 py-1 rounded-full">
          Super Admin
        </span>
      </div>
    </div>
  );
}
