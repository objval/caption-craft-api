const os = require('os');

// Determine the number of CPU cores available
const numCpus = os.cpus().length;

module.exports = {
  apps: [
    {
      name: 'caption-craft-api',
      script: 'dist/main.js',
      instances: 1, // Reduced from 2 to 1 to minimize Redis connections
      exec_mode: 'cluster',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
        PORT: 3000, // Or your desired port
      },
    },
    {
      name: 'transcription-worker',
      script: 'worker.transcription.js',
      instances: 1, // Reduce to 1 instance to minimize Redis usage
      exec_mode: 'fork',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'burnin-worker',
      script: 'worker.burnin.js',
      instances: 1, // Reduce to 1 instance to minimize Redis usage
      exec_mode: 'fork',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'cleanup-worker',
      script: 'worker.cleanup.js',
      instances: 1, // Only one instance needed for cleanup
      exec_mode: 'fork',
      watch: false, // Set to true for development, false for production
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
