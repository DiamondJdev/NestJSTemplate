import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from "@nestjs/common";
import { RolesService, UserRole } from "./roles.service";
import { JwtAuthGuard } from "../auth/guard/jwt-auth.guard";
import { RolesGuard } from "./flow/roles.guard";
import { Roles } from "./flow/roles.decorator";

@Controller("roles")
@UseGuards(JwtAuthGuard) // Require authentication for all role endpoints
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get(":uuid")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN) // Only admins can view roles
  @HttpCode(HttpStatus.OK)
  async getRole(@Param("uuid") uuid: string) {
    const role = await this.rolesService.getRole(uuid);
    if (!role) {
      return { 
        message: "User not found", 
        status: HttpStatus.NOT_FOUND, 
        data: undefined 
      };
    }
    return {
      message: "Role retrieved successfully",
      data: role,
    };
  }
  
  // Deprecated endpoint for updating user roles,
  // Will be re-enabled after refactoring for admin role escalation 
  //
  // @Patch(":uuid")
  // @UseGuards(RolesGuard)
  // @Roles(UserRole.ADMIN) // Only admins can update roles
  // @HttpCode(HttpStatus.OK)
  // async updateUser(
  //     @Param("uuid") uuid: string,
  //     @Body("role") role: string,
  // ) {
  //     // Validate role before updating
  //     if (!this.rolesService.isValidRole(role)) {
  //         return { 
  //             message: "Invalid role. Valid roles are: " + Object.values(UserRole).join(", "), 
  //             status: HttpStatus.BAD_REQUEST
  //         };
  //     }

  //     const updatedUser = await this.rolesService.update(uuid, role);
  //     if (!updatedUser) return { message: "User not found", status: HttpStatus.NOT_FOUND };
  //     return {
  //         message: "User role updated successfully",
  //         data: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role },
  //     };
  // }
}
