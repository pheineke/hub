#!/bin/bash
# Auto Update Script for Production
# Scheduled to run nightly via cron

cd /home/pi/hub || exit 1

echo "=== Auto Update Check: $(date) ==="

# Fetch the remote metadata without touching local files yet
git fetch origin prod

# Ensure we're targeting the prod branch for comparison
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/prod)

# Ideally, the server directory should stay on 'prod' branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "prod" ]; then
    echo "Warning: Directory is not on 'prod' branch (currently on $current_branch)."
    # Optional: Force checkout prod to ensure clean updates
    git checkout prod
    LOCAL=$(git rev-parse HEAD)
fi

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Updates found on origin/prod. Pulling..."
    git pull origin prod
    
    echo "Running production update script..."
    /home/pi/hub/update_prod.sh
    echo "Update complete."
else
    echo "No updates found. Running latest version."
fi
echo "=================================="
