const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const developmentOrigins = process.env.NODE_ENV === 'production'
  ? []
  : ['http://localhost:5173'];

export const clientCorsOptions = {
  origin: [...new Set([...configuredOrigins, ...developmentOrigins])],
  credentials: true,
};
