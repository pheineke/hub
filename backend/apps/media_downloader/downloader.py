import os
import threading
from functools import lru_cache
import uuid
import shutil
import zipfile
from typing import Dict, Any, List
import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import yt_dlp
import traceback

from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, APIC, TIT2, TPE1, TALB, TPE2, TRCK, TDRC, TCON, TBPM, TPUB, TCOP, TPOS
from mutagen.mp4 import MP4, MP4Cover
from mutagen.flac import FLAC, Picture
from mutagen.oggvorbis import OggVorbis
from dotenv import load_dotenv

load_dotenv()

DOWNLOAD_TASKS: Dict[str, Dict[str, Any]] = {}

BASE_DIR = os.getenv("MEDIA_DOWNLOADER_DIR", "/app/backend/library/media_downloader")
LIBRARY_DIR = os.path.join(BASE_DIR, "music")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
ZIPS_DIR = os.path.join(BASE_DIR, "zips")
VIDEO_DIR = os.path.join(BASE_DIR, "videos")

@lru_cache(maxsize=1)
def get_spotipy_client():
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None
    return spotipy.Spotify(auth_manager=SpotifyClientCredentials(
        client_id=client_id,
        client_secret=client_secret
    ))

def safe_filename(name: str):
    return "".join(c for c in name if c.isalnum() or c in " ._-").strip()

@lru_cache(maxsize=50)
def get_preview(url: str):
    if "spotify.com" in url:
        if "?" in url: url = url.split("?")[0]
        sp = get_spotipy_client()
        if not sp:
            return {"error": "Spotify credentials not configured"}
        try:
            if "playlist" in url:
                r = sp.playlist(url)
                return {"type": "spotify", "media_type": "playlist", "title": r['name'], "author": r['owner']['display_name'], "thumbnail": r['images'][0]['url'] if r.get('images') else "", "item_count": r['tracks']['total']}
            elif "album" in url:
                r = sp.album(url)
                return {"type": "spotify", "media_type": "album", "title": r['name'], "author": r['artists'][0]['name'], "thumbnail": r['images'][0]['url'] if r.get('images') else "", "item_count": r['total_tracks']}
            elif "track" in url:
                r = sp.track(url)
                return {"type": "spotify", "media_type": "track", "title": r['name'], "author": r['artists'][0]['name'], "thumbnail": r['album']['images'][0]['url'] if getattr(r, 'album', None) and r['album'].get('images') else "", "item_count": 1}
        except Exception as e:
            return {"error": str(e)}
    
    elif "youtube.com" in url or "youtu.be" in url:
        ydl_opts = {
            'quiet': True, 
            'extract_flat': True,
            'js_runtimes': {'node': {}},
            'remote_components': ['ejs:github']
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if 'entries' in info: # Playlist
                    return {"type": "youtube", "media_type": "playlist", "title": info.get('title', 'Unknown Playlist'), "author": info.get('uploader', ''), "thumbnail": info.get('thumbnails', [{}])[0].get('url', '') if info.get('thumbnails') else "", "item_count": len(list(info['entries']))}
                else:
                    # Parse available formats for the given video
                    formats = info.get('formats', [])
                    resolutions = set()
                    for f in formats:
                        h = f.get('height')
                        if h and isinstance(h, int) and h >= 144:
                            resolutions.add(h)
                    sorted_res = sorted(list(resolutions), reverse=True)
                    resolutions_str = [str(r) for r in sorted_res]
                    
                    return {"type": "youtube", "media_type": "video", "title": info.get('title', 'Unknown Video'), "author": info.get('uploader', ''), "thumbnail": info.get('thumbnail', ''), "item_count": 1, "resolutions": resolutions_str}
        except Exception as e:
            return {"error": str(e)}
    
    return {"error": "Unsupported URL"}

class BaseDownloader:
    def __init__(self, task_id: str, url: str):
        self.task_id = task_id
        self.url = url
        self.task = DOWNLOAD_TASKS[task_id]
        
    def ensure_dirs(self):
        for d in [LIBRARY_DIR, TEMP_DIR, ZIPS_DIR, VIDEO_DIR]:
            if not os.path.exists(d):
                os.makedirs(d)

    def zip_files(self):
        if self.task.get("status") != "cancelled" and self.task.get("files"):
            self.task["status"] = "zipping"
            zip_filename = os.path.join(ZIPS_DIR, f"{self.task_id}.zip")
            try:
                with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for fpath in self.task["files"]:
                        if os.path.exists(fpath):
                            zipf.write(fpath, os.path.basename(fpath))
                if os.path.exists(zip_filename):
                    self.task["zip_path"] = zip_filename
                    self.task["status"] = "completed"
                else:
                    self.task["error"] = "ZIP not found"
                    self.task["status"] = "failed"
            except Exception as e:
                self.task["error"] = f"ZIP failed: {str(e)}"
                self.task["status"] = "failed"
        elif self.task.get("status") != "cancelled" and not self.task.get("files"):
            self.task["status"] = "failed"
            self.task["error"] = "No files downloaded"

class YouTubeDownloader(BaseDownloader):
    def __init__(self, task_id: str, url: str, format_choice: str, resolution: str):
        super().__init__(task_id, url)
        self.format_choice = format_choice # mp4, mkv, or audio (mp3, flac, etc)
        self.resolution = resolution # 1080, 720, 480, 4k
        
    def run(self):
        self.ensure_dirs()
        self.task["status"] = "initializing"
        
        ydl_opts = {
            'outtmpl': os.path.join(TEMP_DIR, '%(title)s.%(ext)s'),
            'verbose': False,
            'quiet': True,
            'js_runtimes': {'node': {}},
            'remote_components': ['ejs:github'],
            'ignoreerrors': True,
        }
        
        if self.format_choice in ['mp4', 'mkv']:
            res_str = f"bestvideo[height<={self.resolution}]+bestaudio/best" if self.resolution != "best" else "bestvideo+bestaudio/best"
            ydl_opts['format'] = res_str
            ydl_opts['merge_output_format'] = self.format_choice
            output_dir = VIDEO_DIR
        else:
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': self.format_choice,
                'preferredquality': '192',
            }]
            output_dir = LIBRARY_DIR

        self.task["status"] = "downloading"
        self.task["total"] = 1 # We'll just assume 1 or update dynamic if playlist
        self.task["current_track"] = "Fetching info..."
        
        def progress_hook(d):
            if d['status'] == 'finished':
                self.task["downloaded"] += 1
        ydl_opts['progress_hooks'] = [progress_hook]

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(self.url, download=True)
                if not info:
                     raise Exception("Could not extract info")
                
                if 'entries' in info:
                    self.task["total"] = len(list(info['entries']))
                
                # Move from temp to final
                for file in os.listdir(TEMP_DIR):
                    src = os.path.join(TEMP_DIR, file)
                    if os.path.isfile(src):
                        dst = os.path.join(output_dir, file)
                        shutil.move(src, dst)
                        if dst not in self.task.get("files", []):
                            self.task.setdefault("files", []).append(dst)
                            
        except Exception as e:
            self.task["status"] = "failed"
            self.task["error"] = str(e)
            return

        self.zip_files()

