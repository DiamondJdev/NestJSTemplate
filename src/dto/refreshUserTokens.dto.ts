import { IsNotEmpty } from 'class-validator';

export class RefreshUserTokensDto {
	@IsNotEmpty({ message: 'User ID is required' })
	readonly userId: string;

	@IsNotEmpty({ message: 'Refresh token is required' })
	readonly refreshToken: string;
}
