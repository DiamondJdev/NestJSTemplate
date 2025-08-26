import { IsEmail, IsNotEmpty, Length, IsStrongPassword } from 'class-validator';

export class loginUserDto {
	@IsEmail({}, { message: 'Invalid email format' })
	@IsNotEmpty({ message: 'Email is required' })
	email: string;

	@IsNotEmpty({ message: 'Password is required' })
	@Length(8, 64, { message: 'Password must be between 8 and 64 characters' })
	@IsStrongPassword({
		minLength: 12,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	password: string;
}
