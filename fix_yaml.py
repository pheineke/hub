with open("/home/pi/hub/docker-compose.yml", "r") as f:
    text = f.read()

import re
text = re.sub(r'      - SPOTIFY_CLIENT_ID.*\n', '', text)
text = re.sub(r'      - SPOTIFY_CLIENT_SECRET.*\n', '', text)

with open("/home/pi/hub/docker-compose.yml", "w") as f:
    f.write(text)

with open("/home/pi/hub/docker-compose.test.yml", "r") as f:
    text = f.read()

text = re.sub(r'      - SPOTIFY_CLIENT_ID.*\n', '', text)
text = re.sub(r'      - SPOTIFY_CLIENT_SECRET.*\n', '', text)

with open("/home/pi/hub/docker-compose.test.yml", "w") as f:
    f.write(text)
print("done")
