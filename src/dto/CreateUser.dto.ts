import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
	Length,
} from 'class-validator';

export class CreateUserDto {
	@IsNotEmpty()
	@IsString()
	userId: string;

	@IsNotEmpty()
	@IsString()
	@Length(3, 20)
	firstName: string;

	@IsNotEmpty()
	@IsString()
	@Length(3, 20)
	lastName: string;

	@IsNotEmpty()
	@IsEmail()
	email: string;

	@IsNotEmpty()
	@IsString()
	@IsStrongPassword({
		minLength: 12,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	password: string;
}
