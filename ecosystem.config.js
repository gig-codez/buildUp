// pm2 process definition for the BuildUp backend.
//
// Used by the GitHub Actions deploy workflow:
//   pm2 reload ecosystem.config.js --env production --update-env  (production)
//   pm2 reload ecosystem.config.js --only buildup-backend-staging --update-env  (staging)
//
// Each environment is rsync'd into its own project directory on the VPS, and
// `cwd: __dirname` means pm2 starts each app from the directory where its
// ecosystem.config.js lives. The two apps therefore run independently and
// pick up their own `.env` (and hence their own PORT).
//
// On first deploy, `pm2 start ecosystem.config.js [--env production | --only buildup-backend-staging]`
// bootstraps the process. Subsequent deploys use `reload` for zero-downtime
// restarts (requires cluster mode, which is set below).
const baseApp = {
  script: 'server.js',
  cwd: __dirname,

  // Cluster mode with one worker per CPU core. `reload` (as opposed to
  // `restart`) brings workers up one at a time so there's no request gap.
  exec_mode: 'cluster',

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

  // Don't watch files — deploys are the only thing that should cause a restart.
  watch: false,
};

module.exports = {
  apps: [
    {
      ...baseApp,
      name: 'buildup-backend',
      instances: 'max',
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      ...baseApp,
      name: 'buildup-backend-staging',
      // Staging doesn't need every core — keep it light so prod isn't starved.
      instances: 2,
      env: {
        NODE_ENV: 'staging',
        // Pinned here (rather than in .env) so staging can never accidentally
        // collide with prod's port. dotenv.config() does not override values
        // already present in process.env, so this wins over .env.
        PORT: 5001,
      },
    },
  ],
};
