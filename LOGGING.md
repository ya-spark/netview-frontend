# Backend Rotating Logger

This application includes a rotating logger that captures all backend logs and stores them in files with configurable size limits.

## Features

- **Automatic log rotation**: When a log file reaches the maximum file size, a new file is created
- **Storage limit enforcement**: Old log files are automatically deleted to keep total storage under the configured limit
- **Captures all logs**: All `console.log`, `console.error`, `console.warn`, and `console.info` calls are automatically captured
- **Structured format**: Logs include timestamp, log level, source, and message

## Environment Variables

Configure the logging system using these environment variables:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LOG_MAX_TOTAL_SIZE_MB` | Maximum total size of all log files in MB | `1` | `5` |
| `LOG_MAX_FILE_SIZE_MB` | Maximum size of a single log file in MB | `0.5` | `1` |
| `LOG_DIRECTORY` | Directory to store log files | `logs` | `/var/logs/app` |

## Usage

### Setting Environment Variables

You can set these variables in your `.env` file or directly in your environment:

```bash
LOG_MAX_TOTAL_SIZE_MB=2
LOG_MAX_FILE_SIZE_MB=1
LOG_DIRECTORY=./application-logs
```

### Log Format

Each log entry follows this format:

```
[TIMESTAMP] [LEVEL] [SOURCE] MESSAGE
```

Example:
```
[2025-10-12T06:20:29.400Z] [INFO] [server] Server started on port 5000
[2025-10-12T06:20:38.806Z] [WARN] [console] [API] WARN GET /auth/me 304 73ms 0b
[2025-10-12T06:20:41.588Z] [ERROR] [error-handler] [500] Internal Server Error - ...
```

### Accessing Log Statistics

Administrators can view log statistics via the API endpoint:

```
GET /api/admin/logs/stats
```

This endpoint requires authentication and Admin, Owner, or SuperAdmin role.

Response format:
```json
{
  "success": true,
  "data": {
    "totalSize": 1048576,
    "fileCount": 3,
    "currentFile": "/path/to/logs/backend-2025-10-12T06-20-26-133Z.log",
    "files": [
      {
        "path": "/path/to/logs/backend-2025-10-12T06-20-26-133Z.log",
        "name": "backend-2025-10-12T06-20-26-133Z.log"
      }
    ],
    "maxTotalSizeMB": 1,
    "maxFileSizeMB": 0.5,
    "logDirectory": "logs"
  },
  "timestamp": "2025-10-12T06:20:42.000Z"
}
```

## How It Works

1. **Initialization**: The logger is initialized at server startup before any other code runs
2. **Console Override**: Global `console.*` methods are overridden to capture all log output
3. **File Writing**: Logs are written to files in the configured directory
4. **Rotation**: When a file reaches the max file size, a new file is created
5. **Cleanup**: When total storage exceeds the limit, oldest files are deleted automatically

## Log File Naming

Log files are named using this pattern:
```
backend-{ISO_TIMESTAMP}.log
```

Example: `backend-2025-10-12T06-20-12-795Z.log`

## Programmatic Usage

You can also use the logger directly in your code:

```typescript
import { logger } from './utils/rotating-logger';

logger.info('This is an info message', 'my-service');
logger.error('This is an error message', 'my-service');
logger.warn('This is a warning message', 'my-service');
logger.debug('This is a debug message', 'my-service');
```

## Notes

- Log files are stored locally and are not persisted across deployments
- For production environments, consider using a centralized logging service
- The logger is designed for development and small-scale production use
- All log writes are synchronous to ensure logs are captured even if the process crashes
