# Render Deployment Guide

This repo is already set up for a split deployment:

- Frontend: hosted separately
- Backend API: Render web service from `backend/`
- Database: MongoDB Atlas

## 1. Create the database

Create a MongoDB Atlas database and copy the connection string.

Required tweaks before saving the URI:

- Replace `<username>` and `<password>`
- Use database name `collegebuddy` (or another name if you prefer)
- In Atlas Network Access, allow Render to connect

Example:

```text
mongodb+srv://username:password@cluster.mongodb.net/collegebuddy?retryWrites=true&w=majority
```

## 2. Deploy the backend on Render

In Render:

1. Click `New +`
2. Choose `Blueprint` if you want Render to read `render.yaml`
3. Connect this GitHub repo: `https://github.com/yugantverma0009/CollageBuddy`
4. Confirm the web service name is `collegebuddy-backend`

Render will use:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

## 3. Add environment variables in Render

Set these in the Render service:

- `MONGO_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = any long random secret
- `NODE_ENV` = `production`

## 4. Verify the backend URL

Your frontend config currently expects this backend URL:

```text
https://collegebuddy-backend.onrender.com
```

That is already wired in [vercel.json](/Users/yugantverma/Downloads/clgbuddy/vercel.json:1).

After the Render deploy finishes, open:

```text
https://collegebuddy-backend.onrender.com/api/health
```

Expected response:

```json
{"status":"ok"}
```

## 5. Seed the first admin user

After the database is connected, run this once from the Render shell:

```bash
cd backend
node seed.js
```

Default admin login:

- Email: `admin@college.edu`
- Password: `admin123`

## 6. Frontend connection

The frontend is already configured to send:

- `/api/*` -> Render backend
- `/uploads/*` -> Render backend

So once the backend is live and healthy, the frontend should start working without code changes.

## Important note about uploads

This app stores uploaded files inside `public/uploads/`.
That works locally, but production file storage on a web service is not durable across rebuilds or instance replacement.

If you want note PDFs and uploaded images to persist reliably in production, the next step is moving uploads to cloud storage.
