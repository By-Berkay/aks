import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-5xl font-semibold text-slate-300">403</span>
      <h1 className="text-xl font-semibold">Bu sayfaya erisim yetkiniz yok</h1>
      <p className="max-w-md text-sm text-slate-500">
        Erisim gerektigini dusunuyorsaniz firma yoneticinizle iletisime gecin.
      </p>
      <Link href="/app" className="text-sm text-brand-600 hover:underline">Panele don</Link>
    </main>
  );
}
