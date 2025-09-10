import { AuthRepository } from "../ports/Auth.repository";

export class LoginWithPassword {
  constructor(private readonly repo: AuthRepository) {}

  async execute(email: string, password: string) {
    if (!email || !password) throw new Error("Invalid credentials");
    return this.repo.login({email, password})
  }
}
