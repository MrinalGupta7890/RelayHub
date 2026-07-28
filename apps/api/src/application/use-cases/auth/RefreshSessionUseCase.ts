import { SessionRepository, TokenService } from "@relayhub/domain";
import crypto from "crypto";

export type RefreshSessionInput = {
  refreshToken: string;
};

export type RefreshSessionResult = {
  accessToken: string;
  refreshToken: string;
};

export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: RefreshSessionInput): Promise<RefreshSessionResult> {
    const refreshTokenHash = crypto.createHash("sha256").update(input.refreshToken).digest("hex");

    const session = await this.sessionRepository.findByTokenHash(refreshTokenHash);
    
    if (!session) {
      throw new Error("Invalid or expired session");
    }

    if (new Date() > session.expiresAt) {
      await this.sessionRepository.delete(session.id);
      throw new Error("Session expired");
    }

    // Issue new tokens
    const accessToken = await this.tokenService.generateAccessToken(session.userId);
    const newRefreshToken = this.tokenService.generateRefreshToken();
    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Delete old session and create new one (token rotation)
    await this.sessionRepository.delete(session.id);
    await this.sessionRepository.create({
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }
}
