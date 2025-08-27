import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true, // strips unknown properties
			forbidNonWhitelisted: true, // throws if extra props provided
			transform: true, // auto-transforms types (e.g., string -> number)
		}),
	);

	await app.listen(3000);
}
void bootstrap();
