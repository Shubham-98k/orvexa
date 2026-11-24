import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet } from '../api/client';

export default function AdminView() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/admin/overview')
      .then((data) => setOverview(data))
      .catch((err) => setError(err.message || 'Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <span className="text-4xl">🔒</span>
        <h2 className="text-lg font-bold text-[#17213f]">Access Denied</h2>
        <p className="text-sm text-[#737b8d]">You need admin privileges to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-7 h-7 border-2 border-[#3f5ce8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: overview?.users ?? 0, icon: '👥' },
    { label: 'Posts', value: overview?.posts ?? 0, icon: '📝' },
    { label: 'Discussions', value: overview?.discussions ?? 0, icon: '💬' },
    { label: 'Knowledge Articles', value: overview?.knowledge ?? 0, icon: '📚' },
    { label: 'Circles', value: overview?.circles ?? 0, icon: '⭕' },
    { label: 'Pending Reports', value: overview?.reports ?? 0, icon: '🚩' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#17213f]">Admin Dashboard</h1>
        <p className="text-sm text-[#737b8d] mt-1">
          Platform overview — real-time counts from the database.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-white border border-[#e9e9ed] rounded-xl p-5 flex flex-col gap-2 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-3xl font-bold text-[#17213f]">{value.toLocaleString()}</span>
            <span className="text-xs text-[#737b8d] font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      {overview?.recentReports?.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-[#17213f] mb-3">Recent Reports</h2>
          <div className="bg-white border border-[#e9e9ed] rounded-xl divide-y divide-[#f0f0f4]">
            {overview.recentReports.map((report) => (
              <div key={report._id} className="p-4 flex gap-3 items-start">
                <span className="text-lg">🚩</span>
                <div>
                  <p className="text-sm font-medium text-[#17213f]">{report.reason}</p>
                  <p className="text-xs text-[#737b8d] mt-0.5">
                    {report.targetType} · {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin info */}
      <div className="mt-8 p-4 bg-[#f7f7f8] rounded-xl border border-[#e9e9ed]">
        <p className="text-xs text-[#737b8d]">
          <span className="font-semibold text-[#3f5ce8]">Signed in as admin:</span>{' '}
          {user?.displayName || user?.username} · {user?.email}
        </p>
      </div>
    </div>
  );
}
