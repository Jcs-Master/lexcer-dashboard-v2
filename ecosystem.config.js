module.exports = {
  apps: [
    {
      name: 'lexcer-backend',
      cwd: './backend',
      script: 'run.py',
      interpreter: 'python',
      env: {
        FLASK_ENV: 'development',
        PYTHONUNBUFFERED: '1'
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      merge_logs: true
    },
    {
      name: 'lexcer-frontend',
      cwd: './frontend',
      script: 'pm2-server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true,
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '../logs/frontend-error.log',
      out_file: '../logs/frontend-out.log',
      merge_logs: true
    }
  ]
}