require('./dns-override');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
let mongoConnectionPromise = null;

function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  if (mongoConnectionPromise) {
    return mongoConnectionPromise;
  }

  mongoConnectionPromise = mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    tlsAllowInvalidCertificates: true
  })
    .then(connection => {
      console.log('MongoDB connected');
      return connection;
    })
    .catch(err => {
      mongoConnectionPromise = null;
      throw err;
    });

  return mongoConnectionPromise;
}

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files (frontend + uploads)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/mess', require('./routes/mess'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/dining', require('./routes/dining'));
app.use('/api/polls', require('./routes/poll'));

// cron job: cleanup resolved lost & found items after 1 day
if (!process.env.VERCEL) {
  cron.schedule('0 * * * *', async () => {
    try {
      const LostFound = require('./models/LostFound');
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await LostFound.deleteMany({
        status: 'resolved',
        resolvedAt: { $lt: cutoff }
      });
      if (result.deletedCount > 0) {
        console.log(`[Cron] Cleaned up ${result.deletedCount} resolved lost & found posts`);
      }
    } catch (err) {
      console.error('[Cron] Cleanup error:', err.message);
    }
  });
}

// catch-all: send frontend for non-api routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// connect DB and start server
const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;
