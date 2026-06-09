# CollegeBuddy 🎓

A student companion web application designed to help college students manage their academic and social needs.

## Overview

CollegeBuddy is a comprehensive platform that streamlines academic management, social coordination, and college life logistics for students. Whether you need to organize your schedule, connect with peers, or manage academic resources, CollegeBuddy has you covered.


## Tech Stack

### Frontend
- **HTML** (54.5%)
- **JavaScript** (29.8%)
- **CSS** (15.7%)

### Backend
- Node.js / Express (or your specific backend framework)
- Database: [Specify your database - MongoDB, PostgreSQL, etc.]

## Project Structure

```
CollegeBuddy/
├── frontend/          # React/Vue/vanilla JS frontend
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── backend/           # Backend API server
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── .env
│   ├── package.json
│   └── render.yaml
└── README.md
```

---

## 🚀 Deployment Guide

### Prerequisites

Before you begin, ensure you have:
- GitHub account
- Vercel account (free) - https://vercel.com
- Render account (free) - https://render.com
- Node.js installed locally (v14 or higher)

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Your Frontend

1. Navigate to your frontend directory:
```bash
cd frontend
```

2. Ensure your `package.json` includes a build script:
```json
{
  "scripts": {
    "dev": "your-dev-command",
    "build": "your-build-command",
    "start": "your-start-command"
  }
}
```

3. Create `vercel.json` in your frontend root:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "env": {
    "REACT_APP_API_URL": "@react_app_api_url"
  }
}
```

### Step 2: Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Authorize GitHub and select `yugantverma0009/CollegeBuddy`
5. Configure project settings:
   - **Framework Preset**: Select your framework (Next.js, React, Vue, etc.)
   - **Build Command**: Leave as default or specify custom build command
   - **Output Directory**: Specify where your built files are (e.g., `frontend/build`)

### Step 3: Set Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:
```
REACT_APP_API_URL=https://your-backend-url.onrender.com
REACT_APP_API_KEY=your_api_key
```

3. Click **"Deploy"**

### Step 4: Custom Domain (Optional)

1. Navigate to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed

**Vercel Frontend URL**: `https://collegebuddy.vercel.app` (or your custom domain)

---

## Backend Deployment (Render)

### Step 1: Prepare Your Backend

1. Navigate to your backend directory:
```bash
cd backend
```

2. Ensure your `package.json` has:
```json
{
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

3. Create a `render.yaml` in the backend root:
```yaml
services:
  - type: web
    name: collegebuddy-api
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: collegebuddy-db
          property: connectionString
      - key: MONGODB_URI
        scope: build
      - key: JWT_SECRET
        scope: build

databases:
  - name: collegebuddy-db
    dbName: collegebuddy
    user: collegebuddy_user
```

4. Create `.env.example` (DO NOT commit actual `.env`):
```
NODE_ENV=production
PORT=10000
DATABASE_URL=your_database_url
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://collegebuddy.vercel.app
API_KEY=your_api_key
```

5. Update your server configuration to accept environment variables:
```javascript
require('dotenv').config();

const app = require('express')();
const PORT = process.env.PORT || 10000;

