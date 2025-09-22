import { User } from "@domain/auth/entities/User.entity";
import { Email } from "@domain/auth/value-objects/Email.vo";

type RawUser = {
  id?: string;
  userId?: string;
  user_id?: string;
  email?: string;
  user?: RawUser;
  name?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
};

function resolveUser(payload: RawUser | null | undefined): RawUser {
  if (!payload) throw new Error("User payload is empty");
  if (payload.user) return resolveUser(payload.user);
  return payload;
}

function resolveId(raw: RawUser): string {
  const id = raw.id ?? raw.userId ?? raw.user_id;
  if (!id) throw new Error("User id is missing");
  return String(id);
}

function resolveEmail(raw: RawUser): string {
  const email = raw.email;
  if (!email) throw new Error("User email is missing");
  return String(email);
}

function resolveName(raw: RawUser): string {
  if (raw.name) return String(raw.name);
  const first = raw.firstName ?? raw.first_name;
  const last = raw.lastName ?? raw.last_name;
  const composed = [first, last].filter(Boolean).join(" ").trim();
  return composed;
}

export function mapUser(payload: RawUser): User {
  const raw = resolveUser(payload);
  const email = Email.create(resolveEmail(raw));
  const id = resolveId(raw);
  const name = resolveName(raw);
  return new User(id, email, { value: name });
}
