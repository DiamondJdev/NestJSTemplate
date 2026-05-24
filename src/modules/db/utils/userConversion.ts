import { User } from "src/modules/core/entities/user.entity";
import { userReturnDto } from "../dto/userReturn.dto";

export function toUserReturnDto(user: User): userReturnDto {
  return {
    id: user.id as string,
    username: user.username,
    createdAt: user.createdAt as Date,
    roles: user.roles,
  };
}
