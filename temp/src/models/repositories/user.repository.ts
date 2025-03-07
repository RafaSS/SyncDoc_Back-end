import { IUser, UsersCollection } from '../../interfaces/user.interface';
import { IRepository } from '../../interfaces/repository.interface';
import { User } from '../user.model';

export class UserRepository implements IRepository<IUser> {
  private users: UsersCollection = {};

  constructor(initialUsers: UsersCollection = {}) {
    // Initialize with any existing users or seed data
    this.users = initialUsers;
  }

  public async findAll(): Promise<IUser[]> {
    return Object.values(this.users);
  }

  public async findById(id: string): Promise<IUser | null> {
    return this.users[id] || null;
  }

  public async findByEmail(email: string): Promise<IUser | null> {
    const user = Object.values(this.users).find(user => user.email === email);
    return user || null;
  }

  public async create(data: Omit<IUser, 'id'>): Promise<IUser> {
    const newUser = new User(
      data.username,
      data.email,
      data.password
    );
    
    this.users[newUser.id] = newUser;
    return newUser;
  }

  public async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    if (!this.users[id]) {
      return null;
    }

    this.users[id] = {
      ...this.users[id],
      ...data,
      updatedAt: new Date()
    };

    return this.users[id];
  }

  public async delete(id: string): Promise<boolean> {
    if (!this.users[id]) {
      return false;
    }

    delete this.users[id];
    return true;
  }
}
