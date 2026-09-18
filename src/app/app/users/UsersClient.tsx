"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, EmptyState, Field, Input, Select, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  roles: string;
  branches: string;
  lastLoginAt: string | null;
};

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roleCode: string;
  branchIds: string[];
  maxDiscountPercent?: number;
};

export function UsersClient({
  initial,
  branches,
  roles,
  canCreate,
  labels,
}: {
  initial: Row[];
  branches: { id: string; name: string }[];
  roles: { code: string; name: string }[];
  canCreate: boolean;
  labels: { title: string; empty: string };
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { roleCode: roles[0]?.code ?? "CASHIER", branchIds: [] },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        branchIds: Array.isArray(values.branchIds) ? values.branchIds : [values.branchIds].filter(Boolean),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Kullanici olusturulamadi.");
      return;
    }
    reset();
    setShowForm(false);
    router.refresh();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{labels.title}</h1>
        {canCreate ? <Button onClick={() => setShowForm((s) => !s)}>Yeni kullanici</Button> : null}
      </div>

      {showForm ? (
        <Card>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
            <Field label="Ad soyad"><Input {...register("fullName", { required: true })} /></Field>
            <Field label="E-posta"><Input type="email" {...register("email", { required: true })} /></Field>
            <Field label="Telefon"><Input {...register("phone")} /></Field>
            <Field label="Sifre"><Input type="password" {...register("password", { required: true })} /></Field>
            <Field label="Rol">
              <Select {...register("roleCode")}>
                {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Maks. indirim (%)">
              <Input type="number" min={0} max={100} step="0.01" {...register("maxDiscountPercent", { valueAsNumber: true })} />
            </Field>
            <Field label="Subeler (bos = tum subeler)">
              <select multiple className="min-h-24 w-full rounded-lg border border-slate-300 p-2 text-sm" {...register("branchIds")}>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>

            {error ? (
              <p className="md:col-span-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex gap-2 md:col-span-3">
              <Button type="submit" disabled={isSubmitting}>Kaydet</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Iptal</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="p-0">
        {initial.length === 0 ? (
          <EmptyState message={labels.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Ad soyad</th>
                  <th className="px-5 py-3 font-medium">E-posta</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="px-5 py-3 font-medium">Sube</th>
                  <th className="px-5 py-3 font-medium">Durum</th>
                  <th className="px-5 py-3 font-medium">Son giris</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initial.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">{u.fullName}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3 text-slate-600">{u.roles || "-"}</td>
                    <td className="px-5 py-3 text-slate-600">{u.branches || "Tum subeler"}</td>
                    <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(u.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
