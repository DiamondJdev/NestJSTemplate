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
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DbService } from "../db/db.service";
import { UpdateUserPassword } from "../core/dto/updatePassword.dto";
import {
  CurrentUserResponseDto,
  UserListResponseDto,
  UserUpdatedResponseDto,
} from "./dto/users.response.dto";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { RolesGuard } from "../core/flow/roles.guard";
import { Roles } from "../core/flow/roles.decorator";
import { UserRole } from "../core/utils/userRole.enum";
import { hasPermission } from "../core/utils/roleChecker";
import type { AuthenticatedRequest } from "../core/AuthenticatedRequest";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: DbService) {}

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
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Missing or invalid JWT." })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Caller is not an admin." })
  async findAll() {
    const users = await this.usersService.findAll();
    if (!users) throw new NotFoundException({ message: "No users found" });
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
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Missing or invalid JWT." })
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

  @Delete(":uuid")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a user",
    description: "Admin-only. Permanently removes the user identified by `uuid`.",
  })
  @ApiParam({ name: "uuid", format: "uuid", description: "Target user UUID." })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: "User deleted." })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Missing or invalid JWT." })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Caller is not an admin." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found." })
  async deleteUser(@Param("uuid") uuid: string) {
    await this.usersService.remove(uuid);
  }

  @Patch("password/:uuid")
  @Roles(UserRole.ADMIN, UserRole.USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update a user's password",
    description: "Users may update their own password; admins may update any user.",
  })
  @ApiParam({ name: "uuid", format: "uuid", description: "Target user UUID." })
  @ApiBody({ type: UpdateUserPassword })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Password updated.",
    type: UserUpdatedResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: "Invalid body or weak password." })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: "Missing or invalid JWT." })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: "Cannot update another user without admin role." })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found." })
  async updatePassword(
    @Param("uuid") uuid: string,
    @Body() updateUserPassword: UpdateUserPassword,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!hasPermission(req.user.roles, [UserRole.ADMIN]) && req.user.id !== uuid)
      throw new ForbiddenException({ message: "Insufficient permissions to update this user" });

    try {
      await this.usersService.updatePassword(uuid, updateUserPassword);
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException({ message: "User not found" });
      throw error;
    }
    return { message: "User updated successfully" };
  }
}
