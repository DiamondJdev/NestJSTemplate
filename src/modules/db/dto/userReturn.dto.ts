import { IsDate, IsString } from "class-validator";

/**
 * DTO for returning user data without sensitive information 
 * like password and refresh token.
 */
export class userReturnDto {
    @IsString()
    id: string;

    @IsString()
    username: string;

    @IsDate()
    createdAt: Date;

    @IsString()
    role: string;
}
