import { Request } from "express";
import { UserRole } from "../core/utils/userRole.enum";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    roles: UserRole[];
    username: string;
  };
}
