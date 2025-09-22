export type UserDTO = { id: string; email: string; name: string };
export type LoginRequestDTO = { email: string; password: string };
export type LoginResponseDTO = { token: string; user: UserDTO };