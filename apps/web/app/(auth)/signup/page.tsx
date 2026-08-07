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
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Join Innogram today</CardDescription>
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
          label="Username"
          placeholder="your_username"
          error={errors.username?.message}
          {...register("username")}
        />
        <Input
          label="Display name"
          placeholder="Your Name"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
        <Input
          label="Birthday"
          type="date"
          error={errors.birthday?.message}
          {...register("birthday")}
        />
        <Input
          label="Bio (optional)"
          placeholder="Tell us about yourself"
          error={errors.bio?.message}
          {...register("bio")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" isLoading={isSubmitting}>
          Create account
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
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-neutral-900 hover:underline dark:text-white"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}