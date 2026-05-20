# 🏋️ Fitness Coach AI

Your personal fitness & nutrition coach — built with Next.js + Claude AI.

---

## 🚀 Deploy to Vercel (step by step)

### 1. Install Node.js
Go to https://nodejs.org and download the LTS version. Install it.

### 2. Install dependencies
Open Terminal (Mac) or Command Prompt (Windows), navigate to this folder, then run:
```
npm install
```

### 3. Push to GitHub
- Go to https://github.com and create a free account
- Create a new repository called `fitness-coach`
- Upload this entire folder to it (drag & drop via the GitHub website, or use GitHub Desktop)

### 4. Deploy on Vercel
- Go to https://vercel.com and sign up (use your GitHub account)
- Click **"Add New Project"**
- Import your `fitness-coach` repository
- Before deploying, add your environment variable:
  - Click **"Environment Variables"**
  - Name: `ANTHROPIC_API_KEY`
  - Value: your key from https://console.anthropic.com/api-keys
- Click **Deploy** ✅

### 5. Add to your phone home screen
- Open your Vercel URL (e.g. `fitness-coach.vercel.app`) in Safari on iPhone
- Tap the **Share** icon → **Add to Home Screen**
- Name it "Fitness AI" → tap **Add**

It'll appear as an app icon on your home screen! 🎉

---

## 💻 Run locally (optional)
```
cp .env.example .env.local
# Edit .env.local and add your API key
npm run dev
```
Open http://localhost:3000
