"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui-kit/card";
import { Spinner } from "@/components/ui-kit/spinner";
import { setAccessToken } from "@/lib/api-client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner className="size-8" />}>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const success = searchParams.get("success");
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3002";

    async function handleCallback() {
      if (success !== "true") {
        setStatus("error");
        return;
      }

      try {
        const res = await fetch(`${authUrl}/jwt-auth/session`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("No session");
        const data = await res.json();
        setAccessToken(data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        document.cookie = "innogram_session=true; path=/; max-age=604800";
        setStatus("success");
        setTimeout(() => router.push("/"), 1000);
      } catch {
        // Session extraction may fail in local dev (cross-origin cookie
        // from auth service on port 3002). User can still use login form.
        setStatus("error");
        setTimeout(() => router.push("/login"), 3000);
      }
    }

    void handleCallback();
  }, [searchParams, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display">
          {status === "loading" && "Completing authentication..."}
          {status === "success" && "Signed in successfully!"}
          {status === "error" && "Authentication failed"}
        </CardTitle>
        <CardDescription>
          {status === "loading" && "Please wait..."}
          {status === "success" && "Redirecting to your feed..."}
          {status === "error" && "Please try signing in again."}
        </CardDescription>
      </CardHeader>
      <div className="flex justify-center py-4">
        {status === "loading" && <Spinner className="size-8" />}
      </div>
    </Card>
  );
}
