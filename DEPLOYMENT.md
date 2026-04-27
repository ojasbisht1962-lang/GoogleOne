# TrustedHands Deployment Guide - Complete Setup

This guide covers deploying both **Backend (Render)** and **Frontend (Vercel)** for production.

## Overview

- **Backend**: Python/FastAPI → Render.com
- **Frontend**: React → Vercel
- **Database**: MongoDB Atlas
- **Authentication**: Google OAuth 2.0

---

## Prerequisites

1. **GitHub Account** - Code pushed to repository ✅
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
4. **MongoDB Atlas** - Cloud database (free tier available)
5. **Google Cloud Console** - OAuth credentials for production

---

# Part 1: Backend Deployment on Render

## Step-by-Step Backend Deployment

### 1. Set Up MongoDB Atlas (Production Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign in or create a free account
3. Create a new cluster (Free tier is sufficient for testing)
4. Click **"Connect"** on your cluster
5. Choose **"Connect your application"**
### 2. Update Google OAuth for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add authorized JavaScript origins:
   - `https://your-app-name.onrender.com` (backend)
   - `https://your-frontend-name.vercel.app` (frontend)
6. Add authorized redirect URIs:
   - `https://your-frontend-name.vercel.app`
   - `https://your-frontend-name.vercel.app/auth/callback`
7. Save the credentials

--- 2. Update Google OAuth for Production

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add authorized origins:
   - `https://your-app-name.onrender.com`
6. Add authorized redirect URIs:
   - `https://your-frontend-url.vercel.app`
   - `https://your-frontend-url.netlify.app`
7. Save the credentials

---

### 3. Deploy Backend on Render

#### Option A: Using Render Dashboard (Recommended)

1. **Sign Up/Login to Render**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repository
   - Select the `Trusted-Hands` repository

3. **Configure the Service**
   - **Name**: `trustedhands-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn main:app --host 0.0.0.0 --port $PORT
     ```

4. **Add Environment Variables**
   Click **"Advanced"** → **"Add Environment Variable"**
   
   Add the following variables:
   
   | Key | Value | Notes |
   |-----|-------|-------|
   | `MONGODB_URL` | Your MongoDB Atlas connection string | From Step 1 |
   | `SECRET_KEY` | Generate random string | Use: `openssl rand -hex 32` |
   | `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID | From Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | Your Google OAuth Secret | From Google Cloud Console |
   | `GEMINI_API_KEY` | Your Gemini API key | From Google AI Studio |
   | `ALLOWED_ORIGINS` | Your frontend URLs | Example: `https://app.vercel.app,https://app.netlify.app` |
   | `DATABASE_NAME` | `trustedhands` | MongoDB database name |
   | `ALGORITHM` | `HS256` | JWT algorithm |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token expiration time |

5. **Select Plan**
   - Start with **Free tier** for testing
   - Upgrade to paid plan for production

6. **Deploy**
   - Click **"Create Web Service"**
   - Render will automatically build and deploy
   - Wait 5-10 minutes for first deployment

7. **Get Your Backend URL**
   - After deployment, you'll get a URL like:
     ```
     https://trustedhands-backend.onrender.com
     ```
   - Test it by visiting:
     ```
     https://trustedhands-backend.onrender.com/docs
     ```

#### Option B: Using Render Blueprint (render.yaml)

1. The repository includes a `render.yaml` file in the backend folder
2. In Render dashboard, select **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will automatically detect and use the configuration
5. Add environment variables manually in the dashboard

---

### 4. Verify Deployment

1. **Check API Documentation**
   - Visit: `https://your-backend-url.onrender.com/docs`
   - You should see the FastAPI Swagger UI

2. **Test Health Endpoint**
   ```bash
   curl https://your-backend-url.onrender.com/
   ```

3. **Check Logs**
   - In Render dashboard, go to your service
   - Click **"Logs"** tab
   - Look for any errors

---

### 5. Update Frontend Configuration

Update your frontend `.env` file with the new backend URL:

```env
REACT_APP_API_BASE_URL=https://trustedhands-backend.onrender.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_GEMINI_API_KEY=your-gemini-api-key
```

---

## Important Notes

### Free Tier Limitations
- **Cold Starts**: Free tier services spin down after 15 minutes of inactivity
- **First request** after inactivity takes 30-60 seconds to wake up
- Upgrade to paid plan ($7/month) for always-on service

