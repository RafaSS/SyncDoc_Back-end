/**
 * Represents a user in the SyncDoc application
 */
export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string; // Hash later
  createdAt: Date;
  updatedAt: Date;
}

//will be on the repository later na the database afterwards
export type UsersCollection = Record<string, IUser>;

//used
export interface IUserCredentials {
  email: string;
  password: string;
}

/**
 * User authentication response
 */
export interface IAuthResponse {
  user: Omit<IUser, 'password'>;
  token: string;
}

/**
 * User registration data
 */
export interface IUserRegistration {
  username: string;
  email: string;
  password: string;
}
