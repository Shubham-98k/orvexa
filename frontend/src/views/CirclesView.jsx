import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { apiGet, apiPost } from '../api/client';

export default function CirclesView() {
  const { onOpenCreate, showToast } = useOutletContext();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/circles')
      .then((res) => setCircles(res?.circles || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleJoin = async (circleId) => {
    try {
      const res = await apiPost(`/circles/${circleId}/join`, {});
      setCircles((prev) =>
        prev.map((c) => (c._id === circleId ? { ...c, joined: res.joined, membersCount: res.membersCount } : c))
      );
      showToast(res.joined ? 'Joined Circle!' : 'Left Circle');
    } catch (err) {
      alert(err.message || 'Unable to update membership.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#f0f0f2]">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#e66c68] mb-1">
            ORVEXA COMMUNITIES
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-1.2px] text-[#17213f] leading-tight">
            Find your people
          </h1>
          <p className="text-xs sm:text-[13.5px] text-[#737b8d] mt-1">
            Interest-based communities built around subjects you care about.
          </p>
        </div>

        <button
          onClick={() => onOpenCreate('Circle')}
          className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Create Circle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-xs text-[#8b92a1]">Loading circles...</div>
        ) : circles.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-xs text-[#8b92a1] border border-dashed border-[#e9e9ed] rounded-2xl space-y-2">
            <p className="font-semibold text-[#17213f]">No circles created yet.</p>
            <p>Create the first interest community on Orvexa!</p>
          </div>
        ) : (
          circles.map((circle) => (
            <div
              key={circle._id}
              className="border border-[#e9e9ed] rounded-2xl overflow-hidden bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div
                className={`h-24 flex items-center justify-center text-white text-3xl font-extrabold ${
                  circle.coverTheme === 'c2'
                    ? 'bg-gradient-to-r from-[#a8b4f0] to-[#536be0]'
                    : circle.coverTheme === 'c3'
                    ? 'bg-gradient-to-r from-[#a8d6c0] to-[#57977b]'
                    : circle.coverTheme === 'c4'
                    ? 'bg-gradient-to-r from-[#d6b6ed] to-[#8c65ce]'
                    : 'bg-gradient-to-r from-[#e9a49a] to-[#e96f68]'
                }`}
              >
                {circle.icon || '✧'}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="text-base font-bold text-[#17213f]">{circle.name}</h3>
                  <p className="text-xs text-[#737b8d] mt-1 leading-relaxed line-clamp-2">{circle.description}</p>
                </div>

                <div className="border-t border-[#f0f0f2] pt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8b92a1]">{circle.membersCount || 1} members</span>
                  <button
                    onClick={() => handleToggleJoin(circle._id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      circle.joined
                        ? 'bg-[#f0f1f4] text-[#737b8d] hover:bg-[#e4e6ea]'
                        : 'bg-[#3f5ce8] text-white hover:bg-[#324ecc]'
                    }`}
                  >
                    {circle.joined ? 'Joined ✓' : 'Join circle'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
