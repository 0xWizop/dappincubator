# ChainScout.ai

Cross-chain DApp analytics and trend prediction platform. Track adoption metrics, spot rising stars, and get AI-powered breakout alerts across Ethereum, Base, Solana, Arbitrum, Optimism, Polygon, and BNB Chain.

## 🚀 Features

- **DApp Indexer Engine**: Daily aggregation from DappRadar, DeFiLlama, and blockchain explorers
- **Trend Scoring Algorithm**: Proprietary TREND_SCORE based on wallet growth, tx velocity, and social signals
- **AI Breakout Predictor**: Classifies dApps as Dormant, Rising, Breakout, or Declining
- **Real-time Dashboard**: Modern SaaS UI with filters, leaderboards, and watchlists
- **Smart Alerts**: Customizable notifications for breakouts and growth thresholds
- **Subscription Tiers**: Free, Pro ($29/mo), and Enterprise
- **API Access**: REST API for programmatic data access

## 📁 Project Structure

```
chainscout/
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/        # App Router pages
│   │   ├── components/ # React components
│   │   └── lib/        # Utilities and API client
├── backend/            # Express.js API server
│   ├── src/
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   ├── jobs/       # Cron jobs
│   │   └── integrations/ # External API clients
│   └── prisma/         # Database schema
└── shared/             # Shared types
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn

### 1. Clone and Install

```bash
cd chainscout

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

### 2. Environment Setup

Copy the environment templates:

```bash
# Backend
cp backend/.env.example backend/.env

# Add your API keys to backend/.env:
# - DAPPRADAR_API_KEY
# - ETHERSCAN_API_KEY
# - STRIPE_SECRET_KEY
# - etc.
```

### 3. Database Setup

```bash
cd backend

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start Development Servers

Terminal 1 (Backend):
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 5. Access the App

- **Frontend**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **API**: http://localhost:3001/api/dapps

#### Demo Credentials
- Email: `demo@chainscout.ai`
- Password: `password123`

## 📊 API Endpoints

### Public Endpoints (require API key)

```
GET /api/v1/dapps                 # List dApps with filters
GET /api/v1/dapps/:slug           # Get single dApp
GET /api/v1/leaderboard           # Get ranked leaderboard
```

### Authenticated Endpoints

```
POST /api/auth/register           # User registration
POST /api/auth/login              # User login
GET  /api/auth/me                 # Current user

GET  /api/dapps                   # List dApps (with pagination)
GET  /api/dapps/:id               # DApp details
GET  /api/dapps/leaderboard       # Leaderboards

GET  /api/alerts                  # User's alerts
POST /api/alerts                  # Create alert
DELETE /api/alerts/:id            # Delete alert

POST /api/billing/create-checkout # Stripe checkout
POST /api/billing/portal          # Billing portal
```

## 🔧 Configuration

### Stripe Setup

1. Create products in Stripe Dashboard:
   - Pro: $29/month
   - Enterprise: Custom

2. Add price IDs to `.env`:
   ```
   STRIPE_PRICE_PRO=price_xxx
   STRIPE_PRICE_ENTERPRISE=price_xxx
   ```

3. Set up webhook endpoint:
   - URL: `https://yourdomain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Cron Jobs

The following jobs run automatically:

| Job | Schedule | Description |
|-----|----------|-------------|
| dApp Indexing | Daily 00:00 UTC | Fetches data from external APIs |
| Trend Scores | Daily 01:00 UTC | Calculates trend scores and AI signals |
| Alert Evaluation | Hourly | Checks alerts and sends notifications |

## 🚀 Deployment

### Backend (Railway/Render/Fly.io)

```bash
cd backend
npm run build
npm start
```

Required environment variables:
- `DATABASE_URL` (PostgreSQL connection string)
- `REDIS_URL` (Redis connection string)
- All API keys from `.env.example`

### Frontend (Vercel)

```bash
cd frontend
npm run build
```

Set `NEXT_PUBLIC_API_URL` to your deployed backend URL.

## 📝 Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- React

**Backend:**
- Node.js + Express
- PostgreSQL + Prisma
- Redis (caching)
- Stripe (payments)

**Data Sources:**
- DeFiLlama API
- Blockchain Explorers (Etherscan, etc.)
- DappRadar API

## 📄 License

MIT
