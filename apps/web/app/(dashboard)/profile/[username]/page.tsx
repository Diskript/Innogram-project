"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
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
        <Spinner size="lg" />
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
            <Avatar
              src={profile.avatarUrl}
              alt={profile.displayName}
              size="lg"
            />
            <div>
              <CardTitle>{profile.displayName || profile.userName}</CardTitle>
              <CardDescription>@{profile.userName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {profile.bio && (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {profile.bio}
          </p>
        )}
        {!profile.isPublic && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Private account
          </p>
        )}
      </Card>
    </div>
  );
}
