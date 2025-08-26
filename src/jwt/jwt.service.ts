import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class JwtService {
	private readonly secret: string;

	constructor() {
		this.secret = process.env.JWT_SECRET || 'dev-secret';
	}

	// Sign a payload and return a compact JWT string. expiresInSec defaults to 1 hour.
	sign(payload: Record<string, any>, expiresInSec = 60 * 60): string {
		const header = { alg: 'HS256', typ: 'JWT' };
		const exp = Math.floor(Date.now() / 1000) + expiresInSec;
		const body = { ...payload, exp };

		const encode = (obj: any) =>
			Buffer.from(JSON.stringify(obj)).toString('base64url');

		const unsigned = `${encode(header)}.${encode(body)}`;
		const signature = this.hmac(unsigned);
		return `${unsigned}.${signature}`;
	}

	// Verify a token and return the decoded payload, or throw if invalid/expired.
	verify(token: string): Record<string, any> {
		if (!token) throw new UnauthorizedException('Empty token');
		const parts = token.split('.');
		if (parts.length !== 3) throw new UnauthorizedException('Invalid token');

		const [encHeader, encBody, sig] = parts;
		const unsigned = `${encHeader}.${encBody}`;
		const expected = this.hmac(unsigned);
		if (!this.timingSafeEqual(sig, expected)) {
			throw new UnauthorizedException('Invalid token signature');
		}

		const bodyJson = Buffer.from(encBody, 'base64url').toString();
		let body: Record<string, any>;
		try {
			body = JSON.parse(bodyJson);
		} catch (e) {
			throw new UnauthorizedException('Invalid token payload');
		}

		if (typeof body.exp === 'number' && Math.floor(Date.now() / 1000) >= body.exp) {
			throw new UnauthorizedException('Token expired');
		}

		return body;
	}

	private hmac(message: string) {
		return crypto.createHmac('sha256', this.secret).update(message).digest('base64url');
	}

	private timingSafeEqual(a: string, b: string) {
		const bufA = Buffer.from(a, 'utf8');
		const bufB = Buffer.from(b, 'utf8');
		if (bufA.length !== bufB.length) return false;
		return crypto.timingSafeEqual(bufA, bufB);
	}
}
