import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { RolesResponseDto } from "./dto/roles.response.dto";
import { RolesGuard } from "../core/flow/roles.guard";
import { Roles } from "../core/flow/roles.decorator";
import { UserRole } from "../core/utils/userRole.enum";
import type { AuthenticatedRequest } from "../core/AuthenticatedRequest";

@ApiTags("Roles")
@ApiBearerAuth("access-token")
@Controller("roles")
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.USER)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("me")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get the current user's roles",
    description: "Returns the roles assigned to the authenticated caller.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Roles retrieved successfully.",
    type: RolesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  async getUserRole(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string; roles: UserRole[] }> {
    const roles = await this.rolesService.getRoles(req.user.id);
    return { message: "Roles retrieved successfully", roles };
  }

  @Get(":uuid")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get the roles of a specific user",
    description:
      "Returns the roles for the user identified by `uuid`. Non-admin callers may only view their own roles.",
  })
  @ApiParam({ name: "uuid", description: "Target user UUID.", format: "uuid" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Roles retrieved successfully.",
    type: RolesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: "Missing or invalid JWT.",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Caller cannot view another user's roles.",
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: "User not found." })
  async getRole(
    @Param("uuid") uuid: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string; roles: UserRole[] }> {
    if (req.user.id !== uuid && !req.user.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException(
        "You do not have permission to view this user's roles",
      );
    }
    const roles = await this.rolesService.getRoles(uuid);
    return { message: "Roles retrieved successfully", roles };
  }
}
