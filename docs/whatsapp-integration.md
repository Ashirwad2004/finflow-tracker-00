# FinFlow WhatsApp Integration Guide (OpenWA Gateway)

This document describes the architecture, setup, configuration, security practices, and operation of the WhatsApp integration in **FinFlow Tracker** using a self-hosted **OpenWA (EasyAPI)** gateway.

---

## 1. Architecture Overview

FinFlow connects to WhatsApp via a self-hosted OpenWA gateway instance. The React frontend never communicates directly with the WhatsApp gateway and never has access to the OpenWA ADMIN API key.

```
                    FINFLOW ARCHITECTURE
                             |
             ---------------------------------
             |                               |
             v                               v
      React Frontend                  FastAPI Backend
       (Vite 5 / TS)                   (/api/v1/whatsapp)
             |                               |
             |                               v
             |                        WhatsAppService
             |                               |
             |                   [WhatsAppProvider (ABC)]
             |                               |
             |                     +---------+---------+
             |                     |                   |
             |                     v                   v
             |              OpenWAProvider     MetaCloudProvider
             |                     |               (Future)
             |                     v
             |               OpenWA Gateway
             |               (localhost:2785)
             |                     |
             |       -----------------------------
             |       |             |             |
             |       v             v             v
             |   Session A     Session B     Session C
             |       |             |             |
             v       v             v             v
     Settings / UI  Store A       Store B       Store C
```

### Key Architectural Principles
- **Provider Abstraction**: All FinFlow business logic (invoices, receipts, reminders) interacts solely with `WhatsAppService`, which delegates to an implementation of `WhatsAppProvider`. OpenWA can be swapped for Meta Cloud API without rewriting accounting workflows.
- **Tenant Isolation**: Each FinFlow store gets its own deterministic WhatsApp session (`finflow_store_<clean_store_id>`). Store A can never send or read Store B's WhatsApp communications.
- **Non-blocking Financial Operations**: Saving an invoice or recording a payment always succeeds first in Supabase / offline storage. If WhatsApp is disconnected, times out, or fails, the transaction is **never rolled back**.
- **Offline Protection**: If the client is offline, FinFlow prevents WhatsApp requests and displays: *"WhatsApp requires an internet connection. Your invoice/payment has already been saved locally."*

---

## 2. Local OpenWA Setup

OpenWA can be run locally using Docker or Node.js.

### Option A: Running with Docker (Recommended)

```bash
docker run -d \
  --name openwa \
  -p 2785:2785 \
  -e ADMIN_KEY="dev_admin_key_finflow_2026" \
  openwa/wa-automate:latest
```

### Option B: Running with NPX / Node CLI

```bash
npx @open-wa/wa-automate \
  --port 2785 \
  --key "dev_admin_key_finflow_2026" \
  --multi-device \
  --headless
```

Verify that the gateway is running:
```bash
curl http://localhost:2785/ping
```

---

## 3. Environment Variables

Configure the following variables in `backend/.env`:

```env
# ==============================================================================
# WHATSAPP INTEGRATION (OpenWA Self-Hosted Gateway)
# ==============================================================================
OPENWA_BASE_URL=http://localhost:2785
OPENWA_ADMIN_API_KEY=dev_admin_key_finflow_2026
OPENWA_TIMEOUT_SECONDS=15
WHATSAPP_PROVIDER=openwa
WHATSAPP_RATE_LIMIT_PER_MINUTE=20
WHATSAPP_COOLDOWN_SECONDS=5
```

### Settings Reference
| Variable | Description | Default |
|---|---|---|
| `OPENWA_BASE_URL` | Base URL of the OpenWA gateway | `http://localhost:2785` |
| `OPENWA_ADMIN_API_KEY` | Secret administrative key for OpenWA | `""` |
| `OPENWA_TIMEOUT_SECONDS` | HTTP request timeout in seconds | `15` |
| `WHATSAPP_PROVIDER` | Active WhatsApp provider (`openwa` or `mock`) | `openwa` |
| `WHATSAPP_RATE_LIMIT_PER_MINUTE` | Max messages sent per store per minute | `20` |
| `WHATSAPP_COOLDOWN_SECONDS` | Minimum seconds between sends for duplicate safety | `5` |

> [!CAUTION]
> Never commit actual production API keys to git. Always use environment variables or secret managers.

---

## 4. Security & Tenant Isolation

Tenant isolation is enforced across three distinct layers:

### 1. Backend Authentication & Store Ownership
The backend extracts the authenticated `user_id` from the Supabase JWT. It verifies ownership or salesman affiliation via the `store_salesmen` and `stores` tables:
```python
# Resolved server-side, never trusted from client payloads:
tenant = await _resolve_tenant_context(user_info)
store_id = tenant["store_id"]
session_id = f"finflow_store_{store_id.replace('-', '')}"
```

### 2. Database Row Level Security (RLS)
The `whatsapp_connections` and `whatsapp_messages` tables are protected with strict RLS policies:
```sql
CREATE POLICY "Users can view whatsapp connections for their stores"
    ON whatsapp_connections FOR SELECT
    USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = (SELECT auth.uid())
            UNION
            SELECT store_id FROM store_salesmen WHERE user_id = (SELECT auth.uid())
        )
    );
```

### 3. Gateway-Level Session Namespacing
Sessions are strictly prefixed with `finflow_store_` and the sanitized UUID of the store, ensuring OpenWA keeps state directories completely segregated on disk.

---

## 5. WhatsApp Connection Flow

