"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("admin@mediflow.local");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(searchParams.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Image
        src="/brand/login-hero.jpg"
        alt="Hospital operations atmosphere"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#0b1628]/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1628]/80 via-[#0b1628]/40 to-[#0b1628]/65" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_42%)]" />

      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <BrandLogo inverted />
      </div>
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle className="border border-white/15 bg-black/25 text-white hover:bg-black/40 hover:text-white" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-10 px-4 py-20 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-10">
        <div className="max-w-xl text-white">
          <motion.h1
            className="font-display text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Clinical ops, flowing with clarity.
          </motion.h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
            Patients, queue, EMR, and billing in one modern hospital CRM —
            built for speed on every device.
          </p>
          <p className="mt-8 text-xs text-white/45">
            MediFlow Phase 1 · Single hospital
          </p>
        </div>

        <motion.div
          className="w-full max-w-md shrink-0 rounded-3xl border border-white/15 bg-[color-mix(in_oklab,var(--surface)_92%,transparent)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl sm:p-8"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="mb-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sign in to the hospital operations platform
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-xs text-[var(--muted)]">
            Demo: admin@mediflow.local / Admin@12345
          </p>
        </motion.div>
      </div>
    </div>
  );
}
