import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    roles: string[];
    username: string;
  };
}
