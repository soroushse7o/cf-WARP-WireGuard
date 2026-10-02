# WARP WireGuard Worker

ساخت کانفیگ **Cloudflare WARP** (به‌صورت WireGuard) روی **Cloudflare Workers** با رابط گرافیکی فارسی.

by> [soroushse7o](https://github.com/soroushse7o)



ایده و کد اصلی: Peyman — <https://github.com/Ptechgithub>

---

## امکانات

- رابط گرافیکی ساده (فارسی، راست‌به‌چپ، سازگار با موبایل و حالت تاریک)
- ساخت کانفیگ جدید با هر بار کلیک (اکانت و کلید تازه)
- نام‌گذاری کانفیگ‌ها: پیش‌فرض `sevo-wg` و در حالت چند Endpoint به‌صورت `sevo-wg-1` ، `sevo-wg-2` ، ... (نام قابل تغییر است)
- خروجی در چهار فرمت: لینک `wireguard://`، فایل `.conf`، JSON خلاصه، JSON کامل
- افزودن Endpointهای شخصی (نتیجه‌ی اسکنر خودتان) و ساخت یک کانفیگ برای **هر** Endpoint
- دانلود چند کانفیگ `.conf` به‌صورت یک فایل ZIP
- بدون نیاز به کتابخانه‌ی خارجی (کلیدها با WebCrypto ساخته می‌شوند)
- ورودی‌ها اعتبارسنجی می‌شوند و پاسخ‌ها `no-store` هستند

---

## ساختار پروژه

```
warp-wireguard/
├─ src/
│  ├─ index.js      ← منطق ورکر و مسیرها
│  ├─ ui.js         ← صفحه‌ی اصلی (HTML)
│  └─ amnezia.js    ← صفحه‌ی AmneziaWG (HTML)
├─ scripts/
│  └─ build.mjs     ← ساخت نسخه‌ی تک‌فایلی (بدون وابستگی)
├─ dist/
│  ├─ worker.js     ← برای paste در داشبورد Workers
│  └─ _worker.js    ← برای Cloudflare Pages (حالت advanced)
├─ wrangler.jsonc   ← تنظیمات دیپلوی Workers
├─ package.json
└─ README.md
```

---

## آموزش دیپلوی

### روش ۱: داشبورد Workers (بدون نصب چیزی)

1. وارد <https://dash.cloudflare.com> شوید.
2. از منوی **Workers & Pages** گزینه‌ی **Create** و سپس **Create Worker** را بزنید.
3. یک نام بدهید (مثلاً `warp`) و **Deploy** کنید.
4. روی **Edit code** بزنید، کل کد پیش‌فرض را پاک کنید و محتوای فایل **`dist/worker.js`** را paste کنید.
5. **Deploy** را بزنید.

> فقط `dist/worker.js` را استفاده کنید؛ `src/index.js` به‌تنهایی کار نمی‌کند چون به `ui.js` و `amnezia.js` وابسته است. بعد از هر تغییر در `src/` دستور `npm run build` را بزنید تا `dist/` به‌روز شود.

### روش ۲: Wrangler (Workers)

پیش‌نیاز: [Node.js](https://nodejs.org) نسخه‌ی 18 یا بالاتر.

```bash
npm install
npx wrangler login      # ورود به حساب کلودفلیر (یک بار)
npm run deploy          # دیپلوی
```

تست محلی: `npm run dev` (معمولاً روی `http://localhost:8787`).
برای تغییر نام ورکر، مقدار `name` را در `wrangler.jsonc` عوض کنید.

### روش ۳: Cloudflare Pages

**با Git (اتصال ریپو):** در داشبورد: Workers & Pages ← Create ← Pages ← Connect to Git، سپس:

| تنظیم | مقدار |
|-------|-------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Framework preset | None |

فایل `dist/_worker.js` به‌عنوان Worker پروژه‌ی Pages شناخته می‌شود و همه‌ی مسیرها را مدیریت می‌کند.

**با خط فرمان:**

```bash
npm install
npx wrangler login
npm run deploy:pages    # build + wrangler pages deploy dist
```

(نام پروژه‌ی Pages در اسکریپت `deploy:pages` داخل `package.json` قابل تغییر است.)

### دامنه‌ی دلخواه (اختیاری)

Workers: Worker ← **Settings** ← **Domains & Routes** ← **Add** ← Custom domain.
Pages: پروژه ← **Custom domains** ← **Set up a custom domain**.
(دامنه باید در همان حساب کلودفلیر باشد.)

---

## طرز استفاده

### از طریق رابط گرافیکی

1. آدرس ورکر را در مرورگر باز کنید.
2. منبع Endpoint و فرمت خروجی را انتخاب کنید.
3. **ساخت کانفیگ** را بزنید.
4. خروجی را **کپی** یا **دانلود** کنید و در کلاینت خود وارد کنید:
   - لینک `wireguard://` ← v2rayNG، NekoBox، Hiddify و مشابه
   - فایل `.conf` ← برنامه‌ی رسمی WireGuard

### Endpointهای شخصی (اسکنر)

1. با اسکنر دلخواه خود، IP:PORTهای سالم شبکه‌ی خودتان را پیدا کنید.
2. در بخش **Endpointهای من** خروجی را paste کنید، هر خط به شکل:
   ```
   162.159.192.1:2408
   188.114.97.5:864 ping 45ms
   [2606:4700:d0::1]:2408
   ```
   متن اضافه (مثل پینگ) نادیده گرفته می‌شود و Endpointهای تکراری حذف می‌شوند.
3. **افزودن و ذخیره** را بزنید.
4. در بخش ساخت کانفیگ، منبع را روی **لیست من** بگذارید و **ساخت کانفیگ** را بزنید.
   برای **هر** Endpoint یک کانفیگ ساخته می‌شود و نام‌ها شماره‌گذاری می‌شوند:
   `sevo-wg-1` ، `sevo-wg-2` ، `sevo-wg-3` ، ...
5. خروجی:
   - فرمت لینک: هر کانفیگ در یک خط (و نام آن بعد از `#` در انتهای لینک است)
   - فرمت `.conf`: دکمه‌ی **دانلود** همه را در یک ZIP (`sevo-wg-1.conf` ، `sevo-wg-2.conf` ، ...) می‌دهد
   - فرمت‌های JSON مستقل از Endpoint هستند و یک اکانت تکی می‌سازند

نکته‌ها:
- در حالت «لیست من» همه‌ی کانفیگ‌های یک دفعه با **یک اکانت WARP** ساخته می‌شوند (فقط Endpoint آن‌ها فرق دارد). این کار از محدودیت (429) جلوگیری می‌کند.
- حداکثر ۲۰۰ Endpoint در هر بار ساخت.
- نام کانفیگ را از کادر «نام کانفیگ» می‌توانید عوض کنید (حرف انگلیسی، عدد، `-` و `_`؛ حداکثر ۳۲ کاراکتر).
- لیست فقط در مرورگر خودتان (localStorage) ذخیره می‌شود، نه روی سرور.
- کادر همیشه لیست فعلی را نشان می‌دهد. برای اضافه کردن، خروجی جدید را زیر خطوط قبلی paste کنید. حذف یک خط از کادر و ذخیره‌ی دوباره، آن را از لیست پاک می‌کند.

---

## مسیرهای API

| مسیر | توضیح |
|------|-------|
| `/` | رابط گرافیکی |
| `/v2ray` | لینک `wireguard://...` |
| `/conf` | فایل کانفیگ استاندارد WireGuard |
| `/raw` | JSON خلاصه (کلید خصوصی، کلید عمومی، Reserved، IPv6) |
| `/full` | پاسخ کامل و خام کلودفلیر |
| `/batch` | **POST** با بدنه‌ی `{"endpoints":["ip:port",...],"name":"sevo-wg"}` ← یک کانفیگ برای هر Endpoint (`sevo-wg-1` ، `sevo-wg-2` ، ...) |
| `/amnezia` | صفحه‌ی ساخت کانفیگ AmneziaWG |
| `/help` | راهنمای متنی (انگلیسی و فارسی) |

برای استفاده از Endpoint دلخواه، به هر مسیر کانفیگ پارامتر `endpoint` و برای تعیین نام، پارامتر `name` (پیش‌فرض `sevo-wg`) را اضافه کنید:

```
/v2ray?endpoint=162.159.192.1:2408
/conf?endpoint=[2606:4700:d0::1]:2408&name=my-config
```

مثال `/batch`:

```bash
curl -X POST https://YOUR-WORKER.workers.dev/batch \
  -H 'Content-Type: application/json' \
  -d '{"endpoints":["162.159.192.1:2408","188.114.97.5:864"]}'
```

مقدار نامعتبر برای `endpoint` یا `name` خطای `400` برمی‌گرداند.

---

## عیب‌یابی

اگر خطای `502 Bad Gateway` دیدید، متن بعد از آن علت را نشان می‌دهد:

| پیام | علت و راه‌حل |
|------|--------------|
| `Key generation failed` | WebCrypto در محیط شما X25519 را پشتیبانی نمی‌کند. `compatibility_date` را در `wrangler.jsonc` بررسی کنید. |
| `WARP registration failed: HTTP 403` یا `429` | محدودیت یا رد درخواست از سمت کلودفلیر. چند دقیقه صبر کنید و دوباره امتحان کنید. |
| `WARP registration failed: HTTP 404` | نسخه‌ی API قدیمی شده. ثابت `WARP_REG_URL` را در `src/index.js` به‌روز کنید. |
| `TimeoutError` / `aborted` | پاسخ API کند بوده. مقدار `UPSTREAM_TIMEOUT_MS` را بیشتر کنید. |

مشاهده‌ی لاگ زنده:

```bash
npx wrangler tail
```

اگر Endpoint تصادفی عمومی در شبکه‌ی شما کار نمی‌کند، با اسکنر خودتان Endpoint سالم پیدا کنید و از بخش **Endpointهای من** استفاده کنید.

---

## به‌روزرسانی

کد را تغییر دهید و دوباره `npm run deploy` (Workers) یا `npm run deploy:pages` (Pages) بزنید.
اگر از روش داشبورد استفاده می‌کنید، `npm run build` بزنید و `dist/worker.js` جدید را دوباره paste و Deploy کنید.

---

## English (short)

A Cloudflare Worker that generates WARP WireGuard configs with a Persian web UI.
Deploy as a Worker: `npm install && npx wrangler login && npm run deploy`, or paste
`dist/worker.js` into the dashboard editor. Deploy to Pages: build command `npm run build`,
output directory `dist` (uses `dist/_worker.js`), or `npm run deploy:pages`.
Use `?endpoint=IP:PORT` on any config route to supply your own endpoint.
Routes: `/`, `/v2ray`, `/conf`, `/raw`, `/full`, `/batch` (POST), `/amnezia`, `/help`.
Configs are named `sevo-wg` (or `sevo-wg-1`, `sevo-wg-2`, ... in batch mode); change with `?name=`.
