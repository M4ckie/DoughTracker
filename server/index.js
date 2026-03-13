import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import binsRouter from './routes/bins.js';
import stagesRouter from './routes/stages.js';
import unitsRouter from './routes/units.js';
import adminRouter from './routes/admin.js';
import { startSheetsSync } from './sheets.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Attach io to every request so routes can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.use('/api/bins', binsRouter);
app.use('/api/stages', stagesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`DoughTracker server running on port ${PORT}`);
  startSheetsSync(io);
});
