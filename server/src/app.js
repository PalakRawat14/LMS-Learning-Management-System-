const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const initDatabase = require('./config/init');

// Load environment variables
dotenv.config();

// Initialize database
initDatabase();

// CORS configuration
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CLIENT_URL]
  : [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://192.168.1.3:5173",
      "http://192.168.1.3:5174",
      "http://192.168.1.13:5173",
      "http://localhost:5173",
      "http://localhost:5174"
    ];

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const quizRoutes = require('./routes/quizRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const materialRoutes = require('./routes/materialRoutes');
const adminRoutes = require('./routes/adminRoutes');
const subjectRoutes = require('./routes/subjectRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subjects', subjectRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to LMS API' });
});

// Lightweight health endpoint (no DB touch)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Extra lightweight ping (separate from /api/health)
app.get('/api/ping', (req, res) => res.type('text').send('pong'));

// Enhanced full health (includes DB best-effort)
app.get('/api/health/full', async (req, res) => {
  const start = Date.now();
  let dbOk = true;
  try {
    const { sequelize } = require('./models');
    await sequelize.query('SELECT 1');
  } catch (e) {
    dbOk = false;
  }
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'reachable' : 'error',
    uptimeSec: Math.floor(process.uptime()),
    memoryRssMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
    pid: process.pid,
    responseTimeMs: Date.now() - start,
    timestamp: new Date().toISOString()
  });
});

// ---- Dynamic Port Resolution ----
// Supports either a single PORT or a PORT_RANGE like "5000-5010".
// Falls back to default list if not provided.
const requestedPort = parseInt(process.env.PORT, 10) || 5000;
function buildCandidatePorts() {
  if (process.env.PORT_RANGE) {
    const match = /(\d+)-(\d+)/.exec(process.env.PORT_RANGE.trim());
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (end >= start && end - start <= 100) { // safety cap
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
    }
  }
  // Default: requested, + a small ascending window
  return [requestedPort, requestedPort + 1, requestedPort + 2, requestedPort + 3, requestedPort + 4];
}
const candidatePorts = buildCandidatePorts();
let listenAttempt = 0;
let boundPort = null;
let loggedOnce = false;

const startServer = (port) => {
  server.listen(port, '0.0.0.0', () => {  // Changed to 0.0.0.0 to allow external access
    const addr = server.address();
    boundPort = addr.port;
    if (!loggedOnce) {
      console.log(`Server is running on http://${addr.address}:${addr.port}`);
      console.log(`[startup] Candidate ports tried: ${candidatePorts.slice(0, listenAttempt + 1).join(', ')}`);
      loggedOnce = true;
    }
  });
};

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && listenAttempt < candidatePorts.length - 1) {
    console.warn(`[startup] Port ${candidatePorts[listenAttempt]} in use. Retrying on ${candidatePorts[listenAttempt + 1]}...`);
    listenAttempt += 1;
    setTimeout(() => startServer(candidatePorts[listenAttempt]), 300);
  } else {
    console.error('[startup] Failed to bind server:', err);
    process.exit(1);
  }
});

startServer(candidatePorts[listenAttempt]);

// Meta endpoint to expose chosen runtime port (helpful for debugging dynamic resolution)
app.get('/api/meta/port', (req, res) => {
  res.json({ port: boundPort, candidates: candidatePorts });
});

// Diagnostics for unexpected exits
process.on('exit', (code) => {
  console.log('[process exit] code=', code);
});
process.on('SIGTERM', () => {
  console.log('[signal] SIGTERM received');
});
process.on('SIGINT', () => {
  console.log('[signal] SIGINT received');
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});