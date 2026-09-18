"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, EmptyState, Field, Input, StatusBadge } from "@/components/ui";

type Row = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  manager: string | null;
  status: string;
  warehouses: number;
  registers: number;
  users: number;
};

type FormValues = { code: string; name: string; phone: string; manager: string; address: string };

export function BranchesClient({
  initial,
  canManage,
  labels,
}: {
  initial: Row[];
  canManage: boolean;
  labels: { title: string; empty: string };
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Sube olusturulamadi.");
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
        {canManage ? <Button onClick={() => setShowForm((s) => !s)}>Yeni sube</Button> : null}
      </div>

      {showForm ? (
        <Card>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
            <Field label="Sube kodu"><Input placeholder="IST-01" {...register("code", { required: true })} /></Field>
            <Field label="Sube adi"><Input {...register("name", { required: true })} /></Field>
            <Field label="Telefon"><Input {...register("phone")} /></Field>
            <Field label="Yetkili"><Input {...register("manager")} /></Field>
            <Field label="Adres"><Input {...register("address")} /></Field>
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
                  <th className="px-5 py-3 font-medium">Kod</th>
                  <th className="px-5 py-3 font-medium">Sube</th>
                  <th className="px-5 py-3 font-medium">Yetkili</th>
                  <th className="px-5 py-3 font-medium">Depo</th>
                  <th className="px-5 py-3 font-medium">Kasa</th>
                  <th className="px-5 py-3 font-medium">Personel</th>
                  <th className="px-5 py-3 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initial.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{b.code}</td>
                    <td className="px-5 py-3 font-medium">{b.name}</td>
                    <td className="px-5 py-3 text-slate-600">{b.manager ?? "-"}</td>
                    <td className="px-5 py-3 text-slate-600">{b.warehouses}</td>
                    <td className="px-5 py-3 text-slate-600">{b.registers}</td>
                    <td className="px-5 py-3 text-slate-600">{b.users}</td>
                    <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
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
