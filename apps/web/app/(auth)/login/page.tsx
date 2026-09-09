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
import { loginSchema, type LoginFormData } from "@/lib/validation";
import { ApiError } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          (err.body as { message?: string })?.message ||
            "Invalid email or password",
        );
      } else {
        setServerError("An unexpected error occurred");
      }
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display">Sign in</CardTitle>
        <CardDescription>Welcome back to Innogram</CardDescription>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-[var(--ts-danger-text)]">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4" />}
          Sign in
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
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </Card>
  );
}
