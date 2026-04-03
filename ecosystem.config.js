module.exports = {
  apps: [{
    name: 'yogdu-referral',
    script: 'npm',
    args: 'start',
    cwd: '/opt/yogdu-referral',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    env_file: '/opt/yogdu-referral/.env',
  }],
};
