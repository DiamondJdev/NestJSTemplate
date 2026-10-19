import {
  Controller,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UsersService } from "../db/services/users.service";
import {
  ChangePasswordDto,
  UpdateUserPassword,
} from "../core/dto/updatePassword.dto";
import {
  CurrentUserResponseDto,
  UserListResponseDto,
  UserUpdatedResponseDto,
} from "./dto/users.response.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../core/flow/roles.guard";
import { Roles } from "../core/flow/roles.decorator";
import { UserRole } from "../core/utils/userRole.enum";
import type { AuthenticatedRequest } from "../core/AuthenticatedRequest";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List all users",
    description: "Admin-only. Returns every user in the system.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Users retrieved.",
    type: UserListResponseDto,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Number of users to return (pagination). Defaults to 50.",
  })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number for pagination (0-indexed). Defaults to 0.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Caller is not an admin.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "No users found." })
  async findAll(
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
  ) {
    const users = await this.usersService.findAll(limit, page);
    return {
      message: "Users retrieved successfully",
      data: users.map((user) => ({
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        roles: user.roles,
      })),
    };
  }

  @Get("me")
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get the authenticated user",
    description: "Returns the caller's own profile.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Current user retrieved.",
    type: CurrentUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  findMe(@Request() req: AuthenticatedRequest) {
    return {
      message: "User retrieved successfully",
      data: {
        id: req.user.id,
        username: req.user.username,
        roles: req.user.roles,
      },
    };
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete the caller's account",
    description: "Permanently removes the caller's own account.",
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "User deleted." })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  async deleteMe(@Request() req: AuthenticatedRequest) {
    await this.usersService.remove(req.user.id);
  }

  @Delete(":uuid")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a user",
    description:
      "Admin-only. Permanently removes the user identified by `uuid`.",
  })
  @ApiParam({ name: "uuid", format: "uuid", description: "Target user UUID." })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "User deleted." })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Caller is not an admin.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found." })
  async deleteUser(@Param("uuid", ParseUUIDPipe) uuid: string) {
    await this.usersService.remove(uuid);
  }

  @Patch("password")
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Change the caller's own password",
    description:
      "Requires `currentPassword`. A valid access token alone isn't enough, because the change also revokes every refresh token.",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Password updated.",
    type: UserUpdatedResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid body or weak password.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT, or `currentPassword` is incorrect.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found." })
  async updatePassword(
    @Body() changePassword: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.usersService.changePassword(req.user.id, changePassword);
    return { message: "User updated successfully" };
  }

  @Patch("password/:uuid")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Admin password reset",
    description:
      "Admin-only. Resets the password for the user identified by `uuid`.",
  })
  @ApiParam({ name: "uuid", format: "uuid", description: "Target user UUID." })
  @ApiBody({ type: UpdateUserPassword })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Password updated.",
    type: UserUpdatedResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid body or weak password.",
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Caller is not an admin.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found." })
  async adminUpdatePassword(
    @Param("uuid", ParseUUIDPipe) uuid: string,
    @Body() updateUserPassword: UpdateUserPassword,
  ) {
    try {
      await this.usersService.updatePassword(uuid, updateUserPassword);
    } catch (error) {
      if (error instanceof NotFoundException)
        throw new NotFoundException({ message: "User not found" });
      throw error;
    }
    return { message: "User updated successfully" };
  }
}