### CORS Configuration
Make sure your backend allows your frontend domain:
- Update `ALLOWED_ORIGINS` environment variable
- Include all frontend URLs (with https://)

### Database Connection
- Use MongoDB Atlas (not local MongoDB)
- Whitelist all IPs (0.0.0.0/0) in MongoDB Network Access
- Use the connection string with username/password

### Auto-Deploy
- Render automatically deploys when you push to the `main` branch
- You can disable auto-deploy in service settings

---

## Troubleshooting

### Issue: Service won't start
**Solution**: Check logs for errors
- Missing environment variables
- Wrong Python version
- Dependency installation failures

### Issue: MongoDB connection failed
**Solution**: 
- Verify MongoDB Atlas connection string
- Check Network Access whitelist (0.0.0.0/0)
- Ensure username/password are correct

### Issue: CORS errors
**Solution**:
- Add your frontend URL to `ALLOWED_ORIGINS`
- Use https:// (not http://)
- Include the full URL without trailing slash

### Issue: Google OAuth not working
**Solution**:
- Update authorized origins in Google Cloud Console
- Add both backend and frontend URLs
- Verify Client ID and Secret are correct

### Issue: 502 Bad Gateway
**Solution**:
- Check if service is starting correctly
- Look at logs for startup errors
- Verify `PORT` environment variable is used correctly

---

## Production Checklist

Before going live:

- [ ] Set up MongoDB Atlas with proper access controls
- [ ] Generate strong SECRET_KEY
- [ ] Configure Google OAuth for production URLs
- [ ] Set up proper CORS origins
- [ ] Test all API endpoints
- [ ] Enable auto-deploy on main branch
- [ ] Set up monitoring/alerts
- [ ] Consider upgrading to paid plan for better performance
- [ ] Add custom domain (optional)
- [ ] Set up SSL certificate (automatic on Render)

---

## Upgrading to Paid Plan

**Benefits**:
- No cold starts (always-on)
- Better performance
- More resources
- Priority support

**Cost**: Starting at $7/month

**How to Upgrade**:
1. Go to your service in Render dashboard
2. Click **"Settings"** → **"Billing"**
3. Select a paid plan

---

## Custom Domain Setup (Optional)

1. In Render dashboard, go to your service
2. Click **"Settings"** → **"Custom Domain"**
3. Add your domain (e.g., `api.trustedhands.com`)
4. Update your DNS records with the provided CNAME
5. Render automatically provisions SSL certificate

---

## Monitoring

**Render provides**:
- Real-time logs
- CPU and memory usage
- Request metrics
- Error tracking

**Access Logs**:
1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. View real-time logs or download historical logs

---

## Support

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
- **TrustedHands Support**: support@trustedhands.com

---

## Next Steps

After backend deployment, proceed to **Part 2: Frontend Deployment**

See `frontend/DEPLOYMENT_VERCEL.md` for detailed Vercel deployment instructions.

---

# Part 2: Frontend Deployment on Vercel

## Quick Setup

1. **Sign up/Login to Vercel** at [vercel.com](https://vercel.com)
2. **Import GitHub repository** → Select `Trusted-Hands`
3. **Configure Root Directory**: Set to `frontend`
4. **Add Environment Variables**:
   - `REACT_APP_API_BASE_URL`: Your Render backend URL
   - `REACT_APP_GOOGLE_CLIENT_ID`: Google OAuth Client ID
   - `REACT_APP_GEMINI_API_KEY`: Gemini API key
5. **Deploy** and wait 2-3 minutes

## Post-Deployment

After frontend is live:

1. **Update Backend CORS**:
   - Go to Render dashboard → Environment
   - Update `ALLOWED_ORIGINS` to include your Vercel URL
   - Format: `https://your-app.vercel.app,https://backend.onrender.com`
   - Save and redeploy

2. **Update Google OAuth**:
   - Add Vercel URL to authorized JavaScript origins
   - Add Vercel URL to authorized redirect URIs

3. **Test Complete Application**:
   - Visit your Vercel URL
   - Test login with Google
   - Test all features (booking, chat, etc.)

For detailed frontend deployment instructions, see: **`frontend/DEPLOYMENT_VERCEL.md`**

---

## Complete Production Checklist

Backend (Render):
- [ ] MongoDB Atlas configured with connection string
- [ ] All environment variables set in Render
- [ ] Google OAuth origins updated
- [ ] CORS configured with frontend URL
- [ ] Backend service running successfully
- [ ] Test API at https://your-backend.onrender.com/docs

Frontend (Vercel):
- [ ] Environment variables set in Vercel
- [ ] Frontend deployed successfully
- [ ] API connection working
- [ ] Google OAuth working from frontend
- [ ] All pages loading correctly
- [ ] Mobile responsiveness verified

Final Verification:
- [ ] Complete user flow test (register → login → book service)
- [ ] Chat functionality working
- [ ] Admin dashboard accessible
- [ ] Payment flow working (if applicable)
- [ ] Error handling working properly
- [ ] Performance acceptable (check cold starts)

---

**Congratulations! Your backend is now live on Render! 🚀**
