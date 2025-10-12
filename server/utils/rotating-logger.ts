import fs from 'fs';
import path from 'path';

interface LoggerConfig {
  maxTotalSize: number; // Maximum total size in bytes
  maxFileSize: number; // Maximum single file size in bytes
  logDirectory: string; // Directory to store logs
}

class RotatingLogger {
  private config: LoggerConfig;
  private currentLogFile: string;
  private currentFileSize: number = 0;

  constructor() {
    // Read configuration from environment variables
    const maxTotalSizeMB = parseFloat(process.env.LOG_MAX_TOTAL_SIZE_MB || '1');
    const maxFileSizeMB = parseFloat(process.env.LOG_MAX_FILE_SIZE_MB || '0.5');
    const logDirectory = process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs');

    this.config = {
      maxTotalSize: maxTotalSizeMB * 1024 * 1024, // Convert MB to bytes
      maxFileSize: maxFileSizeMB * 1024 * 1024, // Convert MB to bytes
      logDirectory,
    };

    // Ensure log directory exists
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }

    // Initialize current log file
    this.currentLogFile = this.getNewLogFileName();
    
    // Get current file size if it exists
    if (fs.existsSync(this.currentLogFile)) {
      const stats = fs.statSync(this.currentLogFile);
      this.currentFileSize = stats.size;
    }
  }

  private getNewLogFileName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.config.logDirectory, `backend-${timestamp}.log`);
  }

  private getLogFiles(): string[] {
    if (!fs.existsSync(this.config.logDirectory)) {
      return [];
    }
    
    return fs.readdirSync(this.config.logDirectory)
      .filter(file => file.startsWith('backend-') && file.endsWith('.log'))
      .map(file => path.join(this.config.logDirectory, file))
      .sort((a, b) => {
        const statsA = fs.statSync(a);
        const statsB = fs.statSync(b);
        return statsB.mtime.getTime() - statsA.mtime.getTime(); // Most recent first
      });
  }

  private getTotalLogSize(): number {
    const logFiles = this.getLogFiles();
    return logFiles.reduce((total, file) => {
      const stats = fs.statSync(file);
      return total + stats.size;
    }, 0);
  }

  private enforceStorageLimit(): void {
    let totalSize = this.getTotalLogSize();
    const logFiles = this.getLogFiles();

    // Remove oldest files until we're under the limit
    while (totalSize > this.config.maxTotalSize && logFiles.length > 1) {
      const oldestFile = logFiles.pop(); // Remove from end (oldest)
      if (oldestFile && oldestFile !== this.currentLogFile) {
        const stats = fs.statSync(oldestFile);
        fs.unlinkSync(oldestFile);
        totalSize -= stats.size;
      }
    }
  }

  private rotateLogFile(): void {
    this.currentLogFile = this.getNewLogFileName();
    this.currentFileSize = 0;
    this.enforceStorageLimit();
  }

  public log(level: string, message: string, source: string = 'backend'): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}\n`;
    const messageSize = Buffer.byteLength(formattedMessage, 'utf8');

    // Check if we need to rotate the file
    if (this.currentFileSize + messageSize > this.config.maxFileSize) {
      this.rotateLogFile();
    }

    // Write to file
    fs.appendFileSync(this.currentLogFile, formattedMessage, 'utf8');
    this.currentFileSize += messageSize;

    // Enforce storage limit after writing
    this.enforceStorageLimit();
  }

  public info(message: string, source?: string): void {
    this.log('info', message, source);
  }

  public error(message: string, source?: string): void {
    this.log('error', message, source);
  }

  public warn(message: string, source?: string): void {
    this.log('warn', message, source);
  }

  public debug(message: string, source?: string): void {
    this.log('debug', message, source);
  }

  public getLogStats(): { totalSize: number; fileCount: number; currentFile: string } {
    const logFiles = this.getLogFiles();
    return {
      totalSize: this.getTotalLogSize(),
      fileCount: logFiles.length,
      currentFile: this.currentLogFile,
    };
  }

  public getLogFilesList(): string[] {
    return this.getLogFiles();
  }
}

// Export singleton instance
export const logger = new RotatingLogger();
