import { UserRepository, PasswordHasher, User, OrganizationRepository, MembershipRepository, ProjectRepository, EnvironmentRepository, Role } from "@relayhub/domain";

export type RegisterUserInput = {
  email: string;
  passwordRaw: string;
  name: string;
};

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly organizationRepository: OrganizationRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await this.passwordHasher.hash(input.passwordRaw);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const org = await this.organizationRepository.create({ name: `${input.name}'s Org`, slug: `org-${user.id.substring(0,8)}` });
    await this.membershipRepository.create({ userId: user.id, organizationId: org.id, role: Role.OWNER });
    const project = await this.projectRepository.create({ organizationId: org.id, name: "Default Project" });
    await this.environmentRepository.create({ projectId: project.id, name: "production" });

    return user;
  }
}
