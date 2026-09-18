# Aksesuar ERP + POS — Multi-Tenant Retail SaaS

Telefon aksesuar magazalari icin coklu firma (multi-tenant) perakende ERP, POS, stok,
kasa ve cari platformu. Bu repo **PHASE 1** kapsamini icerir: mimari, veritabani,
multi-tenant guvenlik modeli, kimlik dogrulama, Super Admin paneli, firma/sube/depo/kasa
yonetimi ve rol/yetki sistemi.

---

## 1. Mimari

```
PLATFORM (Super Admin)
  └── COMPANY (tenant)
        └── BRANCH
              ├── WAREHOUSE
              └── CASH REGISTER
        └── USER → ROLE → PERMISSION
```

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 15 (App Router, React 19) |
| Dil | TypeScript (strict) |
| Veritabani | PostgreSQL + Prisma ORM |
| Auth | JWT (jose) + httpOnly cookie, bcrypt hash |
| UI | Tailwind CSS, kendi component seti, lucide-react |
| Veri cekme | TanStack Query, TanStack Table |
| Form / dogrulama | React Hook Form + Zod |
| Grafik | Recharts |
| Log | Pino (structured, sensitive-redaction) |
| Test | Vitest (unit), Playwright (E2E) |

### Klasor yapisi

```
prisma/          schema.prisma, seed.ts
src/
  app/           Next.js route'lari
    api/         REST endpointleri (/api/auth, /api/admin/..., /api/branches ...)
    admin/       Super Admin paneli
    app/         Firma paneli
    login/       Giris ekrani
  components/    Shell (sidebar/topbar) + UI kit
  i18n/          TR / EN sozlukler, cookie tabanli locale
  lib/           prisma, auth, tenant, permissions, audit, api, jwt, rate-limit
  modules/       Domain servisleri: auth, companies, users, structure
  middleware.ts  Route seviyesinde oturum ve panel ayrimi
tests/           Vitest birim testleri
```

---

## 2. Multi-tenant guvenlik modeli

Tenant izolasyonu uc katmanda birden zorunlu kilinir:

1. **Veritabani:** tenant'a ait her tabloda `companyId` + `(companyId, ...)` composite index,
   `@@unique([companyId, code])` gibi kisitlar, foreign key'ler.
2. **Context:** `getAuthContext()` tenant'i **yalnizca JWT'den** cikarir. Istemciden gelen
   `company_id`, `user_id`, `role_id`, `branch_id` degerleri hicbir zaman dogrudan kullanilmaz.
3. **Sorgu:** her sorgu `tenantWhere(ctx)` ile filtrelenir; baska tenant'a ait kayda erisim
   `assertSameTenant()` ile `404 NOT_FOUND` olarak kesilir (varlik sizintisi olmaz).

Yetkilendirme: `requirePermission("sales.create")` — rol yetkileri + kullanici ALLOW
override'lari, eksi DENY override'lari (DENY her zaman kazanir).

Super Admin bir firma panelini goruntuleyebilir (impersonation); bu gecis ve cikis
`COMPANY_IMPERSONATION_STARTED/ENDED` olarak audit'e yazilir ve tum kayitlarda
`impersonated = true` isaretlenir.

---

## 3. Kurulum

```bash
git clone <repo-url>
cd aksesuar-erp-pos
npm install
cp .env.example .env     # degerleri doldurun
npm run db:migrate       # migration olustur + uygula
npm run db:seed          # yetkiler, paketler, Super Admin, demo firmalar
npm run dev              # http://localhost:3000
```

Node.js 20+ gereklidir.

### .env

| Degisken | Aciklama |
|---|---|
| `DATABASE_URL` | PostgreSQL baglanti adresi (Neon icin `?sslmode=require`) |
| `JWT_SECRET` | En az 32 karakter. Uretim: `openssl rand -base64 48` |
| `SESSION_COOKIE_NAME` | Oturum cookie adi |
| `SESSION_TTL_MINUTES` | Oturum suresi (varsayilan 480) |
| `APP_URL` | Uygulamanin public adresi |
| `LOG_LEVEL` | info / warn / error |
| `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` | Seed'in olusturacagi Super Admin |

Secret'lar **asla** kod icine yazilmaz; `.env` git'e dahil degildir.

---

## 4. Development giris bilgileri

> Bu bilgiler **yalnizca gelistirme ortami** icindir. `NODE_ENV=production` iken seed demo
> firma olusturmaz. Uretimde Super Admin sifresini `SEED_SUPERADMIN_PASSWORD` ile verin ve
> ilk giristen sonra degistirin.

| Rol | E-posta | Sifre |
|---|---|---|
| Super Admin | `admin@platform.local` | `Admin!2345` |
| Firma Admin (ABC GSM) | `admin@abc-gsm.local` | `Demo!2345` |
| Yonetici | `yonetici@abc-gsm.local` | `Demo!2345` |
| Sube Yoneticisi | `sube@abc-gsm.local` | `Demo!2345` |
| Kasiyer | `kasiyer@abc-gsm.local` | `Demo!2345` |
| Depo | `depo@abc-gsm.local` | `Demo!2345` |
| Rapor | `rapor@abc-gsm.local` | `Demo!2345` |

Ayni kullanici seti `xyz-aksesuar` ve `mega-telefon` firmalari icin de olusturulur —
tenant izolasyonunu test etmek icin iki farkli firmayla giris yapip verilerin
birbirinden tamamen ayri oldugunu dogrulayabilirsiniz.

---

