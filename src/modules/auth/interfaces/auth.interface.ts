export interface ITokenPayload {
  sub: string;
  name: string;
  email: string;
}

export interface IAuthUser {
  id: string;
  email: string;
  fullName: string;
}

export interface IAuthResult {
  user: IAuthUser;
  accessToken: string;
}
