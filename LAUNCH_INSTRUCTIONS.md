# 🚀 Arbi Platform - Launch Instructions

## Quick Start to Revenue Tonight!

### Prerequisites
- Docker and Docker Compose installed
- OpenAI API key (REQUIRED)
- Hyperswitch merchant account (for payment processing)

### Step 1: Configure API Keys

Edit `apps/api/.env` and add your API keys:

```bash
# REQUIRED - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-openai-key

# REQUIRED FOR PAYMENTS - Get from https://hyperswitch.io
HYPERSWITCH_API_KEY=your_hyperswitch_api_key
HYPERSWITCH_MERCHANT_ID=your_merchant_id
HYPERSWITCH_WEBHOOK_SECRET=your_webhook_secret

# Optional (for voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Build All Packages

```bash
pnpm build
```

### Step 4: Launch with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- API server (port 3000)

### Step 5: Start Web Interface

```bash
cd apps/web
pnpm install
pnpm dev
```

Web interface will be available at: http://localhost:5173

### Step 6: Test Your Platform

1. Open http://localhost:5173 in your browser
2. Try the free AI completion demo
3. Test that the API is responding correctly

### Step 7: Start Making Money!

Share your platform URL with customers. Current pricing:

- **AI Completion API**: $0.10 per request
- **Voice AI Interface**: $0.05 per minute
- **Web Automation**: $0.25 per task

### API Endpoints

Your API is now live at http://localhost:3000/api

Available endpoints:
- `POST /api/ai/completion` - AI text completion
- `POST /api/ai/orchestrate` - Multi-agent orchestration
- `POST /api/voice/transcribe` - Speech to text
- `POST /api/voice/synthesize` - Text to speech
- `POST /api/web/navigate` - Web automation
- `POST /api/payment/process` - Process payments

### Testing API

```bash
# Test AI Completion
curl -X POST http://localhost:3000/api/ai/completion \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello, how are you?"}'

# Health Check
curl http://localhost:3000/health
```

### Production Deployment

For production deployment:

1. Update `apps/api/.env`:
   - Set `NODE_ENV=production`
   - Set `PAYMENT_ENV=production`
   - Use strong `SECURITY_KEY`

2. Set up SSL/TLS with reverse proxy (nginx/caddy)

3. Configure domain and DNS

4. Set up monitoring and logging

### Troubleshooting

**API not starting?**
- Check that OpenAI API key is set correctly
- Verify Docker containers are running: `docker-compose ps`

**Database issues?**
- Reset database: `docker-compose down -v && docker-compose up -d`

**Build errors?**
- Clear cache: `pnpm clean && pnpm install`

### Getting API Keys

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Hyperswitch**: https://hyperswitch.io (payment processor)
3. **ElevenLabs**: https://elevenlabs.io (voice synthesis)
4. **Porcupine**: https://picovoice.ai (wake word detection)

### Support

For issues or questions, check the documentation in each package's README.

---

**Ready to launch and make revenue tonight!** 🎉
