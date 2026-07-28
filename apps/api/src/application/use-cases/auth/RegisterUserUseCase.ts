import { UserRepository, PasswordHasher, User } from "@relayhub/domain";

export type RegisterUserInput = {
  email: string;
  passwordRaw: string;
  name: string;
};

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await this.passwordHasher.hash(input.passwordRaw);
    return this.userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });
  }
}
