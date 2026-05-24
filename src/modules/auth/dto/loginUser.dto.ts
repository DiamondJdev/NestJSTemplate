import {
  IsString,
  IsNotEmpty,
  Length,
  MaxLength,
  IsAlphanumeric,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class loginUserDto {
  @ApiProperty({ example: "johndoe", minLength: 3, maxLength: 64 })
  @IsNotEmpty({ message: "Username is required" })
  @IsString({ message: "Username must be a string" })
  @IsAlphanumeric(undefined, {
    message: "Username must contain only letters and numbers",
  })
  @Length(3, 64, {
    message: "Username must be more than 3 and less than 64 characters",
  })
  username!: string;

  @ApiProperty({
    example: "Str0ng!Passw0rd",
    maxLength: 128,
    format: "password",
  })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MaxLength(128, { message: "Password must be less than 128 characters" })
  password!: string;
}
