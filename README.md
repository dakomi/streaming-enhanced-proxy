# streaming-enhanced-proxy

A self-hosted LAN proxy server that automatically injects [Streaming Enhanced](https://github.com/Dreamlinerm/Netflix-Prime-Auto-Skip) scripts into Netflix, Prime Video, Disney+, Crunchyroll, Max/HBO Max and Paramount+ pages — on every device on your local network, with no browser extension required.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  streaming-enhanced-proxy                │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────────┐ │
│  │  Proxy Engine   │    │   Admin & Settings Server    │ │
│  │  (http-mitm-    │    │   (Fastify, port 3000)       │ │
│  │   proxy)        │    │                              │ │
│  │  port 8080      │    │  GET  /                      │ │
│  │                 │    │    → Admin dashboard         │ │
│  │  - Intercepts   │    │  GET  /settings              │ │
│  │    HTML for     │    │    → Per-device settings UI  │ │
│  │    target sites │    │  GET  /api/settings/:devId   │ │
│  │  - Strips CSP   │    │    → JSON settings for device│ │
│  │  - Injects JS   │    │  POST /api/settings/:devId   │ │
│  │    into <head>  │    │    → Save device settings    │ │
│  └─────────────────┘    │  GET  /api/scripts/:file     │ │
│                         │    → Serve compiled script   │ │
│                         │  POST /api/update-scripts    │ │
│                         │    → Pull latest from GitHub │ │
│                         └──────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   Script Cache & Auto-Updater                       │ │
│  │   - Stores compiled .js files locally (scripts/)   │ │
│  │   - Polls GitHub releases daily for updates        │ │
│  │   - Falls back to last known good version          │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
          ↑ HTTP/HTTPS proxy (port 8080) + HTTP admin (port 3000)
          ↑ All LAN devices point their proxy settings here
```

---

## Supported Services

| Service | Domains |
|---------|---------|
| Netflix | `*.netflix.com`, `*.netflix.ca`, `*.netflix.com.au` |
| Amazon Prime Video | `*.primevideo.com`, `*.amazon.com`, `*.amazon.co.jp`, `*.amazon.de`, `*.amazon.co.uk` |
| Disney+ / Hotstar / Star+ | `*.disneyplus.com`, `*.hotstar.com`, `*.starplus.com`, `*.jiostar.com`, `*.jiocinema.com` |
| Crunchyroll | `*.crunchyroll.com` |
| Max / HBO Max | `*.max.com`, `*.hbomax.com` |
| Paramount+ | `*.paramountplus.com` |

---

## Quick Start — Docker (recommended)

```bash
git clone https://github.com/dakomi/streaming-enhanced-proxy
cd streaming-enhanced-proxy
docker compose up -d
```

- **Admin dashboard**: http://\<server-ip\>:3000
- **Proxy port**: 8080

---

## Quick Start — Bare Metal (Raspberry Pi)

```bash
git clone https://github.com/dakomi/streaming-enhanced-proxy
cd streaming-enhanced-proxy
npm install
npm run build
npm start
```

Requires Node.js 20+.

---

## Router / Browser Proxy Configuration

### Browser

Configure your browser's proxy settings:

```
HTTP Proxy:  <server-ip>:8080
HTTPS Proxy: <server-ip>:8080
```

### Router (iptables transparent proxy)

```bash
# Redirect HTTP and HTTPS traffic to the proxy
iptables -t nat -A PREROUTING -p tcp --dport 80  -j DNAT --to <pi-ip>:8080
iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to <pi-ip>:8080
```

---

## CA Certificate Installation

The proxy generates a local CA on first run (`certs/ca.crt`). Install it on each device to avoid browser TLS warnings.

### Windows

1. Download http://\<server-ip\>:3000/ca.crt
2. Double-click → "Install Certificate"
3. Store Location: Local Machine → "Trusted Root Certification Authorities"

### macOS

1. Download and open `ca.crt`
2. Keychain Access → add to "System" keychain
3. Find "Streaming Enhanced Proxy CA" → Get Info → Trust → "Always Trust"

### Android

1. Download `ca.crt` to your device
2. Settings → Security → Install from storage → select `ca.crt`
3. Name it and set to "VPN and apps"

### iOS / iPadOS

1. Open http://\<server-ip\>:3000/ca.crt in Safari
2. Settings → Profile Downloaded → Install
3. Settings → General → About → Certificate Trust Settings → enable trust

### Samsung / LG / Vidaa Smart TV

Smart TVs do not support custom CA installation directly. The recommended approach is to configure your router to handle TLS interception at network level, or to install the CA on your router (e.g., OpenWrt):

```bash
cp ca.crt /etc/ssl/certs/
update-ca-certificates
```

---

## Per-Device Settings

Visit http://\<server-ip\>:3000/settings from any device to configure that device's streaming enhancement settings. Settings are saved per-device (identified by a UUID stored in `localStorage`).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_PORT` | `3000` | Admin server port |
| `PROXY_PORT` | `8080` | MITM proxy port |
| `SCRIPTS_DIR` | `./scripts` | Path to cached JS scripts |
| `CERTS_DIR` | `./certs` | Path to TLS certificates |
| `DATA_DIR` | `./data` | Path to SQLite database |
| `ADMIN_ORIGIN` | `http://streamingenhanced.local` | Origin for injected script tags |
| `UPDATE_CRON` | `0 3 * * *` | Cron schedule for auto-updates |

---

## Future: Wrapper App Hook (stub)

A `PROXY_MODE=wrapper` environment variable is reserved for a future native Vidaa/Android TV wrapper app mode. In this mode the server would expose `GET /api/inject-payload?service=amazon` returning the full injection bundle (shim + scripts) for use by a WebView-based native wrapper app — without requiring network-level interception.

---

## Project Structure

```
streaming-enhanced-proxy/
├── src/
│   ├── proxy/
│   │   ├── index.ts          # Proxy server entry point
│   │   ├── interceptor.ts    # HTML interception + header stripping + script injection
│   │   ├── tls.ts            # CA cert generation + per-domain cert caching
│   │   └── domains.ts        # Domain → service mapping
│   ├── server/
│   │   ├── index.ts          # Fastify admin+API server
│   │   ├── routes/
│   │   │   ├── settings.ts   # GET/POST /api/settings/:deviceId
│   │   │   ├── scripts.ts    # GET /api/scripts/:service.js
│   │   │   ├── devices.ts    # GET/PATCH /api/devices
│   │   │   └── update.ts     # POST /api/update-scripts
│   │   └── admin/            # Static admin dashboard + settings UI
│   ├── updater/
│   │   ├── index.ts          # GitHub release poller + cron scheduler
│   │   └── extractor.ts      # ZIP download + script extraction
│   ├── settings/
│   │   ├── store.ts          # SQLite per-device settings store
│   │   └── defaults.ts       # Default settings (mirrors upstream)
│   └── types/
│       └── settings.ts       # Settings type definitions
├── scripts/                  # Cached compiled .js files from upstream
│   └── version.json
├── certs/                    # Generated CA + domain certs (runtime)
├── data/                     # SQLite database (runtime)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## License

MIT