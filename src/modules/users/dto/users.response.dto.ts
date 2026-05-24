import { ApiProperty } from "@nestjs/swagger";

class UserItemDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "johndoe" })
  username!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ isArray: true, type: String, example: ["user"] })
  roles!: string[];
}

class CurrentUserItemDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "johndoe" })
  username!: string;

  @ApiProperty({ isArray: true, type: String, example: ["user"] })
  roles!: string[];
}

export class UserListResponseDto {
  @ApiProperty({ example: "Users retrieved successfully" })
  message!: string;

  @ApiProperty({ type: [UserItemDto] })
  data!: UserItemDto[];
}

export class CurrentUserResponseDto {
  @ApiProperty({ example: "User retrieved successfully" })
  message!: string;

  @ApiProperty({ type: CurrentUserItemDto })
  data!: CurrentUserItemDto;
}

export class UserUpdatedResponseDto {
  @ApiProperty({ example: "User updated successfully" })
  message!: string;
}
