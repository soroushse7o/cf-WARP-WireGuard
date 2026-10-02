/**
 * Cloudflare WARP -> WireGuard config generator (Cloudflare Worker, ES module)
 * Original idea: Peyman — https://github.com/Ptechgithub
 *
 * Changes vs. the original:
 *  - ES Modules syntax (`export default { fetch }`) instead of the legacy
 *    service-worker `addEventListener('fetch')`.
 *  - tweetnacl (~18 KB) removed: X25519 keys come from the native WebCrypto API.
 *  - Unknown routes / methods are rejected BEFORE any upstream call is made.
 *  - Device registration and endpoint-list lookup run in parallel.
 *  - Endpoint list is cached at the edge (cf.cacheTtl) and has a timeout.
 *  - No stack traces leaked to clients; responses are `no-store`.
 */

import { UI_HTML } from './ui.js';
import { AMNEZIA_HTML } from './amnezia.js';

const WARP_REG_URL = 'https://api.cloudflareclient.com/v0a4005/reg';
const ENDPOINTS_URL =
  'https://raw.githubusercontent.com/ircfspace/endpoint/refs/heads/main/ip.json';

const FALLBACK_ENDPOINT = { ip: '8.39.204.72', port: 7156 };
const LOCAL_IPV4 = '172.16.0.2/32';
const MTU = 1280;
const DEFAULT_NAME = 'sevo-wg';
const MAX_BATCH = 200;
const NAME_RE = /^[A-Za-z0-9_-]{1,32}$/;
const UPSTREAM_TIMEOUT_MS = 5000;

const HELP_TEXT = `Cloudflare WARP WireGuard API Worker
-------------------------------------
by> soroushse7o

https://github.com/soroushse7o
-------------------------------------

Available endpoints:

/v2ray   →  Generate WireGuard URL format (wireguard://...)
/conf    →  WireGuard .conf file format
/full    →  Return full Cloudflare JSON response
/raw     →  Return compact config (PrivateKey, PublicKey, Reserved, IPv6)
/batch   →  POST {"endpoints":["ip:port",...]} : one config per endpoint (sevo-wg-1, sevo-wg-2, ...)
/amnezia →  AmneziaWG config page (UI)
/help    →  Show this help message

Optional: ?endpoint=IP:PORT (your own endpoint) and ?name=NAME (default: sevo-wg)

All keys are generated dynamically on each request.

=====================================
راهنمای فارسی
=====================================

این ورکر با هر بار فراخوانی، یک کانفیگ جدید WireGuard برای Cloudflare WARP می‌سازد.

مسیرهای موجود:

/v2ray   →  ساخت لینک WireGuard به‌صورت wireguard://... (برای وارد کردن مستقیم در کلاینت)
/conf    →  فایل کانفیگ استاندارد WireGuard (.conf)
/full    →  نمایش پاسخ کامل و خام کلودفلیر (JSON)
/raw     →  نمایش کانفیگ خلاصه (کلید خصوصی، کلید عمومی، Reserved و IPv6)
/batch   →  (POST) ساخت یک کانفیگ برای هر Endpoint با نام‌های sevo-wg-1 ، sevo-wg-2 ، ...
/help    →  نمایش همین راهنما

اختیاری: با ?endpoint=IP:PORT می‌توانید Endpoint دلخواه بدهید و با ?name=NAME نام کانفیگ را تعیین کنید (پیش‌فرض: sevo-wg).

نکته‌ها:
- کلیدها در هر درخواست به‌صورت تصادفی و جدید ساخته می‌شوند.
- آدرس و پورت سرور (Endpoint) به‌صورت تصادفی از یک لیست انتخاب می‌شود.
- اگر خطای 502 دیدید، چند لحظه بعد دوباره امتحان کنید.`;

/* ---------- helpers ---------- */

const toBase64 = (u8) => btoa(String.fromCharCode(...u8));
const fromBase64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const text = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });

