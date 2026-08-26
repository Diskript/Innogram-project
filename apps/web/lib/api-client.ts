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
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return this.request<T>("GET", url.toString());
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", `${this.baseUrl}${path}`, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", `${this.baseUrl}${path}`, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", `${this.baseUrl}${path}`);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      const refreshed = await this.attemptRefresh();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        const retryRes = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          throw new ApiError(
            retryRes.status,
            await retryRes.json().catch(() => null),
          );
        }
        if (retryRes.status === 204) return undefined as T;
        return retryRes.json();
      }
      throw new ApiError(401, null);
    }

    if (!res.ok) {
      throw new ApiError(res.status, await res.json().catch(() => null));
    }

    if (res.status === 204) return undefined as T;
    return res.json();
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
