import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, MaxLength } from "class-validator";

class AuthUserDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "johndoe" })
  username!: string;

  @ApiProperty({ isArray: true, type: String, example: ["user"] })
  roles!: string[];
}

export class AuthTokenResponseDto {
  @ApiProperty({ example: "Login successful" })
  message!: string;

  @ApiProperty({ description: "JWT access token (short-lived)." })
  accessToken!: string;

  @ApiProperty({ description: "JWT refresh token (long-lived)." })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ example: "bearer" })
  token_type!: string;
}

class CurrentUserDataDto {
  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ example: "johndoe" })
  username!: string;

  @ApiProperty({ isArray: true, type: String, example: ["user"] })
  roles!: string[];
}

export class CurrentUserResponseDto {
  @ApiProperty({ type: CurrentUserDataDto })
  data!: CurrentUserDataDto;
}

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: "User ID for which to refresh tokens.",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Refresh token. May be omitted if a `refreshToken` cookie is sent instead.",
  })
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}
