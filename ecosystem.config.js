const os = require('os');

// Determine the number of CPU cores available
const numCpus = os.cpus().length;

module.exports = {
  apps: [
    {
      name: 'caption-craft-api',
      script: 'dist/main.js',
      instances: Math.max(1, Math.floor(numCpus / 2)), // Use half the cores for API, min 1
      exec_mode: 'cluster',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
        PORT: 3000, // Or your desired port
      },
    },
    {
      name: 'transcription-worker',
      script: 'dist/worker.transcription.js',
      instances: Math.max(1, Math.floor(numCpus / 2)), // Use half the cores for transcription workers, min 1
      exec_mode: 'fork',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'burnin-worker',
      script: 'dist/worker.burnin.js',
      instances: Math.max(1, Math.floor(numCpus / 2)), // Use half the cores for burn-in workers, min 1
      exec_mode: 'fork',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'cleanup-worker',
      script: 'dist/worker.cleanup.js',
      instances: 1, // Only one instance needed for cleanup
      exec_mode: 'fork',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};