class SpotifyDownloader(BaseDownloader):
    def __init__(self, task_id: str, url: str, output_format: str, limit: int):
        super().__init__(task_id, url)
        self.output_format = output_format
        self.limit = limit
        
    def run(self):
        self.ensure_dirs()
        self.task["status"] = "initializing"
        
        sp = get_spotipy_client()
        if not sp:
            self.task["status"] = "failed"
            self.task["error"] = "Spotify Client missing"
            return
            
        try:
            if 'playlist' in self.url:
                results = sp.playlist(self.url)
                tracks = results['tracks']['items']
                playlist_name = results['name']
            elif 'album' in self.url:
                results = sp.album(self.url)
                tracks = [{'track': t} for t in results['tracks']['items']]
                playlist_name = results['name']
            elif 'track' in self.url:
                results = sp.track(self.url)
                tracks = [{'track': results}]
                playlist_name = "Single Track"
            else:
                self.task["status"] = "failed"
                self.task["error"] = "Invalid Spotify URL"
                return
        except Exception as e:
            self.task["status"] = "failed"
            self.task["error"] = str(e)
            return

        if self.limit > 0:
            tracks = tracks[:self.limit]

        self.task["total"] = len(tracks)
        self.task["status"] = "downloading"
        
        for idx, item in enumerate(tracks):
            if self.task.get("status") == "cancelled": break
            try:
                track = item['track']
                if not track: continue
                track_name = track['name']
                artist_name = track['artists'][0]['name']
                all_artists = ", ".join([a['name'] for a in track['artists']])
                album_name = track.get('album', {}).get('name', playlist_name)
                
                cover_url = None
                if 'album' in track and 'images' in track['album'] and len(track['album']['images']) > 0:
                    cover_url = track['album']['images'][0]['url']
                elif 'images' in results and len(results['images']) > 0:
                    cover_url = results['images'][0]['url']
                    
                track_id = track['id']
                self.task["current_track"] = f"{artist_name} - {track_name}"
                filename_base = f"{safe_filename(artist_name)} - {safe_filename(track_name)}"
                final_path = os.path.join(LIBRARY_DIR, f"{filename_base}.{self.output_format}")
                
                if os.path.exists(final_path):
                    if final_path not in self.task.get("files", []):
                        self.task.setdefault("files", []).append(final_path)
                    self.task["downloaded"] += 1
                    continue

                query = f"{artist_name} {track_name} audio"
                video_url = None
                try:
                    odesli_resp = requests.get(f"https://api.song.link/v1-alpha.1/links?platform=spotify&type=song&id={track_id}", timeout=5)
                    if odesli_resp.status_code == 200:
                        odesli_data = odesli_resp.json()
                        links = odesli_data.get('linksByPlatform', {})
                        if 'youtubeMusic' in links: video_url = links['youtubeMusic']['url']
                        elif 'youtube' in links: video_url = links['youtube']['url']
                except: pass
                    
                if not video_url: video_url = f"ytsearch1:{query}"

                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': os.path.join(TEMP_DIR, f'{filename_base}.%(ext)s'),
                    'verbose': False,
                    'quiet': True,
                    'js_runtimes': {'node': {}},
                    'remote_components': ['ejs:github'],
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': self.output_format,
                        'preferredquality': '192',
                    }],
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])

                temp_path = os.path.join(TEMP_DIR, f"{filename_base}.{self.output_format}")
                if os.path.exists(temp_path): shutil.move(temp_path, final_path)
                
                for f in os.listdir(TEMP_DIR):
                    if f.startswith(filename_base): os.remove(os.path.join(TEMP_DIR, f))

                if os.path.exists(final_path):
                    if final_path not in self.task.get("files", []):
                        self.task.setdefault("files", []).append(final_path)
                
                self.task["downloaded"] += 1
                
            except Exception as e:
                self.task.setdefault("skipped_tracks", []).append({"name": self.task.get("current_track", "Unknown Track"), "error": str(e)})

        self.zip_files()


