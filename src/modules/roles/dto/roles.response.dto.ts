import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../../core/utils/userRole.enum";

export class RolesResponseDto {
  @ApiProperty({ example: "Roles retrieved successfully" })
  message!: string;

  @ApiProperty({
    isArray: true,
    enum: UserRole,
    example: [UserRole.USER],
    description: "Roles assigned to the user.",
  })
  roles!: UserRole[];
}
