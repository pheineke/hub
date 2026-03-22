with open("backend/apps/media_downloader/downloader.py", "r") as f:
    text = f.read()

text = text.replace('BASE_DIR = "/home/pi/hub/backend/library/media_downloader"', 'BASE_DIR = os.getenv("MEDIA_DOWNLOADER_DIR", "/app/backend/library/media_downloader")')

with open("backend/apps/media_downloader/downloader.py", "w") as f:
    f.write(text)
print("done")
