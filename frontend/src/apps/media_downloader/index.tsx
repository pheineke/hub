import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Download, CheckCircle, RefreshCcw, FolderOpen, XCircle, Clipboard } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const MediaDownloaderWidget = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp4'); // Default dynamic value
  const [resolution, setResolution] = useState('1080'); // Video specific
  const [limit, setLimit] = useState<number | ''>(''); // Spotify specific
  
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [library, setLibrary] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'download' | 'library'>('download');
  const [loading, setLoading] = useState(false);
  
  const token = useStore(state => state.token);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!url || (!url.includes('spotify.com') && !url.includes('youtube.com') && !url.includes('youtu.be'))) {
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.post(`http://${window.location.hostname}:8001/api/apps/media_downloader/preview`, { url });
        setPreview(res.data);
        if (res.data.type === 'youtube') setFormat('mp4');
        else if (res.data.type === 'spotify') setFormat('mp3');
      } catch (e) {
        console.error("Preview failed", e);
        setPreview(null);
      }
      setPreviewLoading(false);
    }, 700);

    return () => clearTimeout(debounceRef.current);
  }, [url]);

  const fetchLibrary = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:8001/api/apps/media_downloader/library`);
      setLibrary(res.data.files);
    } catch (e) {}
  };

  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await axios.get(`http://${window.location.hostname}:8001/api/apps/media_downloader/active`);
        const activeTasks = Object.keys(res.data.active);
        if (activeTasks.length > 0) {
          const lastActiveId = activeTasks[0];
          setTaskId(lastActiveId);
          setStatus(res.data.active[lastActiveId]);
          setLoading(true);
        }
      } catch (e) {}
    };
    checkActive();
  }, []);

  useEffect(() => {
    if (activeTab === 'library') fetchLibrary();
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    if (taskId && (!status || (status.status !== 'completed' && status.status !== 'failed' && status.status !== 'cancelled'))) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://${window.location.hostname}:8001/api/apps/media_downloader/status/${taskId}`);
          setStatus(res.data);
          if (res.data.status === 'completed' || res.data.status === 'failed' || res.data.status === 'cancelled') {
            clearInterval(interval);
            setLoading(false);
            if (activeTab === 'library') fetchLibrary(); 
          }
        } catch (e) {
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
      const res = await axios.post(`http://${window.location.hostname}:8001/api/apps/media_downloader/download`, {
        url,
        format,
        resolution,
        limit: limit === '' ? 0 : Number(limit)
      });
      setTaskId(res.data.task_id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start download');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await axios.post(`http://${window.location.hostname}:8001/api/apps/media_downloader/cancel/${taskId}`);
      setStatus((prev: any) => ({ ...prev, status: 'cancelled' }));
      setTaskId(null);
      setLoading(false);
    } catch(e) {}
  };

  let progressPercent = 0;
  if (status && status.total > 0) {
    progressPercent = Math.round((status.downloaded / status.total) * 100);
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 p-6 overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
          <Download className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Media Downloader</h2>
          <p className="text-gray-500 text-sm">Download high quality audio and video</p>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-gray-100 dark:border-gray-700 pb-2">
        <button onClick={() => setActiveTab('download')} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'download' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Download</button>
        <button onClick={() => setActiveTab('library')} className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'library' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Local Library</button>
      </div>

      {activeTab === 'download' ? (
        <form onSubmit={handleDownload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spotify or YouTube URL</label>
            <div className="relative flex items-center">
              <input type="text" required className="w-full p-3 pr-12 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading} />
              {typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText && (
                <button 
                  type="button" 
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setUrl(text);
                    } catch (err) {
                      console.error('Failed to read clipboard', err);
                      alert('Could not paste: Clipboard access is restricted on unsecured local networks. Try pressing Ctrl+V or Shift+Insert instead.');
                    }
                  }}
                  className="absolute right-2 p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 transition"
                  title="Paste from clipboard"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {previewLoading && <div className="text-sm text-gray-500 animate-pulse">Loading preview...</div>}
          
          {preview && !previewLoading && (
            <div className="flex items-center p-3 my-2 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
               {preview.thumbnail && <img src={preview.thumbnail} alt="cover" className="w-16 h-16 object-cover rounded-lg mr-4 bg-gray-200" />}
               <div className="flex flex-col flex-1 overflow-hidden">
                 <span className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1">{preview.type} {preview.media_type}</span>
                 <strong className="text-gray-800 dark:text-white truncate">{preview.title}</strong>
                 <span className="text-gray-500 text-sm truncate">{preview.author} {preview.item_count > 1 ? `(${preview.item_count} items)` : ''}</span>
               </div>
            </div>
          )}

          {preview && preview.type === 'spotify' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Audio Format</label>
                <div className="flex flex-wrap gap-2">
                  {['mp3', 'flac', 'm4a', 'wav', 'ogg'].map(f => (
                    <button
                      key={f}
                      type="button"
                      disabled={loading}
                      onClick={() => setFormat(f)}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-sm font-medium transition-colors ${format === f ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              {preview.item_count > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Songs (Optional)</label>
                  <input type="number" min="1" className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500" placeholder="All" value={limit} onChange={(e) => setLimit(e.target.value ? Number(e.target.value) : '')} disabled={loading} />
                </div>
              )}
            </div>
          )}

          {preview && preview.type === 'youtube' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-full space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Format</label>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      disabled={loading}
                      onClick={() => setFormat('mp4')}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${['mp4', 'mkv'].includes(format) ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      Video (MP4)
                    </button>
                    <button 
                      type="button" 
                      disabled={loading}
                      onClick={() => setFormat('mp3')}
                      className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${['mp3', 'm4a', 'wav'].includes(format) ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                      Audio (MP3)
                    </button>
                  </div>
                </div>

                {['mp4', 'mkv'].includes(format) && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Resolution</label>
                    <div className="flex flex-wrap gap-2">
                      {[{ val: 'best', label: 'Best' }, ...(preview?.resolutions ? preview.resolutions.map((r: string) => ({
                          val: r, 
                          label: r === '2160' ? '4K' : r === '1440' ? '1440p' : r === '1080' ? '1080p' : r === '720' ? '720p' : `${r}p`
                        })) : [
                          { val: '2160', label: '4K' },
                          { val: '1080', label: '1080p' },
                          { val: '720', label: '720p' },
                          { val: '480', label: '480p' }
                        ])].map((res) => (
                        <button
                          key={res.val}
                          type="button"
                          disabled={loading}
                          onClick={() => setResolution(res.val)}
                          className={`flex-1 min-w-[60px] py-3 px-3 rounded-xl text-sm font-medium transition-colors ${resolution === res.val ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                          {res.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || (!url)} className="w-full flex items-center justify-center p-3 mt-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? <RefreshCcw className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
            {loading ? 'Processing...' : 'Start Download'}
          </button>

          {status && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 relative">
              <h3 className="font-semibold mb-2 flex items-center dark:text-white">
                Status: <span className="ml-2 px-2 py-1 bg-white dark:bg-gray-800 rounded text-sm uppercase">{status.status}</span>
                {status.status === 'downloading' && (
                  <button type="button" onClick={handleCancel} className="ml-auto flex items-center text-sm text-red-500 hover:text-red-700 font-medium">
                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                  </button>
                )}
              </h3>

              {status.status === 'downloading' && (
                <div className="mt-4">
                   <div className="flex justify-between text-sm text-gray-500 mb-1">
                     <span>{status.downloaded} of {status.total} Items completed</span>
                     <span>{progressPercent}%</span>
                   </div>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                     <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                   </div>
                </div>
              )}
              
              {status.status === 'completed' && status.zip_path && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-blue-600 dark:text-blue-400 font-medium mb-3">Download complete! Your file is ready.</p>
                  <div className="flex space-x-3">
                    <a href={`http://${window.location.hostname}:8001/api/apps/media_downloader/zip/${taskId}`} download className="flex-1 flex items-center justify-center p-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition">
                      <Download className="w-5 h-5 mr-2" /> Save ZIP to Device
                    </a>
                    <button type="button" onClick={() => { setTaskId(null); setStatus(null); }} className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {status.status === 'failed' && <p className="text-red-500 mt-2 text-sm">{status.error}</p>}
              
              {status.skipped_tracks && status.skipped_tracks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-orange-500 mb-2">Skipped / Failed Items ({status.skipped_tracks.length}):</p>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2 max-h-40 overflow-y-auto bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    {status.skipped_tracks.map((t: any, i: number) => (
                      <li key={i} className="flex flex-col"><strong className="text-gray-800 dark:text-gray-200">{t.name}</strong><span className="text-red-500 break-words">{t.error}</span></li>
                    ))}
                  </ul>
                </div>
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
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 transition">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <CheckCircle className="w-5 h-5 text-blue-500 shrink-0" />
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
