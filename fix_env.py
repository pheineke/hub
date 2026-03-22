with open("/home/pi/hub/docker-compose.yml", "r") as f:
    text = f.read()

import re
if 'env_file:' not in text:
    text = text.replace("    environment:", "    env_file:\n      - ./backend/.env\n    environment:")

with open("/home/pi/hub/docker-compose.yml", "w") as f:
    f.write(text)

with open("/home/pi/hub/docker-compose.test.yml", "r") as f:
    text = f.read()

if 'env_file:' not in text:
    text = text.replace("    environment:", "    env_file:\n      - ./backend/.env\n    environment:")

with open("/home/pi/hub/docker-compose.test.yml", "w") as f:
    f.write(text)

print("done")
