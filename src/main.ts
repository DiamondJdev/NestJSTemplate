import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Enable CORS for all origins bc screw security
  // ! In production, CORS would be restricted to frontend and other trusted origins
	app.enableCors({
			origin: true, 
			credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
				whitelist: true, // Don't allow undecorated props
				forbidNonWhitelisted: true, // throws if extra props are present
				transform: true, // auto-transforms types (e.g., string -> number). Can be less safe, but convenient for rapid development 
			}));

	const port = process.env.PORT || 5200;
	await app.listen(
		port,
		'0.0.0.0',
	);
	console.log(`Server running on http://0.0.0.0:${port}`);
}

/* 
 * Litterally just calls bootstrap() and ignores the returned promise
 * 
 * We can't make bootstrap() of type void because async functions always return a promise
 * and only calling bootstrap() would lead to an unsafe call of an `error` typed value.
*/
void bootstrap(); 