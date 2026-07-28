import { UserRepository, PasswordHasher, TokenService, SessionRepository } from "@relayhub/domain";
import crypto from "crypto";

export type LoginUserInput = {
  email: string;
  passwordRaw: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LoginUserInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await this.passwordHasher.verify(user.passwordHash, input.passwordRaw);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const accessToken = await this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    // Hash refresh token before saving
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    
    // Set expiry to 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
}
