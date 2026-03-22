with open("backend/apps/media_downloader/__init__.py", "r") as f:
    text = f.read()

if "from typing import " not in text:
    text = "from typing import Optional\n" + text
elif "Optional" not in text:
    text = text.replace("from typing import ", "from typing import Optional, ")

import re
text = re.sub(r'    title:.*?\n', '', text)
text = text.replace("    limit: int = 0\n", "    limit: int = 0\n    title: Optional[str] = None\n")

with open("backend/apps/media_downloader/__init__.py", "w") as f:
    f.write(text)
print("done")
