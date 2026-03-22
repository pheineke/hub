import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';

interface UserData {
  id: number;
  username: string;
  is_admin: boolean;
  requires_password_change: boolean;
  daily_download_limit_mb: number;
  downloaded_today_mb: number;
}

export default function Admin() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLimit, setNewLimit] = useState(30000);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = useStore((state) => state.token);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/admin/users', {
        username: newUsername,
        password: newPassword,
        daily_download_limit_mb: newLimit,
        is_admin: isAdmin
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess('User created successfully with OTP');
      setNewUsername('');
      setNewPassword('');
      setIsAdmin(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdateLimit = async (userId: number, currentLimit: number) => {
    const lim = prompt('Enter new daily download limit in MB:', String(currentLimit));
    if (!lim || isNaN(Number(lim))) return;
    try {
      await axios.put(`/api/admin/users/${userId}/limit`, {
        daily_download_limit_mb: Number(lim)
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchUsers();
    } catch (err) {
      alert('Failed to update limit');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Admin Dashboard</h1>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New Account (OTP)</h2>
        {error && <div className="mb-4 text-red-500">{error}</div>}
        {success && <div className="mb-4 text-green-500">{success}</div>}
        <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
          <input
            type="text"
            required
            placeholder="Username"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent dark:text-white"
          />
          <input
            type="text"
            required
            placeholder="One-Time Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent dark:text-white"
          />
          <input
            type="number"
            required
            placeholder="Daily Limit (MB)"
            value={newLimit}
            onChange={e => setNewLimit(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent dark:text-white"
          />
          <label className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={e => setIsAdmin(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Admin Privileges</span>
          </label>
          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
            Create Account
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requires OTP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daily Usage (MB)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Daily Limit (MB)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{u.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{u.is_admin ? 'Admin' : 'User'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{u.requires_password_change ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{u.downloaded_today_mb}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{u.daily_download_limit_mb}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleUpdateLimit(u.id, u.daily_download_limit_mb)} className="text-blue-600 hover:text-blue-900">
                    Edit Limit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}