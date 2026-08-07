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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to Innogram</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {serverError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {serverError}
          </div>
        )}
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <div className="mt-4">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-300 dark:border-neutral-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
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
      <p className="mt-6 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-neutral-900 hover:underline dark:text-white"
        >
          Sign up
        </Link>
      </p>
    </Card>
  );
}