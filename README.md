# GiayCung API

REST API for the GiayCung platform — built with Express.js, TypeScript, and MongoDB, deployed on Vercel serverless.

## Stack

- **Runtime**: Node.js >= 18
- **Framework**: Express.js + TypeScript
- **Database**: MongoDB (Mongoose)
- **Deploy**: Vercel (serverless)
- **Auth**: JWT HS256

## Project Structure

```
api/
└── index.ts          ← Vercel entrypoint
src/
├── config/db.ts      ← MongoDB connection (cached)
├── middleware/       ← auth, cors, errorHandler
├── models/           ← Mongoose schemas
├── routes/           ← Express routers
├── controllers/      ← Request handlers
├── services/         ← Business logic / DB queries
└── app.ts            ← Express app setup
server.ts             ← Local dev entry
scripts/              ← seed-admin, migrate
```

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed           # create initial admin account
```

## Development

```bash
npm run dev        # tsx watch (port 3000)
vercel dev         # simulate Vercel serverless locally
```

## Build & Deploy

```bash
npm run build      # compile TypeScript → dist/
vercel --prod      # deploy to Vercel
```

## Testing

```bash
npm test
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET/POST | `/api/products` | Products |
| GET/POST | `/api/orders` | Orders |
| POST | `/api/orders/:id/payment/vietqr` | Generate VietQR payment |
| GET | `/api/orders/:id/payment-status` | Poll payment status |
| POST | `/vqr/api/token_generate` | VietQR callback token |
| POST | `/vqr/bank/api/transaction-sync` | VietQR transaction callback |
| GET/POST | `/api/services` | Services |
| GET/POST | `/api/service-orders` | Service orders |
| GET/POST | `/api/news` | News |
| GET/POST | `/api/contacts` | Contacts |
| GET/POST | `/api/messages` | Messages |

## Environment Variables

See [.env.example](.env.example) for the full list. Required:

- `MONGODB_URI`
- `JWT_SECRET`

VietQR variables are documented in [.env.example](.env.example) and
[docs/vietqr-payment-integration.md](docs/vietqr-payment-integration.md).
