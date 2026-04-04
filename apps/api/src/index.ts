import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import projectsRouter from './routes/projects';
import scansRouter from './routes/scans';
import reportsRouter from './routes/reports';
import fallbackRouter from './routes/fallback';
import { requireAuth } from './middleware/auth';
import compression from 'compression';
import morgan from 'morgan';
import statusRouter from './routes/status';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// 1. Middlewares
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(compression());
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' })); // Increased limit for raw HTML

// 2. Health check (no auth needed)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/status', statusRouter);

// 3. Authenticated routes
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/scans', requireAuth, scansRouter);
app.use('/api/scans', requireAuth, fallbackRouter);
app.use('/api/auth', requireAuth, authRouter);
app.use('/api/reports', reportsRouter);

app.listen(port, () => {
  console.log(`API server is running at http://localhost:${port}`);
});
