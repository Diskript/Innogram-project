let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API Error: ${status}`);
    this.name = "ApiError";
  }
}

export class ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.filePath(path);
    if (params) {
      const parsed = new URL(url);
      for (const [key, value] of Object.entries(params)) {
        parsed.searchParams.set(key, value);
      }
      return this.fetchJson<T>(parsed.toString(), "GET", {}, undefined);
    }
    return this.fetchJson<T>(url, "GET", {}, undefined);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return this.fetchJson<T>(this.filePath(path), "POST", {}, payload);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    return this.fetchJson<T>(this.filePath(path), "PATCH", {}, payload);
  }

  async delete<T>(path: string): Promise<T> {
    return this.fetchJson<T>(this.filePath(path), "DELETE", {}, undefined);
  }

  async getBlob(path: string): Promise<Blob> {
    return this.requestBlob(this.filePath(path));
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return this.fetchJson<T>(this.filePath(path), "POST", headers, formData);
  }

  private filePath(path: string): string {
    return new URL(path, this.baseUrl).toString();
  }

  private async fetchJson<T>(
    path: string,
    method: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
  ): Promise<T> {
    const headersWithAuth: Record<string, string> = { ...headers };
    if (!headersWithAuth["Content-Type"] && !(body instanceof FormData)) {
      headersWithAuth["Content-Type"] = "application/json";
    }
    if (accessToken && !headersWithAuth["Authorization"]) {
      headersWithAuth["Authorization"] = `Bearer ${accessToken}`;
    }

    let sent = await this.send(method, path, headersWithAuth, body);

    if (sent.status === 401) {
      const refreshed = await this.attemptRefresh();
      if (refreshed) {
        headersWithAuth["Authorization"] = `Bearer ${accessToken}`;
        sent = await this.send(method, path, headersWithAuth, body);
        if (!sent.ok && sent.status !== 204) {
          throw new ApiError(sent.status, await sent.json().catch(() => null));
        }
        if (sent.status === 204) return undefined as T;
        return sent.json();
      }
      throw new ApiError(401, null);
    }

    if (!sent.ok && sent.status !== 204) {
      throw new ApiError(sent.status, await sent.json().catch(() => null));
    }
    if (sent.status === 204) return undefined as T;
    return sent.json();
  }

  private send(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
  ): Promise<Response> {
    return fetch(url, { method, headers, body });
  }

  private async requestBlob(url: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    let sent = await fetch(url, { headers });

    if (sent.status === 401) {
      const refreshed = await this.attemptRefresh();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        sent = await fetch(url, { headers });
        if (!sent.ok) throw new ApiError(sent.status, null);
        return sent.blob();
      }
      throw new ApiError(401, null);
    }

    if (!sent.ok) throw new ApiError(sent.status, null);
    return sent.blob();
  }

  private async attemptRefresh(): Promise<boolean> {
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (!refreshTokenValue) return false;

    try {
      const authUrl =
        process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3002";
      const res = await fetch(`${authUrl}/jwt-auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });
      if (!res.ok) {
        localStorage.removeItem("refreshToken");
        setAccessToken(null);
        return false;
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }
}

export const authApi = new ApiClient(
  process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3002",
);

export const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
);

export interface ProfileCounts {
  createdPosts: number;
  followers: number;
  following: number;
  comments: number;
}

export interface OwnProfile {
  id: string;
  userName: string;
  displayName: string;
  birthday: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  deleted: boolean;
  _count: ProfileCounts;
}

export interface PublicProfile {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isPublic: boolean;
  birthday: string | null;
}

export interface UpdateProfileDto {
  displayName?: string;
  birthday?: string;
  bio?: string;
  avatarUrl?: string;
  isPublic?: boolean;
}

export function getOwnProfile(): Promise<OwnProfile> {
  return api.get<OwnProfile>("/profile");
}

export function updateProfile(dto: UpdateProfileDto): Promise<PublicProfile> {
  return api.patch<PublicProfile>("/profile", dto);
}

export function getPublicProfile(username: string): Promise<PublicProfile> {
  return api.get<PublicProfile>(`/profile/${encodeURIComponent(username)}`);
}
