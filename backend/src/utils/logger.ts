enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

class Logger {
  private getTimestamp() {
    return new Date().toISOString()
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown) {
    const timestamp = this.getTimestamp()
    const levelStr = level.toUpperCase().padEnd(5)
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    return `[${timestamp}] ${levelStr} ${message}${dataStr}`
  }

  debug(message: string, data?: unknown) {
    console.log(this.formatMessage(LogLevel.DEBUG, message, data))
  }

  info(message: string, data?: unknown) {
    console.log(this.formatMessage(LogLevel.INFO, message, data))
  }

  warn(message: string, data?: unknown) {
    console.warn(this.formatMessage(LogLevel.WARN, message, data))
  }

  error(message: string, data?: unknown) {
    console.error(this.formatMessage(LogLevel.ERROR, message, data))
  }
}

export const logger = new Logger()
