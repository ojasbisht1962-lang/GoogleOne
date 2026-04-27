# TrustedHands Frontend - Vercel Deployment Guide

## Prerequisites
- Vercel Account (sign up at [vercel.com](https://vercel.com))
- GitHub Repository (already set up)
- Backend deployed on Render

---

## Step-by-Step Vercel Deployment

### 1. Prepare Environment Variables

Before deploying, you'll need these values:
- **Backend URL**: Get from Render (e.g., `https://trustedhands-backend.onrender.com`)
- **Google Client ID**: From Google Cloud Console
- **Gemini API Key**: From Google AI Studio

---

### 2. Update Google OAuth for Vercel

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add authorized JavaScript origins:
   ```
   https://your-app-name.vercel.app
   ```
5. Add authorized redirect URIs:
   ```
   https://your-app-name.vercel.app
   https://your-app-name.vercel.app/auth/callback
   ```
6. Save changes

---

### 3. Deploy on Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Sign Up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click **"Sign Up"** or **"Login"**
   - Choose **"Continue with GitHub"**

2. **Import Your Project**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select `Trusted-Hands` repository
   - Click **"Import"**

3. **Configure Project**
   - **Framework Preset**: Create React App (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `build` (auto-filled)
   - **Install Command**: `npm install` (auto-filled)

4. **Add Environment Variables**
   Click **"Environment Variables"** and add:

   | Name | Value | Example |
   |------|-------|---------|
   | `REACT_APP_API_BASE_URL` | Your Render backend URL | `https://trustedhands-backend.onrender.com` |
   | `REACT_APP_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | `123456789-abc.apps.googleusercontent.com` |
   | `REACT_APP_GEMINI_API_KEY` | Your Gemini API key | `AIzaSy...` |

   **Important**: 
   - Add for all environments (Production, Preview, Development)
   - Don't include trailing slash in API_BASE_URL

5. **Deploy**
   - Click **"Deploy"**
   - Wait 2-3 minutes for deployment
   - You'll get a URL like: `https://your-app-name.vercel.app`

#### Option B: Using Vercel CLI

1. **Install Vercel CLI**
   ```powershell
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```powershell
   vercel login
   ```

3. **Navigate to Frontend**
   ```powershell
   cd frontend
   ```

4. **Deploy**
   ```powershell
   vercel
   ```
   
5. **Follow Prompts**
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: trustedhands-frontend
   - Directory: ./ (current directory)
   - Override settings: No

6. **Add Environment Variables**
   ```powershell
   vercel env add REACT_APP_API_BASE_URL
   vercel env add REACT_APP_GOOGLE_CLIENT_ID
   vercel env add REACT_APP_GEMINI_API_KEY
   ```

7. **Deploy to Production**
   ```powershell
   vercel --prod
   ```

---

### 4. Update Backend CORS Settings

1. Go to Render Dashboard
2. Open your backend service
3. Go to **Environment** tab
4. Update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   https://your-app-name.vercel.app,https://trustedhands-backend.onrender.com
   ```
5. Save and redeploy backend

---

### 5. Verify Deployment

1. **Open Your App**
   - Visit: `https://your-app-name.vercel.app`

2. **Test Login**
   - Try logging in with Google
   - Check if authentication works

3. **Test API Connection**
   - Check browser console for errors
   - Verify data loads correctly

4. **Check All Pages**
   - Navigate through different routes
   - Test customer, tasker, and admin flows

---

## Configuration Files Created

### `vercel.json`
Located in `frontend/vercel.json` - Configures:
- Build settings
- Routing for SPA (Single Page Application)
- Static file serving

---

## Important Notes

### Custom Domain (Optional)
1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain (e.g., `trustedhands.com`)
4. Update DNS records as instructed
5. SSL certificate is automatic

### Environment Variables
- Never commit `.env` files to GitHub
- Use Vercel dashboard to manage production variables
- Can be different for Preview and Production environments

### Auto-Deploy
- Vercel automatically deploys on every push to `main` branch
- Preview deployments created for Pull Requests
- Can configure branch-specific deployments

### Performance
- Vercel provides:
  - Global CDN
  - Automatic HTTPS
  - Edge caching
  - Zero-config deployment

---

## Troubleshooting

### Issue: Build fails
**Solution**: 
- Check build logs in Vercel dashboard
- Ensure all dependencies in `package.json`
- Verify environment variables are set

### Issue: API calls fail
**Solution**:
- Check `REACT_APP_API_BASE_URL` is correct
- Verify CORS settings in backend
- Check backend is running on Render

### Issue: Blank page after deployment
**Solution**:
- Check browser console for errors
- Verify all environment variables are set
- Check if routing is configured correctly

### Issue: Google OAuth not working
**Solution**:
- Update Google Cloud Console with Vercel URL
- Check `REACT_APP_GOOGLE_CLIENT_ID` is correct
- Clear browser cache and try again

### Issue: 404 on page refresh
**Solution**:
- Ensure `vercel.json` routing is configured
- Check all routes redirect to `index.html`

---

## Production Checklist

Before going live:

- [ ] Deploy backend on Render
- [ ] Set up MongoDB Atlas
- [ ] Configure Google OAuth with production URLs
- [ ] Add all environment variables in Vercel
- [ ] Update CORS settings in backend
- [ ] Test all features (login, booking, chat, etc.)
- [ ] Test on mobile devices
- [ ] Set up custom domain (optional)
- [ ] Configure analytics (optional)
- [ ] Set up error monitoring (optional)

---

## Monitoring & Analytics

### Vercel Analytics
1. Go to your project in Vercel
2. Click **"Analytics"** tab
3. View:
   - Page views
   - Performance metrics
   - User locations

### Add Error Tracking
Consider adding:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Google Analytics**: User analytics

---

## Updating Your Deployment

### Update Code
```powershell
# Make changes to your code
git add .
git commit -m "Your update message"
git push origin main
```
Vercel automatically redeploys!

### Update Environment Variables
1. Go to Vercel dashboard
2. Select your project
3. Click **"Settings"** → **"Environment Variables"**
4. Edit or add variables
5. Redeploy to apply changes

### Rollback Deployment
1. Go to **"Deployments"** tab
2. Find a previous successful deployment
3. Click **"..."** → **"Promote to Production"**

---

## Cost

**Vercel Pricing**:
- **Hobby Plan**: FREE
  - Unlimited deployments
  - Automatic HTTPS
  - 100 GB bandwidth/month
  - Perfect for small projects

- **Pro Plan**: $20/month
  - Higher bandwidth
  - Team collaboration
  - Advanced analytics
  - Priority support

---

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- **TrustedHands Support**: caretrustedhands@gmail.com

---

**Your frontend is now live on Vercel! 🚀**

Next: Test the complete application with both frontend and backend working together!
