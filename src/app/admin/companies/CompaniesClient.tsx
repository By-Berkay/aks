"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, EmptyState, Field, Input, Select, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  shortName: string;
  status: string;
  planCode: string;
  userCount: number;
  branchCount: number;
  createdAt: string;
};

type FormValues = {
  name: string;
  shortName: string;
  taxNumber: string;
  phone: string;
  email: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
  trialDays: number;
  primaryColor: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
};

export function CompaniesClient({
  initial,
  labels,
}: {
  initial: Row[];
  labels: { title: string; newCompany: string; empty: string };
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { status: "TRIAL", trialDays: 14, primaryColor: "#2563eb" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Firma olusturulamadi.");
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
        <Button onClick={() => setShowForm((s) => !s)}>{labels.newCompany}</Button>
      </div>

      {showForm ? (
        <Card>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
            <Field label="Firma adi"><Input {...register("name", { required: true })} /></Field>
            <Field label="Kisa ad"><Input {...register("shortName", { required: true })} /></Field>
            <Field label="Vergi numarasi"><Input {...register("taxNumber")} /></Field>
            <Field label="Telefon"><Input {...register("phone")} /></Field>
            <Field label="E-posta"><Input type="email" {...register("email")} /></Field>
            <Field label="Durum">
              <Select {...register("status")}>
                <option value="TRIAL">TRIAL</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </Select>
            </Field>
            <Field label="Deneme suresi (gun)">
              <Input type="number" min={0} max={365} {...register("trialDays", { valueAsNumber: true })} />
            </Field>
            <Field label="Ana renk"><Input type="color" className="h-10 p-1" {...register("primaryColor")} /></Field>
            <div className="md:col-span-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Firma yoneticisi (opsiyonel)
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Ad soyad"><Input {...register("adminFullName")} /></Field>
                <Field label="E-posta"><Input type="email" {...register("adminEmail")} /></Field>
                <Field label="Sifre"><Input type="password" {...register("adminPassword")} /></Field>
              </div>
            </div>

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
                  <th className="px-5 py-3 font-medium">Firma</th>
                  <th className="px-5 py-3 font-medium">Paket</th>
                  <th className="px-5 py-3 font-medium">Kullanici</th>
                  <th className="px-5 py-3 font-medium">Sube</th>
                  <th className="px-5 py-3 font-medium">Durum</th>
                  <th className="px-5 py-3 font-medium">Olusturma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initial.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/companies/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <span className="block text-xs text-slate-400">{c.shortName}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{c.planCode}</td>
                    <td className="px-5 py-3 text-slate-600">{c.userCount}</td>
                    <td className="px-5 py-3 text-slate-600">{c.branchCount}</td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(c.createdAt)}</td>
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
