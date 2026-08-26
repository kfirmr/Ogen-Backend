import { Request } from 'express';

export interface IAuthenticatedRequest<
  T extends object = object,
> extends Request {
  body: T;
  token?: string;
  aadRoles?: string[];
  user: {
    id: string;
    email: string;
    name: string;
  };
}
