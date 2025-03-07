import { IAuthResponse, IUser, IUserCredentials, IUserRegistration } from './user.interface';

export interface IUserService {
  register(userData: IUserRegistration): Promise<IAuthResponse>;
  login(credentials: IUserCredentials): Promise<IAuthResponse>;
  getUserById(id: string): Promise<Omit<IUser, 'password'> | null>;
  updateUser(id: string, userData: Partial<Omit<IUser, 'id' | 'password'>>): Promise<Omit<IUser, 'password'> | null>;
  deleteUser(id: string): Promise<boolean>;
  validateToken(token: string): Promise<Omit<IUser, 'password'> | null>;
}
