import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './utils/logger';
import { config } from './config/env';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(\$\{req.method\} \$\{req.path\});
  next();
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);

// Error handling
app.use(
  (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(err.message);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  }
);

// Start server
app.listen(config.PORT, () => {
  logger.info(🚀 Server running on port \$\{config.PORT\});
});

export default app;
