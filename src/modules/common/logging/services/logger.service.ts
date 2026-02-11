import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
	ERROR = 'ERROR',
	WARN = 'WARN',
	INFO = 'INFO',
	DEBUG = 'DEBUG',
}

interface LogEntry {
	timestamp: string;
	level: LogLevel;
	context?: string;
	message: string;
	metadata?: any;
}

@Injectable()
export class LoggerService implements NestLoggerService {
	private logDir: string;
	private errorLogFile: string;
	private combinedLogFile: string;
	private statsLogFile: string;
	
	constructor() {
		this.logDir = path.join(process.cwd(), 'logs');
		this.errorLogFile = path.join(this.logDir, 'error.log');
		this.combinedLogFile = path.join(this.logDir, 'combined.log');
		this.statsLogFile = path.join(this.logDir, 'stats.log');
		this.ensureLogDirectory();
	}
	
	private ensureLogDirectory(): void {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}
	
	private formatLogEntry(entry: LogEntry): string {
		const { timestamp, level, context, message, metadata } = entry;
		const contextStr = context ? `[${context}]` : '';
		const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
		return `${timestamp} [${level}]${contextStr} ${message}${metadataStr}\n`;
	}
	
	private writeLog(entry: LogEntry): void {
		const formattedLog = this.formatLogEntry(entry);
		
		// Write to combined log
		fs.appendFileSync(this.combinedLogFile, formattedLog);
		
		// Write to error log if it's an error
		if (entry.level === LogLevel.ERROR) {
			fs.appendFileSync(this.errorLogFile, formattedLog);
		}
		
		// Also log to console in development
		if (process.env.NODE_ENV !== 'production') {
			const coloredLog = this.colorizeLog(entry);
			console.log(coloredLog);
		}
	}
	
	private colorizeLog(entry: LogEntry): string {
		const colors = {
			ERROR: '\x1b[31m', // Red
			WARN: '\x1b[33m',  // Yellow
			INFO: '\x1b[36m',  // Cyan
			DEBUG: '\x1b[37m', // White
		};
		const reset = '\x1b[0m';
		const color = colors[entry.level] || reset;
		return `${color}${this.formatLogEntry(entry).trim()}${reset}`;
	}
	
	log(message: any, context?: string): void {
		this.writeLog({
			timestamp: new Date().toISOString(),
			level: LogLevel.INFO,
			context,
			message: typeof message === 'string' ? message : JSON.stringify(message),
		});
	}
	
	error(message: any, trace?: string, context?: string): void {
		this.writeLog({
			timestamp: new Date().toISOString(),
			level: LogLevel.ERROR,
			context,
			message: typeof message === 'string' ? message : JSON.stringify(message),
			metadata: trace ? { trace } : undefined,
		});
	}
	
	warn(message: any, context?: string): void {
		this.writeLog({
			timestamp: new Date().toISOString(),
			level: LogLevel.WARN,
			context,
			message: typeof message === 'string' ? message : JSON.stringify(message),
		});
	}
	
	debug(message: any, context?: string): void {
		this.writeLog({
			timestamp: new Date().toISOString(),
			level: LogLevel.DEBUG,
			context,
			message: typeof message === 'string' ? message : JSON.stringify(message),
		});
	}
	
	verbose(message: any, context?: string): void {
		this.log(message, context);
	}
	
	logRequest(method: string, url: string, statusCode: number, duration: number, userId?: string): void {
		this.writeLog({
			timestamp: new Date().toISOString(),
			level: LogLevel.INFO,
			context: 'HTTP',
			message: `${method} ${url} ${statusCode}`,
			metadata: {
				duration: `${duration}ms`,
				userId: userId || 'anonymous',
			},
		});
	}
	
	logUserStats(action: string, userId: string, metadata?: any): void {
		const logEntry: LogEntry = {
			timestamp: new Date().toISOString(),
			level: LogLevel.INFO,
			context: 'UserStats',
			message: `User ${userId} - ${action}`,
			metadata,
		};
		
		// Write to stats log
		fs.appendFileSync(this.statsLogFile, this.formatLogEntry(logEntry));
		
		// Also write to combined log
		this.writeLog(logEntry);
	}
}
