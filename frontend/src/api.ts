export type User = { id: number; name: string; email: string };
export type Game = {
  id: number;
  slug: string;
  title: string;
  description: string;
  genre: string;
  platforms: string;
  year: number;
  studio: string;
  color: string;
  cover: string;
};
export type Status = "wishlist" | "playing" | "completed" | "dropped";
export type Entry = {
  id: number;
  game_id: number;
  status: Status;
  rating: number | null;
  review: string;
  added_at: string;
  game: Game;
};
export const statuses: Record<Status, string> = {
  wishlist: "Quero jogar",
  playing: "Jogando",
  completed: "Zerado",
  dropped: "Abandonado",
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error(
      "Não foi possível conectar. Verifique se o backend está em execução.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      typeof data.detail === "string"
        ? data.detail
        : "Não foi possível concluir a operação.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
