import { IsString, IsStrongPassword, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserPassword {
  @ApiProperty({
    description:
      "New plain-text password. Must be 12+ chars with at least 1 lowercase, 1 uppercase, 1 number, and 1 symbol.",
    example: "Str0ng!Passw0rd",
    minLength: 12,
    maxLength: 128,
    format: "password",
  })
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
        "Password is too weak. It must be at least 12 characters long and include uppercase letters, lowercase letters, numbers, and symbols.",
    },
  )
  @MaxLength(128, { message: "Password must be less than 128 characters" })
  password!: string;
}
