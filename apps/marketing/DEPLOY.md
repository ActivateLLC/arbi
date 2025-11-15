# Deploy ARBI Marketing Site to Vercel

**Status:** Dependencies installed ✅ | Ready to deploy!

---

## 🚀 Quick Deploy (2 Commands)

### Step 1: Login to Vercel

```bash
vercel login
```

This will:
- Open your browser
- Ask you to authenticate
- Store credentials locally

### Step 2: Deploy to Production

```bash
cd /home/user/arbi/apps/marketing
vercel --prod
```

That's it! You'll get a URL like: `https://arbi-marketing.vercel.app`

---

## 📋 What I've Already Done:

✅ Built professional landing page
✅ Created beta signup flow
✅ Configured Vercel deployment
✅ Installed all dependencies (pnpm install)
✅ Committed and pushed to GitHub

**All you need to do:** Login and deploy!

---

## 🔧 Deployment Configuration:

The site is configured in `/apps/marketing/vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm turbo build --filter=@arbi/marketing",
  "installCommand": "cd ../.. && pnpm install"
}
```

This tells Vercel:
- You're using Next.js
- How to build in a monorepo context
- How to install dependencies

---

## 🌐 After Deployment:

### You'll Get:

1. **Production URL:** `https://arbi-marketing-xxx.vercel.app`
2. **Preview URL:** Every git push gets a preview
3. **Auto-deployments:** Future commits auto-deploy

### Set Custom Domain (Optional):

In Vercel dashboard:
1. Go to your project
2. Settings → Domains
3. Add `arbi.creai.dev` or buy new domain
4. Follow DNS instructions

---

## 🐛 Troubleshooting:

### "Command not found: vercel"

Already installed at `/opt/node22/bin/vercel` ✅

### "Not logged in"

Run: `vercel login`

### Build fails

Check build logs in Vercel dashboard. The build has been tested locally and works.

---

## 📊 Expected Results:

Once deployed, you'll have:
- Live landing page at your Vercel URL
- SSL certificate (HTTPS) automatically
- Global CDN for fast loading
- Automatic preview deployments for PRs

---

## 🎉 Next Steps After Deploy:

1. **Test signup flow** - Fill out form, verify it works
2. **Share URL** - Send to friends for feedback
3. **Add signup API** - Connect to database (see BETA_LAUNCH_GUIDE.md)
4. **Set up domain** - Configure custom domain
5. **Launch!** - Post on social media

---

**Ready? Run these 2 commands:**

```bash
vercel login
vercel --prod
```

You'll be live in 5 minutes! 🚀
