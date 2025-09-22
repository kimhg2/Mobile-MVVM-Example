import { Email } from '../value-objects/Email.vo';
export class User {
  constructor(public readonly id: string, public readonly email: Email, public readonly name: { value: string }, ) {}
}