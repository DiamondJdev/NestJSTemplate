import { IsNotEmpty, MaxLength, IsString } from "class-validator";

export class RefreshUserTokensDto {
  @IsNotEmpty({ message: "Refresh token is required" })
  @IsString({ message: "Refresh token must be a string" })
  @MaxLength(512, { message: "Refresh token must be less than 512 characters" })
  readonly refreshToken: string;
}
