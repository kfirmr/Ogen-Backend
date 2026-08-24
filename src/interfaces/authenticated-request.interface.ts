import { Request } from 'express';

export interface IAuthenticatedRequest<
  T extends object = object,
> extends Request {
  body: T;
  token?: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  aadRoles?: string[];
}