/** X25519 key pair via native WebCrypto (no external library). */
async function generateKeys() {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    { name: 'X25519' },
    true,
    ['deriveBits'],
  );
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
  // Raw export of private keys isn't defined for X25519; PKCS#8 = 16-byte header + 32-byte key.
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey));
  return { publicKey: toBase64(pub), privateKey: toBase64(pkcs8.slice(-32)) };
}

async function registerDevice(publicKey) {
  const resp = await fetch(WARP_REG_URL, {
    method: 'POST',
    headers: { 'User-Agent': 'okhttp/4.9.0', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      install_id: '',
      fcm_token: '',
      tos: new Date().toISOString(),
      type: 'Android',
      model: 'PC',
      locale: 'en_US',
      warp_enabled: true,
      key: publicKey,
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!resp.ok) throw new Error(`WARP registration failed: HTTP ${resp.status}`);
  return resp.json();
}

/** Random endpoint from the community list; falls back to a fixed one on any error. */
async function pickEndpoint() {
  try {
    const resp = await fetch(ENDPOINTS_URL, {
      cf: { cacheTtl: 300, cacheEverything: true },
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return FALLBACK_ENDPOINT;
    const { ipv4 } = await resp.json();
    if (!Array.isArray(ipv4) || ipv4.length === 0) return FALLBACK_ENDPOINT;
    const [ip, portStr] = ipv4[Math.floor(Math.random() * ipv4.length)].split(':');
    const port = Number.parseInt(portStr, 10);
    return ip && port > 0 && port < 65536 ? { ip, port } : FALLBACK_ENDPOINT;
  } catch {
    return FALLBACK_ENDPOINT;
  }
}

/** Validates a user-supplied "ip:port" or "[ipv6]:port". Returns {ip, port} or null. */
function parseEndpoint(value) {
  const m = /^(?:(\d{1,3}(?:\.\d{1,3}){3})|\[([0-9a-fA-F:]+)\]):(\d{1,5})$/.exec(value ?? '');
  if (!m) return null;
  const port = Number(m[3]);
  if (port < 1 || port > 65535) return null;
  if (m[1]) {
    if (m[1].split('.').some((o) => Number(o) > 255)) return null;
    return { ip: m[1], port };
  }
  return { ip: `[${m[2]}]`, port };
}

function wireGuardConf({ privateKey, peerPublicKey, reserved, ipv6, endpoint, name }) {
  return `# ${name}
[Interface]
PrivateKey = ${privateKey}
Address = ${LOCAL_IPV4}, ${ipv6}
DNS = 1.1.1.1, 1.0.0.1
MTU = ${MTU}
# Reserved = ${reserved.join(',')}

[Peer]
PublicKey = ${peerPublicKey}
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = ${endpoint.ip}:${endpoint.port}
`;
}

function wireGuardURL({ privateKey, peerPublicKey, reserved, ipv6, endpoint, name }) {
  const e = encodeURIComponent;
  return (
    `wireguard://${e(privateKey)}@${endpoint.ip}:${endpoint.port}` +
    `?address=${e(LOCAL_IPV4)},${e(ipv6)}` +
    `&presharedkey=&reserved=${e(reserved.join(','))}` +
    `&publickey=${e(peerPublicKey)}&mtu=${MTU}#${e(name)}`
  );
}

/* ---------- routes ---------- */

const SINGLE_ROUTES = {
  '/v2ray': (ctx) => text(wireGuardURL(ctx)),
  '/conf': (ctx) => text(wireGuardConf(ctx)),
  '/full': (ctx) => json(ctx.data),
  '/raw': (ctx) =>
    json({
      IPv6: ctx.ipv6,
      ClientID: ctx.clientId,
      Reserved: ctx.reserved,
      PeerPublicKey: ctx.peerPublicKey,
      PrivateKey: ctx.privateKey,
    }),
};

/** Generates keys, registers one WARP device, returns everything except the endpoint. */
async function createAccount() {
  let keys;
  try {
    keys = await generateKeys();
  } catch (e) {
    throw new Error(`Key generation failed: ${e.message}`);
  }
  const data = await registerDevice(keys.publicKey);
  const clientId = data.config.client_id;
  return {
    data,
    privateKey: keys.privateKey,
    clientId,
    reserved: Array.from(fromBase64(clientId).slice(0, 3)),
    peerPublicKey: data.config.peers[0].public_key,
    ipv6: `${data.config.interface.addresses.v6}/128`,
  };
}

const UI_HEADERS = {
  ...BASE_HEADERS,
  'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",
};

/**
 * POST /batch  { "endpoints": ["ip:port", ...], "name": "sevo-wg" }
 * One WARP account, one config per endpoint, named <name>-1, <name>-2, ...
 */
async function handleBatch(request, name) {
  let body;
  try {
    body = await request.json();
  } catch {
    return text('400 Bad Request: body must be JSON', 400);
  }
  const list = Array.isArray(body?.endpoints) ? body.endpoints : [];
  const endpoints = [];
  const seen = new Set();
  for (const raw of list) {
    const ep = parseEndpoint(String(raw).trim());
    if (!ep) return text(`400 Bad Request: invalid endpoint "${String(raw).slice(0, 60)}"`, 400);
    const key = `${ep.ip}:${ep.port}`;
    if (!seen.has(key)) {
      seen.add(key);
      endpoints.push(ep);
    }
  }
  if (endpoints.length === 0) return text('400 Bad Request: no endpoints provided', 400);
  if (endpoints.length > MAX_BATCH) {
    return text(`400 Bad Request: at most ${MAX_BATCH} endpoints per request`, 400);
  }

  const account = await createAccount();
  const configs = endpoints.map((endpoint, i) => {
    const ctx = { ...account, endpoint, name: `${name}-${i + 1}` };
    return {
      name: ctx.name,
      endpoint: `${endpoint.ip}:${endpoint.port}`,
      link: wireGuardURL(ctx),
      conf: wireGuardConf(ctx),
    };
  });
  const { data: _data, ...info } = account;
  return json({ account: info, configs });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/batch') {
      if (request.method !== 'POST') return text('405 Method Not Allowed (use POST)', 405);
    } else if (request.method !== 'GET' && request.method !== 'HEAD') {
      return text('405 Method Not Allowed', 405);
    }

    if (pathname === '/') return new Response(UI_HTML, { headers: UI_HEADERS });
    if (pathname === '/amnezia') return new Response(AMNEZIA_HTML, { headers: UI_HEADERS });
    if (pathname === '/help') return text(HELP_TEXT);

    const single = SINGLE_ROUTES[pathname];
    if (pathname !== '/batch' && !single) {
      return text('404 Not Found\n\nUse /help for usage info.', 404);
    }

    const name = url.searchParams.get('name') ?? DEFAULT_NAME;
    if (!NAME_RE.test(name)) {
      return text('400 Bad Request: name must be 1-32 chars of A-Z a-z 0-9 _ -', 400);
    }

    try {
      if (pathname === '/batch') return await handleBatch(request, name);

      // Optional user-supplied endpoint (e.g. from their own scanner).
      const epParam = url.searchParams.get('endpoint');
      const customEndpoint = epParam ? parseEndpoint(epParam) : null;
      if (epParam && !customEndpoint) {
        return text('400 Bad Request: endpoint must look like 1.2.3.4:2408 or [ipv6]:2408', 400);
      }

      // Independent upstream calls -> run concurrently.
      const [account, endpoint] = await Promise.all([
        createAccount(),
        customEndpoint ?? pickEndpoint(),
      ]);
      return single({ ...account, endpoint, name });
    } catch (err) {
      console.error(err instanceof Error ? (err.stack ?? err.message) : err);
      // Only the message is returned (no stack trace) so failures are diagnosable.
      return text(`502 Bad Gateway: ${err instanceof Error ? err.message : err}`, 502);
    }
  },
};
