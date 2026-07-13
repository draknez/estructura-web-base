{
  "name": "balog",
  "script": "./server/index.js",
  "instances": 1,
  "exec_mode": "fork",
  "autorestart": true,
  "watch": false,
  "max_memory_restart": "512M",
  "kill_timeout": 8000,
  "wait_ready": false,
  "listen_timeout": 10000,
  "env": {
    "NODE_ENV": "production",
    "PORT": 3000,
    "HOST": "127.0.0.1"
  },
  "env_development": {
    "NODE_ENV": "development"
  },
  "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
  "error_file": "./logs/err.log",
  "out_file": "./logs/out.log",
  "merge_logs": true,
  "time": true
}