def start_download_task(req_data: dict, user_id: int = None) -> str:
    task_id = str(uuid.uuid4())
    DOWNLOAD_TASKS[task_id] = {
        "id": task_id,
        "status": "pending",
        "total": 0,
        "downloaded": 0,
        "current_track": "",
        "files": [],
        "skipped_tracks": [],
        "zip_path": None,
        "error": None,
        "title": req_data.get("title", "")
    }
    
    url = req_data.get('url', '')
    if "spotify.com" in url:
        dl = SpotifyDownloader(task_id, url, req_data.get('format', 'mp3'), req_data.get('limit', 0))
    elif "youtube.com" in url or "youtu.be" in url:
        dl = YouTubeDownloader(task_id, url, req_data.get('format', 'mp4'), req_data.get('resolution', '1080'))
    else:
        DOWNLOAD_TASKS[task_id]["status"] = "failed"
        DOWNLOAD_TASKS[task_id]["error"] = "Unsupported URL"
        return task_id
        
    def run_and_log():
        try:
            dl.run()
        finally:
            if user_id:
                # Calculate size of downloaded files
                total_size_bytes = 0
                for f in DOWNLOAD_TASKS[task_id].get("files", []):
                    try:
                        if os.path.exists(f):
                            total_size_bytes += os.path.getsize(f)
                    except:
                        pass
                if total_size_bytes > 0:
                    mb_used = max(1, total_size_bytes // (1024 * 1024))
                    try:
                        import sys
                        sys.path.append("/home/pi/hub/backend")
                        from database import SessionLocal
                        from models import User
                        from datetime import date
                        
                        db = SessionLocal()
                        user = db.query(User).filter(User.id == user_id).first()
                        if user:
                            # Reset if new day
                            if user.last_download_reset != date.today():
                                user.downloaded_today_mb = 0
                                user.last_download_reset = date.today()
                            if user.downloaded_today_mb is None:
                                user.downloaded_today_mb = 0
                            user.downloaded_today_mb += mb_used
                            db.commit()
                        db.close()
                    except Exception as e:
                        print("Error updating user limit:", e)
                        
    t = threading.Thread(target=run_and_log)
    t.start()
    return task_id
