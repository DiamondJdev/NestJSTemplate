import { IsString, IsNotEmpty, Length, MaxLength, IsAlphanumeric } from "class-validator";

export class loginUserDto {
  @IsNotEmpty({ message: "Username is required" })
  @IsString({ message: "Username must be a string" })
  @IsAlphanumeric(undefined, { message: "Username must contain only letters and numbers" })
  @Length(3, 20, { message: "Username must be more than 3 and less than 20 characters" })
  username: string;

  @IsNotEmpty({ message: "Password is required" })
  @MaxLength(128, { message: "Password must be less than 128 characters" })
  password: string;
}
