import { IUser } from '../interfaces/user.interface';
import { v4 as uuidv4 } from 'uuid';

export class User implements IUser {
  public id: string;
  public username: string;
  public email: string;
  public password: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(
    username: string,
    email: string,
    password: string,
    id: string = uuidv4()
  ) {
    this.id = id;
    this.username = username;
    this.email = email;
    this.password = password; // In a real app, this would be hashed
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
