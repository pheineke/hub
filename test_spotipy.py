import os
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import requests

load_dotenv("backend/.env")

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET")
))

url = "https://open.spotify.com/playlist/0MvtpHxyKha77aULu5Rj7K?si=cd7db36f5c354f69"
try:
    r = sp.playlist(url)
    print("Success:", r['name'])
except Exception as e:
    print("Exception:", str(e))
