export class Email {
  private constructor(public readonly value: string) {}
  static create(raw: string): Email {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
    if (!ok) throw new Error('Invalid email');
    return new Email(raw.toLowerCase());
  }
}