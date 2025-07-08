import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  connectionPoolSize:
    (process.env.DB_CONNECTION_POOL_SIZE &&
      parseInt(process.env.DB_CONNECTION_POOL_SIZE)) ||
    10,
  connectionTimeout:
    (process.env.DB_CONNECTION_TIMEOUT &&
      parseInt(process.env.DB_CONNECTION_TIMEOUT)) ||
    30000,
}));
