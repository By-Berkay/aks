import { ok, handler } from "@/lib/api";
import { requirePlatform } from "@/lib/auth";
import { platformStats } from "@/modules/companies/service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requirePlatform();
  return ok(await platformStats());
});
