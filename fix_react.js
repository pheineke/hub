const fs = require('fs');
const path = require('path');
const p = '/home/pi/hub/frontend/src/apps/media_downloader/index.tsx';
let code = fs.readFileSync(p, 'utf8');

// Wait... let's just make the changes directly.
