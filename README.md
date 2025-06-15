# Salvage Parts AI Tracker

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Netlify CLI (install with `npm install -g netlify-cli`)

### Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Fill in your API keys in .env
```

3. **🚨 CRITICAL: Always use the correct development command**

```bash
npm run dev
```

**⚠️ COMMON MISTAKE: Never use `npm run dev:vite` directly**

This will cause "Failed to fetch" and 404 errors because:
- `npm run dev:vite` only starts the frontend on http://localhost:5173
- API functions are NOT available when using Vite directly
- You'll get 404 errors for all API calls

**✅ CORRECT: Use `npm run dev`**

This command:
- Starts Netlify Dev server on http://localhost:3000 ← **Use this URL**
- Serves the Vite frontend internally on http://localhost:5173
- Serves Netlify Functions on http://localhost:3000/.netlify/functions
- Proxies API calls correctly between frontend and functions

### Development Commands

- `npm run dev` - **Primary command**: Start full environment (frontend + functions)
- `npm run dev:vite` - ❌ Frontend only (will break API calls)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Troubleshooting

**❌ "Failed to fetch" or 404 errors:**
1. **Check your URL**: Make sure you're using http://localhost:3000, NOT http://localhost:5173
2. **Check your command**: Make sure you ran `npm run dev`, NOT `npm run dev:vite`
3. **Restart properly**: Kill all processes and run `npm run dev` again
4. **Verify API keys**: Check that all required keys are set in .env

**❌ Edge Functions setup error:**
This error can be safely ignored. The project doesn't use Edge Functions. If it persists:
1. Update Netlify CLI: `npm install -g netlify-cli@latest`
2. The error won't affect regular Netlify Functions

**❌ Functions not working:**
- Ensure you're accessing http://localhost:3000 (not 5173)
- Check that functions exist in `netlify/functions/` directory
- Verify your .env file has all required API keys
- Look for function logs in terminal

### API Endpoints

**✅ When running `npm run dev` correctly:**
Functions are available at:
- http://localhost:3000/.netlify/functions/parts-crud
- http://localhost:3000/.netlify/functions/projects-crud  
- http://localhost:3000/.netlify/functions/ai-research-part

**❌ When using Vite directly (localhost:5173):**
- Functions are NOT available
- All API calls will return 404 errors
- App will be broken

### Quick Start Checklist

1. ✅ Install Netlify CLI: `npm install -g netlify-cli`
2. ✅ Install dependencies: `npm install`
3. ✅ Copy environment: `cp .env.example .env`
4. ✅ Fill in your API keys in .env
5. ✅ Start dev server: `npm run dev`
6. ✅ Open http://localhost:3000 (NOT 5173)
7. ✅ Verify API calls work by checking browser network tab

### Environment Variables Required

Make sure these are set in your .env file:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `MEM0_API_KEY`
- `PERPLEXITY_API_KEY`

Without these, the functions will fail even if the server is running correctly.