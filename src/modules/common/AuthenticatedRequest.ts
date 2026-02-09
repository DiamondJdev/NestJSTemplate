export interface AuthenticatedRequest {
	user: {
		id: string;
		role: string;
		roles: string[];
		username: string;
	};
}