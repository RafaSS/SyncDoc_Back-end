import { IDocument } from '../interfaces/document.interface';
import { DeltaChange } from '../interfaces/delta.interface';
import { v4 as uuidv4 } from 'uuid';

export class Document implements IDocument {
  public id: string;
  public title: string;
  public content: string;
  public users: Record<string, string>;
  public deltas: DeltaChange[];
  public createdAt: Date;
  public updatedAt: Date;
  public ownerId?: string;

  constructor(
    title: string = 'Untitled Document',
    content: string = '',
    ownerId?: string,
    id: string = uuidv4()
  ) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.users = {};
    this.deltas = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.ownerId = ownerId;
  }
}
