#!/bin/bash
echo "=== Disk Usage ==="
df -h /
echo ""

echo "=== Largest directories ==="
du -sh /opt/* 2>/dev/null | sort -rh | head -10
echo ""

echo "=== Docker disk usage ==="
docker system df 2>/dev/null
echo ""

echo "=== Cleaning up ==="
# Remove old backups
rm -rf /opt/yogdu-referral.bak.* 2>/dev/null
echo "Removed yogdu-referral backups"

# Clean Docker (dangling images, stopped containers, unused networks)
docker system prune -af --volumes 2>/dev/null || true
echo "Docker pruned"

# Clean apt cache
apt-get clean 2>/dev/null || true
rm -rf /var/cache/apt/archives/* 2>/dev/null
echo "APT cache cleaned"

# Clean npm cache
npm cache clean --force 2>/dev/null || true
echo "NPM cache cleaned"

# Clean old logs
journalctl --vacuum-time=3d 2>/dev/null || true
echo "Logs cleaned"

# Remove tmp files
rm -rf /tmp/project.tar.gz /tmp/deploy.sh /tmp/debug.sh 2>/dev/null
echo "Temp files cleaned"

echo ""
echo "=== Disk Usage After Cleanup ==="
df -h /
