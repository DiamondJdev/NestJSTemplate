import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { User } from '../common/entities/user.entity';

@Injectable()
export class RolesService {
    constructor(private readonly dbService: DbService) {}

	async getRole(userId: string): Promise<string> {
		let user: User | null;
		if (!(user = await this.dbService.findOne(userId, undefined))) {
			throw new UnauthorizedException();
		}
		return user.role;
	}

    async update(uuid: string, role: string): Promise<void> {
        await this.dbService.updateRole(uuid, role);
    }    
}