To connect a business WhatsApp number to FinFlow:

1. Navigate to **Settings** (`/settings?tab=whatsapp`) or click the **WhatsApp** tab.
2. If disconnected, click **Connect WhatsApp**.
3. The backend initializes a dedicated OpenWA session for the active store and requests a QR code.
4. A QR code appears on screen with real-time polling.
5. On your mobile phone:
   - Open **WhatsApp**
   - Tap **Settings** (or three dots) &rarr; **Linked Devices** &rarr; **Link a Device**
   - Point your camera at the QR code on the screen.
6. Once scanned, OpenWA transitions to `CONNECTED`.
7. FinFlow updates the database state to `connected` and displays:
   - 🟢 **WhatsApp Connected**
   - Connected phone number and profile name
   - Last connected timestamp
   - Audit trail of dispatched messages

---

## 6. Supported Operations

### A. Sending Tax Invoices (`/api/v1/whatsapp/send-invoice`)
- Triggered from **Sales Invoice Directory** (Row Actions &rarr; *Send via WhatsApp*) or automatically after invoice creation.
- Reuses FinFlow's PDF engine (`generateInvoicePDF`) with `{ action: 'base64' }`.
- Automatically normalizes Indian phone numbers (e.g. `98765 43210` &rarr; `+91 98765 43210` &rarr; `919876543210@c.us`).
- Dispatches a formatted message detailing:
  - Total amount
  - Amount paid
  - Remaining balance due
  - Due date
  - Attached PDF invoice document

### B. Sending Payment Receipts (`/api/v1/whatsapp/send-receipt`)
- Triggered from **Universal Payment In Dialog** or **POS Receipt Modal**.
- Displays voucher number (`REC-2026...`), amount received, settled invoice number, and remaining account balance.
- Attaches the receipt PDF or thermal voucher.
- Non-blocking: saving payment records is finalized before WhatsApp transmission.

### C. Sending Outstanding Reminders (`/api/v1/whatsapp/send-reminder`)
- Triggered from **Detailed Party Ledger** or **Party Reports**.
- Injects authoritative ledger closing balance directly from double-entry accounting records.
- If gateway is disconnected, provides seamless fallback to `https://wa.me/...`.

### D. Custom / Test Messages (`/api/v1/whatsapp/send-message` and `/test-message`)
- Allows the business owner to test connectivity or dispatch ad-hoc customer notifications with message logging.

---

## 7. Audit Trail & Message Logging

Every outbound WhatsApp message is recorded in the `whatsapp_messages` table:

| Field | Description |
|---|---|
| `store_id` | Business store UUID |
| `message_type` | `invoice`, `receipt`, `reminder`, `order_confirmation`, `custom` |
| `customer_phone` | Destination phone in international format |
| `provider_message_id` | Gateway delivery message ID |
| `status` | `sent`, `delivered`, `failed` |
| `error_message` | Sanitized error reason if failed |
| `sent_at` | UTC timestamp |

This data powers the **Delivery Audit Log** in Settings &rarr; WhatsApp and provides compliance records for financial accounting.

---

## 8. Duplicate Protection & Idempotency

To prevent accidental double-clicks or browser refreshes from spamming customers:
1. **Partial Unique Indexes**: Supabase database enforces unique partial index on `(invoice_id, message_type)` where status is `'sent'`.
2. **Backend Cooldown**: `WhatsAppService` rejects duplicate send requests for the same entity within `WHATSAPP_COOLDOWN_SECONDS` unless `force_resend=True` is explicitly passed by the user.

---

## 9. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **QR Code Not Showing** | OpenWA container unreachable or offline | Verify `OPENWA_BASE_URL` in `.env` and run `curl http://localhost:2785/ping`. |
| **"Authentication failed"** | `OPENWA_ADMIN_API_KEY` mismatch | Ensure the key configured in `.env` matches the `ADMIN_KEY` environment variable in the OpenWA container. |
| **"Phone number invalid"** | Incorrect formatting or missing digits | Indian phone numbers must be 10 digits starting with 6, 7, 8, or 9. FinFlow automatically handles prefixing `91`. |
| **WhatsApp Disconnected** | Phone unlinked or session logged out | Go to **Settings &rarr; WhatsApp**, click **Disconnect**, then click **Connect WhatsApp** to regenerate a fresh QR code. |
| **Rate limit exceeded** | Sent more than 20 messages/minute | Wait 60 seconds. FinFlow enforces rate limiting to protect business numbers from being banned by WhatsApp anti-spam filters. |

---

## 10. Future Meta Cloud API Migration Strategy

The system is designed with a clean provider abstraction:

```python
class WhatsAppProvider(ABC):
    async def create_session(self, session_id: str) -> WhatsAppSessionInfo: ...
    async def get_session(self, session_id: str) -> WhatsAppSessionInfo: ...
    async def send_text(self, session_id: str, to_phone: str, text: str) -> WhatsAppMessageResult: ...
    async def send_document(self, session_id: str, to_phone: str, file_base64: str, filename: str, caption: Optional[str] = None) -> WhatsAppMessageResult: ...
```

To migrate or add the official **Meta WhatsApp Cloud API**:
1. Implement `MetaCloudProvider(WhatsAppProvider)` in `backend/src/services/whatsapp/meta_provider.py`.
2. Map Meta Cloud's Graph API endpoints (templates, media uploads, webhooks).
3. Set `WHATSAPP_PROVIDER=meta` in `backend/.env`.
4. Zero changes will be required in invoice, payment, POS, or party ledger components.
