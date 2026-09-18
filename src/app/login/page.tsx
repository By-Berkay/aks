import { redirect } from "next/navigation";
import { getTranslations } from "@/i18n";
import { readSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect(session.type === "platform" && !session.actAsCompanyId ? "/admin" : "/app");

  const { t } = await getTranslations();
  return (
    <main className="flex min-h-screen">
      <section className="hidden w-1/2 flex-col justify-between bg-sidebar p-12 text-white lg:flex">
        <span className="text-lg font-semibold">{t.common.appName}</span>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-tight">
            Magazanizin satis, stok ve kasasi tek panelde.
          </h1>
          <p className="max-w-md text-slate-300">
            Coklu firma, coklu sube ve coklu kasa destekli perakende ERP + POS platformu.
          </p>
        </div>
        <span className="text-xs text-slate-400">© {new Date().getFullYear()}</span>
      </section>

      <section className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold">{t.login.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>
          <div className="mt-8">
            <LoginForm
              labels={{
                email: t.login.email,
                password: t.login.password,
                remember: t.login.remember,
                forgot: t.login.forgot,
                submit: t.login.submit,
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