## 5. Komutlar

```bash
npm run dev          # gelistirme sunucusu
npm run build        # prisma generate + production build
npm run start        # production sunucusu
npm run typecheck    # TypeScript kontrolu
npm run test         # Vitest birim testleri
npm run test:e2e     # Playwright E2E
npm run db:migrate   # migration olustur/uygula (dev)
npm run db:deploy    # migration uygula (production)
npm run db:seed      # seed
npm run db:studio    # Prisma Studio
npm run db:reset     # veritabanini sifirla (dev)
```

---

## 6. API

Tum endpointler tek tip yanit doner:

```jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Bu islem icin yetkiniz yok." } }
```

Teknik hata detaylari kullaniciya gosterilmez; sunucu tarafinda Pino ile loglanir.

| Endpoint | Yetki |
|---|---|
| `POST /api/auth/login` | Herkese acik (IP basina 10 deneme / 5 dk) |
| `POST /api/auth/logout`, `GET /api/auth/me` | Oturum |
| `GET/POST /api/admin/companies` | Super Admin |
| `GET/PATCH/DELETE /api/admin/companies/:id` | Super Admin (DELETE = soft delete) |
| `GET/POST /api/admin/companies/:id/users` | Super Admin |
| `POST/DELETE /api/admin/companies/:id/impersonate` | Super Admin |
| `GET /api/admin/stats` | Super Admin |
| `GET/POST /api/branches`, `PATCH /api/branches/:id` | `branches.view` / `branches.manage` |
| `GET/POST /api/warehouses` | `warehouses.*` |
| `GET/POST /api/cash-registers` | `cashregisters.*` |
| `GET/POST /api/users`, `PATCH/DELETE /api/users/:id` | `users.*` |
| `POST /api/users/:id/password` | `users.edit` |
| `GET /api/roles` | `roles.view` |

---

## 7. Kritik is kurallari (PHASE 1'de kurulan temeller)

- Firma, kullanici, satis, kasa ve stok kayitlari **fiziksel olarak silinmez** — `deletedAt`,
  `deletedBy`, `deletedReason` ile soft delete.
- `audit_logs` append-only'dir; guncelleme/silme akisi yoktur.
- Sifreler bcrypt (12 round) ile hashlenir, hicbir log veya audit kaydina yazilmaz.
- 5 basarisiz giris denemesi hesabi 15 dakika kilitler; her deneme `login_attempts`'e yazilir.
- Paket limitleri (kullanici/sube/depo) backend'de zorlanir.
- Firma olusturma islemi tek transaction: firma + ayarlar + abonelik + varsayilan sube/depo/kasa
  + 7 sistem rolu + (opsiyonel) admin kullanici. Herhangi bir adim hata verirse rollback.

---

## 8. Testler

`npm run test` ile calisan birim testleri sartnamedeki su senaryolari karsilar:

| Test | Kapsam |
|---|---|
| TEST 1 / TEST 2 | Firma A, Firma B verisine erisemez; istemciden gelen `companyId` context'i ezemez |
| TEST 3 / TEST 4 | Kasiyer urun fiyati degistiremez, indirim limiti asma onayi veremez |
| TEST 5 | Yonetici indirim limitini asma yetkisine sahiptir |
| TEST 15 / TEST 16 | Kullanici yalnizca atandigi subeleri gorur |
| — | Rol/yetki katalogu tutarliligi, ALLOW/DENY override onceligi |

Stok, kasa, satis ve iade testleri (TEST 6-14, TEST 20) ilgili modullerle birlikte
PHASE 4-8'de eklenecektir.

---

## 9. Deployment (Vercel + Neon)

1. Neon'da bir PostgreSQL projesi olusturun, connection string'i alin.
2. Repoyu GitHub'a push edin.
3. Vercel'de "New Project" → repoyu secin.
4. Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `SESSION_TTL_MINUTES`.
5. Deploy sonrasi migration'lari uygulayin: `npx prisma migrate deploy` (yerelden production
   `DATABASE_URL` ile) ve `NODE_ENV=production npm run db:seed`.
6. GoDaddy'de alan adinizin DNS kayitlarini Vercel'in verdigi A / CNAME degerlerine yonlendirin,
   ardindan Vercel → Settings → Domains uzerinden alan adini dogrulayin.

Alternatif: VPS uzerinde `npm run build && npm run start`, onunde Nginx + Let's Encrypt.

---

## 10. Yol haritasi

| Phase | Kapsam | Durum |
|---|---|---|
| 1 | Mimari, DB, auth, multi-tenancy, Super Admin, firma/kullanici/rol/yetki | ✅ Tamamlandi |
| 2 | Sube, depo, kasa, firma ayarlari ekranlari | 🟡 Altyapi hazir, ekranlar kismi |
| 3 | Urun, kategori, marka, fiyat gecmisi | ⬜ |
| 4 | Stok, stok hareketleri, sayim, transfer | ⬜ |
| 5 | POS, barkod, sepet, indirim | ⬜ |
| 6 | Odeme, satis, kasa, fis | ⬜ |
| 7 | Iade, degisim, iptal | ⬜ |
| 8 | Musteri, cari hareket, tahsilat, veresiye | ⬜ |
| 9 | Tedarikci, alis, tedarikci cari | ⬜ |
| 10 | Dashboard, raporlar, karlilik | ⬜ |
| 11 | Audit ekranlari, bildirimler, guvenlik sertlestirme | ⬜ |
| 12 | Performans, responsive, yazdirma, export, E2E | ⬜ |
