import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DbService } from '../../../db/db.service';

@Controller('health')
export class HealthController {
	constructor(private readonly dbService: DbService) {}
	
	/**
	* Root endpoint for API health check
	* Checks the status of database and backend services
	*/
	@Get()
	@HttpCode(HttpStatus.OK)
	async getHealth() {
		// Default to unhealthy, prove otherwise
		let databaseStatus = 'unhealthy';
		let backendStatus = 'unhealthy';

		// TODO: Add logging - Log health check initiated
		const start = Date.now();
		const dbHealth = await this.dbService.healthCheck();
		const dbLatency = Date.now() - start;
		databaseStatus = dbLatency < 1000 && dbHealth ? 'healthy' : 'unhealthy';

		// TODO: Add more service checks
		try {
			backendStatus = 'healthy';
		} catch {
			backendStatus = 'unhealthy';
		}
		
		// TODO: Add logging - Log final health check result with overall status
		return {
			message: "Template API",
			version: "1.0.0", // Ideally sourced from package.json or environment
			database: {
				status: databaseStatus,
				latency: dbLatency + ' ms',
			},
			backend: {
				status: backendStatus,
				uptime: Math.floor(process.uptime()) + ' seconds',
			},
			timestamp: new Date().toISOString(),
		};
	}
}

