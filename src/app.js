import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.route.js';
import securityMiddleware from '#middlewares/security.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);

app.use(securityMiddleware);

app.get('/', (req, res) => {
  logger.info('Hello, Pluto is running');
  res.status(200).send('Pluto is running');
});
app.use('/health', (req, res) => {
  res
    .status(200)
    .json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.use('/api', (req, res) => {
  res.status(200).json({ message: 'API is working' });
});

export default app;
