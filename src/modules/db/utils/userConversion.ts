import { User } from "src/modules/common/entities/user.entity";
import { userReturnDto } from "../dto/userReturn.dto";

/**
 * Helper function to conver a User entity into a userReturnDto type,
 * Which is safe to return in API responses, as it excludes sensitive information
 * 
 * @param user The User entity to convert
 * @returns userReturnDto
 */
export function toUserReturnDto(user: User): userReturnDto {
	return {
		id: user.id as string,
		username: user.username,
		createdAt: user.createdAt as Date,
		role: user.role,
	};
}