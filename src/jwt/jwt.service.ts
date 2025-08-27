// You can ignore these, eslint has a seizure when it sees good code
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
	sub: string; // userId
	role: string; // user role/permissions
}

@Injectable()
export class JwtService {
	constructor(
		private readonly jwtService: NestJwtService,
		private readonly configService: ConfigService,
	) {}

	// ----- ACCESS TOKEN -----
	generateAccessToken(payload: JwtPayload): Promise<string> {
		return this.jwtService.signAsync(payload, {
			secret: this.configService.get<string>('JWT_SECRET'), // Use symmetric secret
			algorithm: 'HS256', // Switch to HS256
			expiresIn: this.configService.get<string>('JWT_ACCESS_EXP', '15m'),
		});
	}

	// ----- REFRESH TOKEN -----
	generateRefreshToken(payload: JwtPayload): Promise<string> {
		return this.jwtService.signAsync(payload, {
			secret: this.configService.get<string>('JWT_SECRET'), // Use symmetric secret
			algorithm: 'HS256', // Switch to HS256
			expiresIn: this.configService.get<string>('JWT_REFRESH_EXP', '7d'),
		});
	}

	// Hash refresh tokens before storing in DB
	async hashToken(token: string): Promise<string> {
		const salt = await bcrypt.genSalt(10);
		return bcrypt.hash(token, salt);
	}

	compareToken(token: string, hash: string): Promise<boolean> {
		return bcrypt.compare(token, hash);
	}

	// ----- VALIDATION -----
	async verifyToken(token: string): Promise<boolean> {
		const secret = this.configService.get<string>('JWT_SECRET');
		try {
			await this.jwtService.verifyAsync<JwtPayload>(token, {
				secret, // Use symmetric secret
				algorithms: ['HS256'], // Switch to HS256
			});
			return true;
		} catch {
			return false;
		}
	}

	// Extract payload without validating signature (useful for debugging)
	decodeToken(token: string): JwtPayload | null {
		return this.jwtService.decode(token) as JwtPayload | null;
	}

	// ----- TOKEN ROTATION -----
	async rotateTokens(userId: string, role: string) {
		const payload: JwtPayload = { sub: userId, role };

		const accessToken = await this.generateAccessToken(payload);
		const refreshToken = await this.generateRefreshToken(payload);

		// Return both but hash refresh before saving
		return {
			accessToken,
			refreshToken,
			refreshTokenHash: await this.hashToken(refreshToken),
		};
	}
}
