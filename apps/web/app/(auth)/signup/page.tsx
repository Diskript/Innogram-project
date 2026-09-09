"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Spinner } from "@/components/ui-kit/spinner";
import { useAuth } from "@/contexts/auth-context";
import { signupSchema, type SignupFormData } from "@/lib/validation";
import { ApiError } from "@/lib/api-client";

export default function SignupPage() {
  const router = useRouter();
  const { register: registerUser, login: loginUser, googleLogin } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormData) {
    setServerError(null);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        username: data.username,
        displayName: data.displayName,
        birthday: data.birthday,
        bio: data.bio,
      });
      // Auto-login after successful registration
      await loginUser(data.email, data.password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          (err.body as { message?: string })?.message || "Registration failed",
        );
      } else {
        setServerError("An unexpected error occurred");
      }
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display">Create an account</CardTitle>
        <CardDescription>Join Innogram today</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-[var(--ts-danger-text)]">
            {serverError}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-[var(--ts-danger-text)]">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="your_username"
            aria-invalid={!!errors.username}
            {...register("username")}
          />
          {errors.username && (
            <p className="text-xs text-[var(--ts-danger-text)]">
              {errors.username.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            placeholder="Your Name"
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
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            type="date"
            aria-invalid={!!errors.birthday}
            {...register("birthday")}
          />
          {errors.birthday && (
            <p className="text-xs text-[var(--ts-danger-text)]">
              {errors.birthday.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bio">Bio (optional)</Label>
          <Input
            id="bio"
            placeholder="Tell us about yourself"
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-[var(--ts-danger-text)]">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-[var(--ts-danger-text)]">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4" />}
          Create account
        </Button>
      </form>
      <div className="mt-4">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--ts-border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={googleLogin}
        >
          Google
        </Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
