import Link from "next/link";
import { requirePlatform } from "@/lib/auth";
import { getCompany } from "@/modules/companies/service";
import { listCompanyUsers } from "@/modules/users/service";
import { Card, StatCard, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { ImpersonateButton } from "./ImpersonateButton";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatform();
  const { id } = await params;
  const [company, users] = await Promise.all([
    getCompany(id),
    listCompanyUsers(id, { page: 1, pageSize: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/companies" className="text-sm text-slate-500 hover:underline">← Firmalar</Link>
          <h1 className="mt-1 text-2xl font-semibold">{company.name}</h1>
          <p className="text-sm text-slate-500">
            {company.shortName} · {company.plan?.name ?? "Paket yok"} · <StatusBadge status={company.status} />
          </p>
        </div>
        <ImpersonateButton companyId={company.id} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kullanici" value={`${company._count.users} / ${company.maxUsers}`} />
        <StatCard label="Sube" value={`${company._count.branches} / ${company.maxBranches}`} />
        <StatCard label="Depo" value={`${company._count.warehouses} / ${company.maxWarehouses}`} />
        <StatCard label="Kasa" value={company._count.cashRegisters} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Firma bilgileri</h2>
          <dl className="space-y-2 text-sm">
            {[
              ["Vergi no", company.taxNumber],
              ["Vergi dairesi", company.taxOffice],
              ["Telefon", company.phone],
              ["E-posta", company.email],
              ["Adres", company.address],
              ["Para birimi", company.currency],
              ["Deneme bitis", company.trialEndsAt ? formatDate(company.trialEndsAt) : null],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right text-slate-800">{(value as string) || "-"}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Subeler</h2>
          <ul className="space-y-2 text-sm">
            {company.branches.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>{b.name} <span className="text-xs text-slate-400">({b.code})</span></span>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-0">
        <h2 className="px-5 py-4 text-sm font-semibold text-slate-700">Kullanicilar</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
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
              {users.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-medium">{u.fullName}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {u.userRoles.map((r) => r.role.name).join(", ") || "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {u.userBranches.map((b) => b.branch.name).join(", ") || "Tumu"}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