// CORS Configuration
app.use(require('cors')({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 2: Connect to Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Select **"Deploy an existing repository"**
4. Connect your GitHub account and select `yugantverma0009/CollegeBuddy`

### Step 3: Configure Web Service

| Setting | Value |
|---------|-------|
| **Name** | `collegebuddy-api` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free (for testing) or Starter ($7/month) |

### Step 4: Add Environment Variables

1. Go to **Environment**
2. Add all variables from `.env.example`:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your database connection string
   - `MONGODB_URI`: Your MongoDB URI
   - `JWT_SECRET`: A secure random string
   - `CORS_ORIGIN`: `https://collegebuddy.vercel.app`
   - `API_KEY`: Your API key

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait for deployment to complete (2-5 minutes)

**Render Backend URL**: `https://collegebuddy-api.onrender.com`

### Step 6: Database Setup (if using Render Postgres)

1. Click **"New +"** → **"PostgreSQL"**
2. Set up database credentials
3. Copy connection string to backend environment variables
4. Run migrations: `npm run migrate` (if applicable)

---

## 🔗 Connect Frontend to Backend

Once both are deployed, update your frontend environment variables:

### In Frontend (Vercel)

Go to **Settings** → **Environment Variables** and update:
```
REACT_APP_API_URL=https://collegebuddy-api.onrender.com
```

Redeploy frontend for changes to take effect.

---

## 🔄 CI/CD Pipeline

### Automatic Deployments

**Vercel**: Automatically deploys on every push to `main` branch
**Render**: Automatically deploys on every push to configured branch

To control deployments, use environment variable `AUTO_DEPLOY=false` and manually trigger via dashboard.

---

## 📋 Environment Variables Checklist

### Frontend (.env.local or in Vercel)
- [ ] `REACT_APP_API_URL` - Backend URL
- [ ] `REACT_APP_API_KEY` - API key (if needed)

### Backend (.env or in Render)
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set to `10000` for Render
- [ ] `DATABASE_URL` - Database connection string
- [ ] `MONGODB_URI` - MongoDB URI (if using MongoDB)
- [ ] `JWT_SECRET` - Secret for JWT tokens
- [ ] `CORS_ORIGIN` - Frontend URL
- [ ] `API_KEY` - API key for services

---

## 🐛 Troubleshooting

### Frontend Issues

**Build fails on Vercel:**
- Check `package.json` build script
- Verify all dependencies are in `package.json`
- Check for environment variable references

**Blank page or errors:**
- Open browser DevTools → Console
- Check network requests to backend
- Verify `REACT_APP_API_URL` is correct

### Backend Issues

**Service won't start:**
- Check logs in Render dashboard
- Verify `start` script in `package.json`
- Ensure `PORT` is set to `10000`

**Database connection errors:**
- Verify `DATABASE_URL` or `MONGODB_URI`
- Check database credentials
- Ensure database is running

**CORS errors:**
- Update `CORS_ORIGIN` in backend
- Ensure frontend URL matches exactly
- Restart backend service

**Build times out:**
- Optimize `package.json` dependencies
- Use `npm ci` instead of `npm install` in build
- Consider upgrading from Free to Starter plan

---

## 📊 Monitoring & Logs

### View Frontend Logs
1. Go to Vercel Dashboard → Project → Deployments
2. Click on deployment → View Logs

### View Backend Logs
1. Go to Render Dashboard → Service → Logs
2. Real-time logs appear in the panel

---

## 🚀 Performance Tips

- **Frontend**: Use Vercel Analytics to monitor performance
- **Backend**: Monitor Render CPU and memory usage
- Enable caching headers in backend responses
- Use CDN for static assets (Vercel handles this automatically)
- Consider upgrading database plan if experiencing slowness

---

## 💡 Best Practices

1. **Never commit `.env` files** - Use `.env.example` instead
2. **Use branch protection** - Require PR reviews before merging
3. **Regular backups** - Export database periodically
4. **Monitor costs** - Vercel and Render free tiers are generous
5. **Update dependencies** - Keep packages up to date for security

---

## 📝 Local Development

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yugantverma0009/CollegeBuddy.git
cd CollegeBuddy
```

2. Setup backend:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with local credentials
npm run dev
```

3. In another terminal, setup frontend:
```bash
cd frontend
npm install
npm start
```

4. Open `http://localhost:3000`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📞 Support

For issues or questions:
- Open a GitHub Issue
- Contact: [your-email@example.com]
- Documentation: [link-to-docs]

---

## 🎯 Deployment Checklist

- [ ] Frontend code pushed to GitHub
- [ ] Backend code pushed to GitHub
- [ ] Environment variables configured in Vercel
- [ ] Environment variables configured in Render
- [ ] Database created and connected (if applicable)
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Render
- [ ] Frontend and backend communicate successfully
- [ ] All endpoints tested in production
- [ ] Monitoring and logging enabled

---

**Last Updated**: June 9, 2026
**Deployment Status**: ✅ Ready for Production

---

*CollegeBuddy - Making college easier, one feature at a time! 🎓*
