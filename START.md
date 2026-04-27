# College Buddy App - Setup Guide

## 1. Install dependencies
```
cd backend
npm install
```

## 2. Create Admin account (run ONCE)
```
cd backend
node seed.js
```
Admin login: admin@college.edu / admin123

## 3. Start the server
```
cd backend
npm start
```
or for development (auto-restart):
```
npm run dev
```

## 4. Open browser
```
http://localhost:5000
```

## 5. Deployment Notes (Production)
- Set `MONGO_URI` and `JWT_SECRET` in backend environment variables.
- Keep frontend and backend on same domain if possible (this project serves frontend from backend already).
- `public/js/app.js` auto-detects API URL:
  - local: `http://localhost:5000/api`
  - production: `${window.location.origin}/api`
- Optional override: set `window.CB_API_BASE` before loading `app.js` if hosting API separately.
- Start command for production:
```
cd backend
npm start
```

---

## Role Guide

| Role    | Can Do |
|---------|--------|
| Admin   | Create teacher/CR accounts, manage all users, delete anything |
| Teacher | Cancel/reschedule classes, mark attendance, receive poll messages |
| CR      | Set mess menu, set/edit timetable, create polls |
| Student | Register self, upload notes, buy notes, post lost & found, vote in polls, add dining places |

## Points System
- Upload a note → +5 points
- Someone buys your note → +price points
- Add a dining place → +10 points
- Write a review → +3 points

## First Steps After Setup
1. Login as admin
2. Go to Admin Panel → Create Teacher accounts
3. Create CR accounts for each class (e.g. CSE 1Y CR)
4. Students register themselves on /register.html
5. CR sets up timetable and mess menu
