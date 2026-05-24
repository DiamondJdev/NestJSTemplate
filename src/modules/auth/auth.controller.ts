import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Patch,
  Post,
  Request,
  Response,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import ms, { type StringValue } from "ms";
import type { CookieOptions, Response as ExpressResponse } from "express";
import { AuthService } from "./auth.service";
import { BodyRequiredGuard } from "./guard/body-required.guard";
import { JwtAuthGuard } from "./guard/jwt-auth.guard";
import { createUserDto } from "./dto/createUser.dto";
import { loginUserDto } from "./dto/loginUser.dto";
import {
  AuthTokenResponseDto,
  CurrentUserResponseDto,
  RefreshTokenRequestDto,
} from "./AuthResponse.dto";
import type { AuthenticatedRequest } from "../core/AuthenticatedRequest";

@ApiTags("Auth")
@Controller("/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getTokenMaxAgeMs(tokenType: "access" | "refresh"): number {
    const envKey =
      tokenType === "access" ? "JWT_ACCESS_EXP" : "JWT_REFRESH_EXP";
    const raw = this.configService.get<StringValue>(envKey);
    if (!raw) throw new InternalServerErrorException("Internal Server Error");
    return ms(raw);
  }

  private getCookieBaseOptions(): CookieOptions {
    const isProduction = this.configService.get("NODE_ENV") === "production";
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    };
  }

  private setAuthCookies(
    res: ExpressResponse,
    accessToken: string,
    refreshToken: string,
  ): void {
    const base = this.getCookieBaseOptions();
    res.cookie("accessToken", accessToken, {
      ...base,
      maxAge: this.getTokenMaxAgeMs("access"),
    });
    res.cookie("refreshToken", refreshToken, {
      ...base,
      maxAge: this.getTokenMaxAgeMs("refresh"),
    });
  }

  private clearAuthCookies(res: ExpressResponse): void {
    const base = this.getCookieBaseOptions();
    res.clearCookie("accessToken", base);
    res.clearCookie("refreshToken", base);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @UseGuards(BodyRequiredGuard)
  @ApiOperation({
    summary: "Authenticate a user",
    description:
      "Verifies credentials and issues access + refresh JWTs. Tokens are returned in the response body and also set as HttpOnly `accessToken` / `refreshToken` cookies. Rate limited to 5 attempts/minute per IP.",
  })
  @ApiBody({ type: loginUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Login successful.",
    type: AuthTokenResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Missing or malformed credentials." })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Invalid username or password." })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: "Too many login attempts." })
  async login(
    @Body() loginUserDto: loginUserDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; roles: string[] };
    token_type: string;
  }> {
    const result = await this.authService.login(loginUserDto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { ...result, token_type: "bearer" };
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @UseGuards(BodyRequiredGuard)
  @ApiOperation({
    summary: "Register a new user",
    description:
      "Creates a new account, hashes the password (bcrypt cost 12), issues access + refresh JWTs, and sets HttpOnly cookies. Rate limited to 5 attempts/minute per IP.",
  })
  @ApiBody({ type: createUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "User created and authenticated.",
    type: AuthTokenResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid input (e.g. weak password)." })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: "Username is already taken." })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: "Too many registration attempts." })
  async register(
    @Body() createUserDto: createUserDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; roles: string[] };
    token_type: string;
  }> {
    const result = await this.authService.register(createUserDto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { ...result, token_type: "bearer" };
  }

  @Patch("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(BodyRequiredGuard)
  @ApiOperation({
    summary: "Refresh access and refresh tokens",
    description:
      "Rotates the user's tokens. The refresh token may be supplied in the request body or via the `refreshToken` HttpOnly cookie. New tokens are returned in the body and re-set as cookies.",
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Tokens refreshed successfully.",
    type: AuthTokenResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Refresh token is missing, invalid, or expired." })
  async refresh(
    @Request() req: AuthenticatedRequest,
    @Body() refreshTokenDto: RefreshTokenRequestDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken =
      (req.cookies as Record<string, string> | undefined)?.["refreshToken"] ||
      refreshTokenDto.refreshToken;
    if (!refreshToken)
      throw new UnauthorizedException("Refresh token is missing");

    const result = await this.authService.refresh(
      refreshTokenDto.id,
      refreshToken,
    );
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { ...result, token_type: "bearer" };
  }

  @Delete("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Log out the current user",
    description:
      "Invalidates the user's refresh token server-side and clears the `accessToken` / `refreshToken` cookies.",
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "Logout successful." })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Missing or invalid JWT." })
  async logout(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<void> {
    await this.authService.invalidateUserTokens(req.user.id);
    this.clearAuthCookies(res);
  }

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Get the authenticated user",
    description: "Returns identity information for the caller.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current user retrieved.",
    type: CurrentUserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Missing or invalid JWT." })
  async getCurrentUser(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ data: { userId: string; username: string; roles: string[] } }> {
    return {
      data: {
        userId: req.user.id,
        username: req.user.username,
        roles: req.user.roles,
      },
    };
  }
}
