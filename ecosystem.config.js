// pm2 process definition for the BuildUp backend.
//
// Used by the GitHub Actions deploy workflow:
//   pm2 reload ecosystem.config.js --env production --update-env
//
// On first deploy, `pm2 start ecosystem.config.js --env production` bootstraps
// the process. Subsequent deploys use `reload` for zero-downtime restarts
// (requires cluster mode, which is set below).
module.exports = {
  apps: [
    {
      name: 'buildup-backend',
      script: 'server.js',
      cwd: __dirname,

      // Cluster mode with one worker per CPU core. `reload` (as opposed to
      // `restart`) brings workers up one at a time so there's no request gap.
      exec_mode: 'cluster',
      instances: 'max',

      // Restart the process if RSS grows beyond this. Protects against
      // runaway memory from long-running uploads / buffered files.
      max_memory_restart: '512M',

      // Merge stdout/stderr from all workers into one log so `pm2 logs` is
      // readable. Add timestamps so log lines are diagnosable.
      merge_logs: true,
      time: true,

      // Auto-restart policy.
      autorestart: true,
      min_uptime: '10s',
      max_restarts: 10,

      // Don't watch files in production — deploys are the only thing that
      // should cause a restart.
      watch: false,

      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
