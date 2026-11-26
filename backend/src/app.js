import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/apiRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { clientCorsOptions } from './config/cors.js';

const app = express();

app.use(cors(clientCorsOptions));

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// API Base Route
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', product: 'Orvexa', timestamp: new Date() });
});

// Centralized error handler
app.use(errorHandler);

export default app;
