export class AuthError extends Error {
  constructor(public readonly kind: 'InvalidCredentials' | 'Network' | 'Unknown', message?: string) {
    super(message ?? kind);
  }
  static invalid() { return new AuthError('InvalidCredentials'); }
  static network() { return new AuthError('Network'); }
  static unknown(msg?: string) { return new AuthError('Unknown', msg); }
}