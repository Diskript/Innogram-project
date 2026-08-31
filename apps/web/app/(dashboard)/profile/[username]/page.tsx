"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui-kit/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui-kit/avatar";
import { Spinner } from "@/components/ui-kit/spinner";
import { initials } from "@/lib/utils";
import {
  ApiError,
  getPublicProfile,
  type PublicProfile,
} from "@/lib/api-client";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!username) {
        setStatus("error");
        setErrorMessage("Missing username");
        return;
      }
      try {
        const result = await getPublicProfile(username);
        if (cancelled) return;
        setProfile(result);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof ApiError && err.status === 404
            ? `User "@${username}" not found`
            : "Failed to load this profile",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile.avatarUrl && (
                <AvatarImage
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                />
              )}
              <AvatarFallback className="text-lg">
                {initials(profile.displayName || profile.userName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-display">
                {profile.displayName || profile.userName}
              </CardTitle>
              <CardDescription>@{profile.userName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {profile.bio && (
          <p className="text-sm text-[var(--ts-text-secondary)]">
            {profile.bio}
          </p>
        )}
        {!profile.isPublic && (
          <p className="mt-1 text-xs text-muted-foreground">Private account</p>
        )}
      </Card>
    </div>
  );
}
