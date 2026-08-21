"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
          <CardTitle>Profile settings</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>

        {loadError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {loadError}
          </div>
        )}

        {saveStatus && (
          <div
            className={
              saveStatus.type === "success"
                ? "rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
            }
          >
            {saveStatus.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Display name"
            {...register("displayName")}
            error={errors.displayName?.message}
          />
          <Input
            label="Bio"
            {...register("bio")}
            error={errors.bio?.message}
            placeholder="Tell people about yourself"
          />
          <Input
            label="Avatar URL"
            {...register("avatarUrl")}
            error={errors.avatarUrl?.message}
            placeholder="https://example.com/avatar.jpg"
          />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Private account
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Only you can see your profile
              </p>
            </div>
            <Switch
              id="is-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <Button type="submit" isLoading={isSubmitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
