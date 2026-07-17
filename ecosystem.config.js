// pm2 process definition for the BuildUp backend.
//
// Used by the GitHub Actions deploy workflow:
//   pm2 reload ecosystem.config.js --only buildup-backend --env production --update-env  (production)
//   pm2 reload ecosystem.config.js --only buildup-backend-staging --update-env           (staging)
//
// Each environment is rsync'd into its own project directory on the VPS, and
// `cwd: __dirname` means pm2 starts each app from the directory where its
// ecosystem.config.js lives. The two apps therefore run independently and
// pick up their own `.env` (and hence their own PORT — except staging, which
// pins PORT below).
//
// We run in **fork mode** via `npm start` (one process per app). Cluster
// mode was tried first but every worker errored on boot, so we fell back to
// the same command developers run locally. With one process, `pm2 reload`
// degrades to a normal restart (brief downtime), which is fine for this app.
const baseApp = {
  // Run `npm start` so we use exactly the same entrypoint as local dev
  // (package.json: "start": "node server.js").
  script: 'npm',
  args: 'start',
  cwd: __dirname,

  exec_mode: 'fork',
  instances: 1,

  // Restart the process if RSS grows beyond this. Protects against
  // runaway memory from long-running uploads / buffered files.
  max_memory_restart: '512M',

  // Timestamps so log lines are diagnosable.
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
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      ...baseApp,
      name: 'buildup-backend-staging',
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
