import re
with open('/home/pi/hub/backend/apps/media_downloader/downloader.py', 'r') as f:
    code = f.read()

# Add query param stripping for spotify
code = code.replace('if "spotify.com" in url:\n        sp = get_spotipy_client()', 'if "spotify.com" in url:\n        if "?" in url: url = url.split("?")[0]\n        sp = get_spotipy_client()')
with open('/home/pi/hub/backend/apps/media_downloader/downloader.py', 'w') as f:
    f.write(code)
