"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button, Field, Input } from "@/components/ui";

type FormValues = { identifier: string; password: string; remember: boolean };

export function LoginForm({
  labels,
}: {
  labels: { email: string; password: string; remember: string; forgot: string; submit: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ defaultValues: { identifier: "", password: "", remember: false } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Giris yapilamadi.");
        return;
      }
      router.push(json.data.redirect);
      router.refresh();
    } catch {
      setError("Sunucuya ulasilamadi. Lutfen tekrar deneyin.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label={labels.email} error={errors.identifier ? "Zorunlu alan" : undefined}>
        <Input autoFocus autoComplete="username" {...register("identifier", { required: true })} />
      </Field>
      <Field label={labels.password} error={errors.password ? "Zorunlu alan" : undefined}>
        <Input type="password" autoComplete="current-password" {...register("password", { required: true })} />
      </Field>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register("remember")} />
          {labels.remember}
        </label>
        <a href="/forgot-password" className="text-brand-600 hover:underline">{labels.forgot}</a>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "..." : labels.submit}
      </Button>
    </form>
  );
}
