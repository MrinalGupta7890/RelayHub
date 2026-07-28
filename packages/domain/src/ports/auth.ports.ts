export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface TokenService {
  generateAccessToken(userId: string): Promise<string>;
  generateRefreshToken(): string;
}
