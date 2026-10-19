import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Admin password reset. Has no `currentPassword` because the admin doesn't
 * know it, so only the admin-guarded route accepts this shape.
 * Self-service changes use {@link ChangePasswordDto}.
 */
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

/**
 * Self-service password change. `currentPassword` is required so a stolen
 * access token can't be used to set a new password, which would also revoke
 * the owner's refresh tokens and lock them out.
 */
export class ChangePasswordDto extends UpdateUserPassword {
  @ApiProperty({
    description:
      "The caller's existing password. Verified before the change is applied.",
    example: "0ldStr0ng!Passw0rd",
    maxLength: 128,
    format: "password",
  })
  @IsString({ message: "Current password must be a string" })
  @IsNotEmpty({ message: "Current password is required" })
  @MaxLength(128, {
    message: "Current password must be less than 128 characters",
  })
  currentPassword!: string;
}
