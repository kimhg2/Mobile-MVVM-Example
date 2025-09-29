type AuthErrorKind = 'InvalidCredentials' | 'AlreadyExists' | 'Network' | 'Unknown';

export class AuthError extends Error {
  constructor(public readonly kind: AuthErrorKind, message?: string) {
    super(message ?? kind);
  }
  static invalid() { return new AuthError('InvalidCredentials'); }
  static alreadyExists(message?: string) { return new AuthError('AlreadyExists', message); }
  static network() { return new AuthError('Network'); }
  static unknown(msg?: string) { return new AuthError('Unknown', msg); }
}
