import {
  IsNotEmpty,
  IsString,
  Length,
  IsStrongPassword,
  IsAlphanumeric,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "johndoe", minLength: 3, maxLength: 64 })
  @IsNotEmpty({ message: "Username is required" })
  @IsString()
  @IsAlphanumeric(undefined, {
    message: "Username must contain only letters and numbers",
  })
  @Length(3, 64, { message: "Username must be between 3 and 64 characters" })
  username!: string;

  @ApiProperty({
    example: "Str0ng!Passw0rd",
    minLength: 12,
    maxLength: 128,
    format: "password",
  })
  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  @IsStrongPassword(
    {
      minLength: 12,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        "Password must be 12 characters, 1 lowercase, 1 uppercase, 1 number, and 1 symbol",
    },
  )
  @MaxLength(128, { message: "Password must be less than 128 characters" })
  password!: string;
}
