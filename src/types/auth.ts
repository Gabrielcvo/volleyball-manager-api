import { Request } from "express";

export interface AuthenticatedUser {
  id: number;
  nome: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
