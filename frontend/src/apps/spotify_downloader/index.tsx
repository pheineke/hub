import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Music, Download, CheckCircle, RefreshCcw, FolderOpen, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SpotifyDownloaderWidget = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp3');
  const [limit, setLimit] = useState<number | ''>('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'download' | 'library'>('download');
  const [loading, setLoading] = useState(false);
  const token = useStore(state => state.token);

  const fetchLibrary = async () => {
    try {
      const res = await axios.get('http://localhost:8001/api/apps/spotify_downloader/library');
      setLibrary(res.data.files);
    } catch (e) {
      console.error(e);
    }
  };

  // On mount, check if there are active downloads to resume
  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await axios.get('http://localhost:8001/api/apps/spotify_downloader/active');
        const activeTasks = Object.keys(res.data.active);
        if (activeTasks.length > 0) {
          const lastActiveId = activeTasks[0];
          setTaskId(lastActiveId);
          setStatus(res.data.active[lastActiveId]);
          setLoading(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkActive();
  }, []);

  useEffect(() => {
    if (activeTab === 'library') {
      fetchLibrary();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    if (taskId && (!status || (status.status !== 'completed' && status.status !== 'failed' && status.status !== 'cancelled'))) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:8001/api/apps/spotify_downloader/status/${taskId}`);
          setStatus(res.data);
          if (res.data.status === 'completed' || res.data.status === 'failed' || res.data.status === 'cancelled') {
            clearInterval(interval);
            setLoading(false);
            // Keep the task in state so we can show the download button
            if (activeTab === 'library') fetchLibrary(); 
          }
        } catch (e) {
          console.error(e);
          clearInterval(interval);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, status, activeTab]);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    try {
      setLoading(true);
      setStatus(null);
      const res = await axios.post('http://localhost:8001/api/apps/spotify_downloader/download', {
        url,
        format,
        limit: limit === '' ? 0 : Number(limit)
      });
      setTaskId(res.data.task_id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start download');
      setLoading(false);
    }
  };


  const handleClearTask = () => {
    setTaskId(null);
    setStatus(null);
  };

  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await axios.post(`http://localhost:8001/api/apps/spotify_downloader/cancel/${taskId}`);
      setStatus(prev => ({ ...prev, status: 'cancelled' }));
      setTaskId(null);
      setLoading(false);
    } catch(e) {
      console.error(e);
    }
  };

  let progressPercent = 0;
  if (status && status.total > 0) {
    progressPercent = Math.round((status.downloaded / status.total) * 100);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
          <Music className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Spotify Downloader</h2>
          <p className="text-gray-500 text-sm">Download playlists and albums locally</p>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('download')}
          className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'download' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Download
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'library' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Local Library
        </button>
      </div>

      {activeTab === 'download' ? (
        <form onSubmit={handleDownload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spotify URL</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500"
              placeholder="https://open.spotify.com/playlist/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
              <select
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                disabled={loading}
              >
                <option value="mp3">MP3</option>
                <option value="flac">FLAC</option>
                <option value="m4a">M4A</option>
                <option value="wav">WAV</option>
                <option value="ogg">OGG</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Songs (Optional)</label>
              <input
                type="number"
                min="1"
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-green-500"
                placeholder="All"
                value={limit}
                onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : '')}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center p-3 mt-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition"
          >
            {loading ? <RefreshCcw className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
            {loading ? 'Processing...' : 'Start Download'}
          </button>

          {status && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 relative">
              <h3 className="font-semibold mb-2 flex items-center dark:text-white">
                Status: <span className="ml-2 px-2 py-1 bg-white dark:bg-gray-800 rounded text-sm uppercase">{status.status}</span>
                {status.status === 'downloading' && (
                  <button type="button" onClick={handleCancel} className="ml-auto flex items-center text-sm text-red-500 hover:text-red-700 font-medium">
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </button>
                )}
              </h3>

              {status.status === 'downloading' && (
                <div className="mt-4">
                   <div className="flex justify-between text-sm text-gray-500 mb-1">
                     <span>{status.downloaded} of {status.total} Tracks Downloaded</span>
                     <span>{progressPercent}%</span>
                   </div>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                     <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                   </div>
                </div>
              )}
              
              
              {status.status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-green-600 dark:text-green-400 font-medium mb-3">Download complete! Your file is ready.</p>
                  <div className="flex space-x-3">
                    <a
                      href={`http://localhost:8001/api/apps/spotify_downloader/zip/${taskId}`}
                      download
                      className="flex-1 flex items-center justify-center p-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Save ZIP to Device
                    </a>
                    <button
                      type="button"
                      onClick={handleClearTask}
                      className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {status.status === 'failed' && (
                <p className="text-red-500 mt-2 text-sm">{status.error}</p>
              )}
              {status.current_track && status.status !== 'completed' && status.status !== 'cancelled' && (
                <p className="text-gray-500 text-sm mt-3 animate-pulse">Now processing: {status.current_track}</p>
              )}
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-3">
          {library.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No downloaded files yet</p>
            </div>
          ) : (
            library.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-200 transition">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{f.name}</span>
                </div>
                <span className="text-sm text-gray-500 shrink-0 ml-4">{f.size_mb} MB</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
