"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui-kit/card";
import { Button } from "@/components/ui-kit/button";
import { Input } from "@/components/ui-kit/input";
import { Label } from "@/components/ui-kit/label";
import { Switch } from "@/components/ui-kit/switch";
import { Spinner } from "@/components/ui-kit/spinner";
import { profileSchema, type ProfileFormData } from "@/lib/validation";
import { ApiError, getOwnProfile, updateProfile } from "@/lib/api-client";

export default function ProfileSettingsPage() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      avatarUrl: "",
      isPublic: true,
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await getOwnProfile();
        if (cancelled) return;
        setIsPublic(profile.isPublic);
        reset({
          displayName: profile.displayName || "",
          bio: profile.bio || "",
          avatarUrl: profile.avatarUrl || "",
          isPublic: profile.isPublic,
        });
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? ((err.body as { message?: string })?.message ??
                "Failed to load profile")
            : "Failed to load profile",
        );
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  async function onSubmit(data: ProfileFormData) {
    setSaveStatus(null);
    const dto = {
      displayName: data.displayName,
      bio: data.bio || undefined,
      avatarUrl: data.avatarUrl || undefined,
      isPublic,
    };
    try {
      await updateProfile(dto);
      setSaveStatus({ type: "success", message: "Profile saved" });
    } catch (err) {
      setSaveStatus({
        type: "error",
        message:
          err instanceof ApiError
            ? ((err.body as { message?: string })?.message ??
              "Failed to save profile")
            : "Failed to save profile",
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Profile settings</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>

        {loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-[var(--ts-danger-text)]">
            {loadError}
          </div>
        )}

        {saveStatus && (
          <div
            className={
              saveStatus.type === "success"
                ? "rounded-lg border border-[var(--ts-green)]/30 bg-[var(--ts-green)]/10 p-3 text-sm text-[var(--ts-green)]"
                : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-[var(--ts-danger-text)]"
            }
          >
            {saveStatus.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              aria-invalid={!!errors.displayName}
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-xs text-[var(--ts-danger-text)]">
                {errors.displayName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              placeholder="Tell people about yourself"
              aria-invalid={!!errors.bio}
              {...register("bio")}
            />
            {errors.bio && (
              <p className="text-xs text-[var(--ts-danger-text)]">
                {errors.bio.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              placeholder="https://example.com/avatar.jpg"
              aria-invalid={!!errors.avatarUrl}
              {...register("avatarUrl")}
            />
            {errors.avatarUrl && (
              <p className="text-xs text-[var(--ts-danger-text)]">
                {errors.avatarUrl.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Private account
              </p>
              <p className="text-sm text-muted-foreground">
                Only you can see your profile
              </p>
            </div>
            <Switch
              id="is-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="size-4" />}
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
