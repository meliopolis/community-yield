# Vercel Deployment Guide

This project uses a monorepo structure with the frontend in a subdirectory. Here's how to deploy it on Vercel:

## Method 1: Vercel Dashboard Configuration (Recommended)

### Steps:
1. Push your code to GitHub
2. Go to Vercel Dashboard and import your GitHub repo
3. Configure the deployment settings:
   - **Root Directory**: Set to `frontend`
   - **Framework Preset**: Select `Vite`
   - **Build Command**: Leave as default or use `npm run build`
   - **Output Directory**: Leave as default (`dist`)
4. Click Deploy

### Environment Variables to Set in Vercel:
```
VITE_WALLETCONNECT_PROJECT_ID=298ef703ac1c99167348056c88b1758c
VITE_TENDERLY_KEY=vR0UtZDFlYsvN199N0-sou2AZ2rEAT22
VITE_TENDERLY_USER=aseem
VITE_TENDERLY_PROJECT=messenger
```

## Method 2: Manual Configuration

If the automatic method doesn't work, configure Vercel manually:

1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

## Method 3: Deploy Frontend Separately

Alternative approach - deploy only the frontend:

1. Create a new repository with just the frontend code
2. Copy the contents of `frontend/` to the root of the new repo
3. Deploy the new repo normally on Vercel

## Troubleshooting

### Build Issues:
- Ensure Node.js version 18+ is used
- Check that all environment variables are set
- Verify the build works locally: `cd frontend && npm run build`

### Routing Issues:
- The `vercel.json` includes rewrites for SPA routing
- All routes should redirect to `/` for client-side routing

### Asset Loading:
- Static assets should be served from `/assets/` with proper caching headers
- The configuration includes cache headers for assets

## Files Created for Deployment:

- `vercel.json` - Main Vercel configuration
- `.vercelignore` - Files to ignore during deployment  
- `package.json` (root) - Workspace configuration
- `DEPLOYMENT.md` - This file with instructions

## Alternative: Use the Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Set framework to "vite" when prompted
# Set root directory to "frontend" when prompted
```