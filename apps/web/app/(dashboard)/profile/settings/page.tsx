"use client";

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
import { useAuth } from "@/contexts/auth-context";
import { profileSchema, type ProfileFormData } from "@/lib/validation";

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  async function onSubmit(data: ProfileFormData) {
    // eslint-disable-next-line no-console
    console.log("Profile update:", data);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Display name"
            defaultValue={user?.email}
            error={errors.displayName?.message}
            {...register("displayName")}
          />
          <Input label="Bio" error={errors.bio?.message} {...register("bio")} />
          <Button type="submit" isLoading={isSubmitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}