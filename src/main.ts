import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

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
	console.log(`Server running on http://${ip}:${port}`);
}

/**
 * Any major error that can not be handled by NestJS will be caught in the code
 * below. The default behavior is to display the error on stdout and quit.
 *
 * TODO: In production, we should build a logging service and log the error to a file
 * or external logging service instead of stdout.
 */
bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});