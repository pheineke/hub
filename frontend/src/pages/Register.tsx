import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`/config`).then(res => {
      setAllowRegistration(res.data.allow_registration);
    }).catch(err => console.error('Failed to fetch config', err));
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        await axios.post(`/register`, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        navigate('/login');
    } catch (err: any) {
        setError(err.response?.data?.detail || 'Registration failed');
    } finally {
        setLoading(false);
    }
  };


  if (!allowRegistration) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center my-auto">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Registration Disabled</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Public registration is currently turned off. Please contact an administrator.</p>
          <div className="mt-4">
            <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">Return to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 my-auto sm:mt-auto sm:mb-auto">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create Hub Account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Sign up
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <Link to="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
