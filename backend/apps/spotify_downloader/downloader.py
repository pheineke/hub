
import os
import threading
import uuid
import shutil
import zipfile
from typing import Dict, Any
import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import yt_dlp
import traceback

# Mutagen imports for metadata
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, APIC, TIT2, TPE1, TALB, TPE2, TRCK, TDRC, TCON, TBPM, TPUB, TCOP, TPOS
from mutagen.mp4 import MP4, MP4Cover
from mutagen.flac import FLAC, Picture
from mutagen.oggvorbis import OggVorbis
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Active downloads cache
DOWNLOAD_TASKS: Dict[str, Dict[str, Any]] = {}

LIBRARY_DIR = "/home/pi/hub/backend/library/spotify_downloader"

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

def process_playlist_download(task_id: str, playlist_url: str, output_format: str, limit: int = 0):
    task = DOWNLOAD_TASKS[task_id]
    task["status"] = "initializing"
    
    sp = get_spotipy_client()
    if not sp:
        task["status"] = "failed"
        task["error"] = "Spotify Client ID or Secret missing in .env"
        return
    
    try:
        if 'playlist' in playlist_url:
            results = sp.playlist(playlist_url)
            tracks = results['tracks']['items']
            playlist_name = results['name']
        elif 'album' in playlist_url:
            results = sp.album(playlist_url)
            tracks = [{'track': t} for t in results['tracks']['items']]
            playlist_name = results['name']
        else:
            task["status"] = "failed"
            task["error"] = "Invalid Spotify URL"
            return
    except Exception as e:
        task["status"] = "failed"
        task["error"] = f"Failed to fetch Spotify data: {traceback.format_exc()}"
        return

    if limit > 0:
        tracks = tracks[:limit]

    if not os.path.exists(LIBRARY_DIR):
        os.makedirs(LIBRARY_DIR)

    task["total"] = len(tracks)
    task["status"] = "downloading"
    
    for idx, item in enumerate(tracks):
        if task.get("status") == "cancelled":
            break
        try:
            track = item['track']
            if not track:
                continue
                
            track_name = track['name']
            artist_name = track['artists'][0]['name']
            all_artists = ", ".join([a['name'] for a in track['artists']])
            
            # Handle difference between playlist and album objects
            album_name = track.get('album', {}).get('name', playlist_name)
            
            cover_url = None
            if 'album' in track and 'images' in track['album'] and len(track['album']['images']) > 0:
                cover_url = track['album']['images'][0]['url']
            elif 'images' in results and len(results['images']) > 0:
                cover_url = results['images'][0]['url']
                
            track_id = track['id']
            task["current_track"] = f"{artist_name} - {track_name}"
            
            # Check if file exists in library
            filename_base = f"{safe_filename(artist_name)} - {safe_filename(track_name)}"
            final_path = os.path.join(LIBRARY_DIR, f"{filename_base}.{output_format}")
            
            if os.path.exists(final_path):
                if final_path not in task.get("files", []):
                    task.setdefault("files", []).append(final_path)
                task["downloaded"] += 1
                continue

            query = f"{artist_name} {track_name} audio"
            
            video_url = None
            try:
                songlink_url = f"https://api.song.link/v1-alpha.1/links?platform=spotify&type=song&id={track_id}"
                odesli_resp = requests.get(songlink_url, timeout=5)
                if odesli_resp.status_code == 200:
                    odesli_data = odesli_resp.json()
                    links = odesli_data.get('linksByPlatform', {})
                    if 'youtubeMusic' in links:
                        video_url = links['youtubeMusic']['url']
                    elif 'youtube' in links:
                        video_url = links['youtube']['url']
            except:
                pass
                
            if not video_url:
                video_url = f"ytsearch1:{query}"

            def hook(d):
                pass

            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(LIBRARY_DIR, f'{filename_base}.%(ext)s'),
                'verbose': False,
                'quiet': True,
                'progress_hooks': [hook],
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': output_format,
                    'preferredquality': '192',
                }],
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])

            # ====== METADATA FETCHING ======
            # Year, Track, Disc
            year = track.get('album', {}).get('release_date', '')[:4]
            album_artist = track.get('album', {}).get('artists', [{}])[0].get('name', artist_name)
            track_num = track.get('track_number', 1)
            disc_num = track.get('disc_number', 1)
            
            bpm = ""
            genre = ""
            publisher = ""
            copyright_txt = ""

            try:
                # Tempo/BPM
                features = sp.audio_features([track_id])
                if features and features[0]:
                    bpm = str(int(round(features[0].get('tempo', 0))))
            except: pass
            
            try:
                # Genre
                artist_info = sp.artist(track['artists'][0]['id'])
                genres = artist_info.get('genres', [])
                if genres:
                    genre = genres[0].title()
            except: pass
            
            try:
                # Publisher/Copyright
                full_album = sp.album(track['album']['id'])
                if full_album.get('copyrights'):
                    copyright_txt = full_album['copyrights'][0].get('text', '')
                publisher = full_album.get('label', '')
            except: pass
            
            cover_data = None
            if cover_url:
                try:
                    cover_resp = requests.get(cover_url, timeout=5)
                    cover_data = cover_resp.content
                except: pass

            # ====== METADATA APPLICATION ======
            if os.path.exists(final_path):
                if final_path not in task.get("files", []):
                    task.setdefault("files", []).append(final_path)
                try:
                    if output_format == "mp3":
                        audio = ID3()
                        try: audio = ID3(final_path)
                        except: pass
                        
                        audio.add(TIT2(encoding=3, text=track_name))
                        audio.add(TPE1(encoding=3, text=all_artists))
                        audio.add(TALB(encoding=3, text=album_name))
                        if album_artist: audio.add(TPE2(encoding=3, text=album_artist))
                        if year: audio.add(TDRC(encoding=3, text=year))
                        if genre: audio.add(TCON(encoding=3, text=genre))
                        if bpm and bpm != "0": audio.add(TBPM(encoding=3, text=bpm))
                        audio.add(TRCK(encoding=3, text=str(track_num)))
                        audio.add(TPOS(encoding=3, text=str(disc_num)))
                        
                        if publisher: audio.add(TPUB(encoding=3, text=publisher))
                        if copyright_txt: audio.add(TCOP(encoding=3, text=copyright_txt))
                        
                        if cover_data:
                            audio.add(APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=cover_data))
                        audio.save(final_path, v2_version=3)
                        
                    elif output_format == "m4a":
                        audio = MP4(final_path)
                        audio['©nam'] = track_name
                        audio['©ART'] = all_artists
                        audio['©alb'] = album_name
                        if album_artist: audio['aART'] = album_artist
                        if year: audio['©day'] = year
                        if genre: audio['©gen'] = genre
                        if bpm and bpm != "0": audio['tmpo'] = [int(bpm)]
                        audio['trkn'] = [(track_num, 0)]
                        audio['disk'] = [(disc_num, 0)]
                        
                        if publisher: audio['©pub'] = publisher
                        if copyright_txt: audio['cprt'] = copyright_txt
                        
                        if cover_data:
                            audio['covr'] = [MP4Cover(cover_data, imageformat=MP4Cover.FORMAT_JPEG)]
                        audio.save()
                    
                    elif output_format in ["flac", "ogg"]:
                        if output_format == "flac":
                            audio = FLAC(final_path)
                        else:
                            audio = OggVorbis(final_path)
                            
                        audio['title'] = track_name
                        audio['artist'] = all_artists
                        audio['album'] = album_name
                        if album_artist: audio['albumartist'] = album_artist
                        if year: audio['date'] = year
                        if genre: audio['genre'] = genre
                        if bpm and bpm != "0": audio['bpm'] = bpm
                        audio['tracknumber'] = str(track_num)
                        audio['discnumber'] = str(disc_num)
                        
                        if publisher: audio['publisher'] = publisher
                        if copyright_txt: audio['copyright'] = copyright_txt
                        
                        if cover_data and output_format == "flac":
                            pic = Picture()
                            pic.type = 3
                            pic.mime = "image/jpeg"
                            pic.data = cover_data
                            audio.add_picture(pic)
                        
                        audio.save()
                        
                except Exception as meta_ex:
                    print(f"Metadata error: {meta_ex}")
                    pass 

            task["downloaded"] += 1
            
        except Exception as e:
            print(f"Track failed: {e}")
            import traceback
            traceback.print_exc()
            pass 
            
    if task.get("status") != "cancelled" and task.get("files"):
        task["status"] = "zipping"
        zip_filename = os.path.join(LIBRARY_DIR, f"{task_id}.zip")
        try:
            with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for fpath in task["files"]:
                    if os.path.exists(fpath):
                        zipf.write(fpath, os.path.basename(fpath))
            
            if os.path.exists(zip_filename):
                task["zip_path"] = zip_filename
            else:
                task["error"] = "ZIP file created but not found on disk."
                task["status"] = "failed"
                return
        except Exception as e:
            task["error"] = f"Failed to create ZIP: {str(e)}"
            task["status"] = "failed"
            return
    elif task.get("status") != "cancelled" and not task.get("files"):
        task["status"] = "failed"
        task["error"] = "No files were successfully downloaded to zip."
        return

    if task.get("status") not in ["cancelled", "failed"]:
        task["status"] = "completed"

def start_download_task(playlist_url: str, output_format: str, limit: int = 0) -> str:
    task_id = str(uuid.uuid4())
    DOWNLOAD_TASKS[task_id] = {
        "id": task_id,
        "status": "pending",
        "total": 0,
        "downloaded": 0,
        "current_track": "",
        "files": [],
        "zip_path": None,
        "format": output_format,
        "error": None
    }
    
    t = threading.Thread(target=process_playlist_download, args=(task_id, playlist_url, output_format, limit))
    t.start()
    return task_id
