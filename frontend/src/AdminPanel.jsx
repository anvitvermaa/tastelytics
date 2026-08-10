import { useState, useEffect } from 'react';
import { apiFetch } from './api';
import { Shield, RefreshCw, Users } from 'lucide-react';
import { Spinner } from './components';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const ADMIN_SECRET = 'tastelytics-admin-2025'; // Matches backend

  const fetchUsers = async () => {
    setError('');
    try {
      const res = await apiFetch('/admin/users', {
        headers: {
          'X-Admin-Secret': ADMIN_SECRET
        }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setError('Could not load users. Access denied or server error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 p-6 flex justify-center font-sans">
      <div className="win95-window w-full max-w-5xl h-fit">
        <div className="win95-titlebar flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} />
            <span>TASTELYTICS_ADMIN.EXE</span>
          </div>
          <div className="flex gap-1">
            <button className="win95-button w-5 h-5 text-xs pb-1">_</button>
            <button className="win95-button w-5 h-5 text-xs pb-1">□</button>
            <button className="win95-button w-5 h-5 text-xs font-bold pb-1 text-black" onClick={() => window.location.href = '/'}>X</button>
          </div>
        </div>
        
        <div className="p-4 bg-dark-800">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-extrabold text-brand-500 uppercase tracking-widest flex items-center gap-2" style={{ textShadow: '1px 1px 0px #000' }}>
              <Users size={24} /> User Database
            </h1>
            <button onClick={fetchUsers} disabled={loading} className="win95-button px-4 py-2 font-bold text-sm uppercase flex items-center gap-2">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {error ? (
            <div className="bg-white border-2 border-red-500 p-4 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
              <p className="text-red-600 font-bold uppercase">{error}</p>
            </div>
          ) : (
            <div className="bg-white border-[3px] border-dark-700 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-200 border-b-[3px] border-dark-700">
                    <th className="p-3 font-extrabold uppercase tracking-widest text-xs border-r-2 border-dark-300">User ID</th>
                    <th className="p-3 font-extrabold uppercase tracking-widest text-xs border-r-2 border-dark-300">User</th>
                    <th className="p-3 font-extrabold uppercase tracking-widest text-xs border-r-2 border-dark-300">Genres</th>
                    <th className="p-3 font-extrabold uppercase tracking-widest text-xs">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center"><Spinner /></td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center font-bold uppercase tracking-widest text-dark-500">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u, i) => {
                      const profile = u.ProfileData || {};
                      const joinedDate = u.JoinedAt ? new Date(parseInt(u.JoinedAt) * 1000).toLocaleDateString() : 'Unknown';
                      return (
                        <tr key={u.UserID || i} className="border-b border-dark-200 hover:bg-yellow-100 transition-colors">
                          <td className="p-3 border-r-2 border-dark-200 text-xs font-mono truncate max-w-[120px]" title={u.UserID}>{u.UserID}</td>
                          <td className="p-3 border-r-2 border-dark-200">
                            <div className="font-bold text-sm uppercase tracking-widest">{u.DisplayName || profile.name || 'Anonymous'}</div>
                            <div className="text-xs text-dark-500">{u.Email || 'No Email'}</div>
                          </td>
                          <td className="p-3 border-r-2 border-dark-200 text-xs uppercase font-bold">
                            {profile.favorite_genres ? profile.favorite_genres.split(',').join(', ') : '-'}
                          </td>
                          <td className="p-3 text-xs font-bold uppercase">{joinedDate}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
