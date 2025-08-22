import {
	IsEmail,
	IsNotEmpty,
	IsString,
	Length,
	Matches,
	IsStrongPassword,
} from 'class-validator';

export class CreateUserDto {
	@IsNotEmpty({ message: 'Email is required' })
	@IsEmail({}, { message: 'Invalid email format' })
	email: string;

	@IsNotEmpty()
	@IsString()
	firstName: string;

	@IsNotEmpty()
	@IsString()
	lastName: string;

	@IsNotEmpty({ message: 'Password is required' })
	@Length(8, 64, { message: 'Password must be between 8 and 64 characters' })
	// Require at least 1 uppercase, 1 lowercase, 1 number
	@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
		message: 'Password must contain uppercase, lowercase, and a number',
	})
	@IsStrongPassword({
		minLength: 12,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	password: string;

	@IsNotEmpty({ message: 'Username is required' })
	@Length(3, 20, { message: 'Username must be between 3 and 20 characters' })
	username: string;
}
