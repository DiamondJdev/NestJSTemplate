import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggerService } from './modules/common/logging/services/logger.service';
import { LoggingInterceptor } from './modules/common/logging/interceptors/logging.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
	});

	const logger = app.get(LoggerService);
	app.useLogger(logger);
	app.useGlobalInterceptors(new LoggingInterceptor(logger));

	/** 
	 * Enable CORS for all origins bc screw security
	 * 
	 * TODO: In production, CORS would be restricted to frontend and other trusted origins
	*/
	app.enableCors({ origin: true, credentials: true });

	app.useGlobalPipes(
		new ValidationPipe({
				whitelist: true, // Strips properties not in a DTO
				transform: true, // auto-transforms types (e.g., Convert string -> number if DTO wants number).
				stopAtFirstError: true, // Return after the first validation error instead of returning all errors
			}));

	const port = process.env.PORT || 5200;
	const ip = '0.0.0.0'
	await app.listen(port, ip);
	logger.log(`Server running on http://${ip}:${port}`, 'Bootstrap');
}

bootstrap().catch((err: unknown) => {
	const logger = new LoggerService();
	// Safely ensure type of err before accessing stack as some errors may not be Error instances
	const stack = err instanceof Error ? err.stack : 'Unknown error';
	logger.error('Fatal error during bootstrap', stack, 'Bootstrap');
	process.exit(1);
});