// Entry point — WasteHotspot Express server
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const reportsRouter   = require('./routes/reports');
const hotspotsRouter  = require('./routes/hotspots');
const trucksRouter    = require('./routes/trucks');
const tasksRouter     = require('./routes/tasks');
const routingRouter   = require('./routes/routing');
const dashboardRouter = require('./routes/dashboard');
const authRouter      = require('./routes/auth');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/reports',   reportsRouter);
app.use('/api/hotspots',  hotspotsRouter);
app.use('/api/trucks',    trucksRouter);
app.use('/api/tasks',     tasksRouter);
app.use('/api/routing',   routingRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth',      authRouter);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`WasteHotspot API running on :${PORT}`));
