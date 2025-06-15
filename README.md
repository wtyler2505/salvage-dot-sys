# Salvage Parts AI Tracker

## Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Netlify CLI

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

3. **IMPORTANT: Start the development server correctly**
```bash
npm run dev
```

**Do NOT use `npm run dev:vite` directly** - this only starts the frontend and will cause "Failed to fetch" errors when trying to access API functions.

The `npm run dev` command:
- Starts Netlify Dev server on http://localhost:3000
- Serves the Vite frontend on http://localhost:5173
- Serves Netlify Functions on http://localhost:3000/.netlify/functions
- Proxies API calls correctly between frontend and functions

### Development Commands

- `npm run dev` - Start full development environment (frontend + functions)
- `npm run dev:vite` - Start only Vite frontend (will break API calls)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Troubleshooting

**"Failed to fetch" errors:**
- Make sure you're using `npm run dev`, not `npm run dev:vite`
- Check that http://localhost:3000 is accessible
- Verify your API keys are set in .env

**Functions not working:**
- Ensure Netlify CLI is installed: `npm install -g netlify-cli`
- Check that functions are in `netlify/functions/` directory
- Verify function exports are correct

### API Endpoints

When running `npm run dev`, functions are available at:
- http://localhost:3000/.netlify/functions/parts-crud
- http://localhost:3000/.netlify/functions/projects-crud  
- http://localhost:3000/.netlify/functions/ai-research-part

The frontend automatically detects dev mode and uses the correct base URL.