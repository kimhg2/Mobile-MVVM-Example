import { Result } from "@/shared/result";
import { User } from "../entities/User.entity";
import { AuthError } from "../errors/AuthError";
import { AuthRepository, AuthRequestOptions, AuthType } from "../ports/Auth.repository";

export class LoginWithPassword {
  constructor(private readonly repo: AuthRepository) {}

  async execute(input: AuthType, options?: AuthRequestOptions): Promise<Result<User, AuthError>> {
    return this.repo.login(input, options);
  }
}
