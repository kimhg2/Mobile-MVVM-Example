export class Password {
  private constructor(public readonly value: string) {}
  static create(raw: string): Password {
    if (raw.length < 8) throw new Error('Weak password');
    return new Password(raw);
  }
}