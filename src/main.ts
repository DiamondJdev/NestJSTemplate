import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	/** 
	 * Enable CORS for all origins bc screw security
	 * 
	 * @todo In production, CORS would be restricted to frontend and other trusted origins
	*/
	app.enableCors({
			origin: true, 
			credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
				whitelist: true, // Don't allow undecorated props
				forbidNonWhitelisted: true, // throws if extra props are present
				transform: true, // auto-transforms types (e.g., string -> number).
			}));

	const port = process.env.PORT || 5200;
	await app.listen(
		port,
		'0.0.0.0',
	);
	console.log(`Server running on http://0.0.0.0:${port}`);
}

/**
 * Any major error that can not be handled by NestJS will be caught in the code
 * below. The default behavior is to display the error on stdout and quit.
 *
 * @todo In production, we should build a logging service and log the error to a file
 * 	or external logging service instead of stdout.
 */
bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});