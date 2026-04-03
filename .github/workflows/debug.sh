#!/bin/bash
echo "=== Disk Usage ==="
df -h /
echo ""

echo "=== Largest directories ==="
du -sh /opt/* /var/* /tmp/* 2>/dev/null | sort -rh | head -15
echo ""

echo "=== Cleaning ==="
# Remove old backups
rm -rf /opt/yogdu-referral.bak.* 2>/dev/null
rm -rf /opt/yogdu-referral/.next/cache 2>/dev/null
rm -rf /opt/yogdu-referral/node_modules/.cache 2>/dev/null
rm -rf /tmp/* 2>/dev/null

# Clean Docker
docker system prune -af --volumes 2>/dev/null || true

# Clean apt
apt-get clean 2>/dev/null
rm -rf /var/cache/apt/archives/* 2>/dev/null

# Clean npm
npm cache clean --force 2>/dev/null

# Clean logs
journalctl --vacuum-time=1d 2>/dev/null
rm -rf /var/log/*.gz 2>/dev/null
rm -rf /var/log/nginx/*.gz 2>/dev/null

# Clean PM2 logs
pm2 flush 2>/dev/null || true

echo ""
echo "=== After cleanup ==="
df -h /
