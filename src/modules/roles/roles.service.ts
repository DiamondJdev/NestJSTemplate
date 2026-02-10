import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class RolesService {
    constructor(private readonly dbService: DbService) {}

	async getRole(userId: string): Promise<string> {
		const user = await this.dbService.findOne(userId);
		if (!user) throw new NotFoundException({ message: 'User not found' });
		return user.role;
	}

    async update(uuid: string, role: string): Promise<void> {
        await this.dbService.updateRole(uuid, role);
    } 
}