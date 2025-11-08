# 🚀 Quick Start - Launch Tonight!

## Get Your API Keys First

Before launching, you need these API keys:

1. **OpenAI API Key** (REQUIRED) - Get at https://platform.openai.com/api-keys
2. **Hyperswitch** (for payments) - Sign up at https://hyperswitch.io

## 3-Step Launch Process

### Step 1: Configure API Keys (2 minutes)

Edit `apps/api/.env` and add your OpenAI API key:

```bash
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

For payments, add your Hyperswitch credentials:
```bash
HYPERSWITCH_API_KEY=your_key
HYPERSWITCH_MERCHANT_ID=your_merchant_id
HYPERSWITCH_WEBHOOK_SECRET=your_secret
```

### Step 2: Launch with Docker (1 command!)

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- API server on port 3000

Wait ~30 seconds for services to initialize.

### Step 3: Open the Web Interface

```bash
cd apps/web
pnpm install
pnpm dev
```

Visit http://localhost:5173

## You're Live! 🎉

Your AI platform is now running at:
- **Web App**: http://localhost:5173
- **API**: http://localhost:3000/api

## Test It Works

Try the AI completion demo on the home page, or test the API:

```bash
curl -X POST http://localhost:3000/api/ai/completion \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a sales pitch for an AI platform"}'
```

## Pricing Model

Your platform is ready to generate revenue with:

- **AI Completion API**: $0.10 per request
- **Voice AI Interface**: $0.05 per minute
- **Web Automation**: $0.25 per task

## Next Steps

1. Share http://localhost:5173 with potential customers
2. Set up payment processing with Hyperswitch
3. Deploy to production (see LAUNCH_INSTRUCTIONS.md)

## Troubleshooting

**API won't start?**
- Check OpenAI key is set: `cat apps/api/.env | grep OPENAI_API_KEY`
- View logs: `docker-compose logs api`

**Can't connect to database?**
- Restart services: `docker-compose restart`

**Need help?**
- Check full documentation in LAUNCH_INSTRUCTIONS.md
- View API routes in `apps/api/src/routes/`

---

**You're ready to make revenue tonight!** 💰
