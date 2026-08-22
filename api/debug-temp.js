export default function handler(req, res) {
  const senha = req.query.senha;

  if (!process.env.ADMIN_SECRET || senha !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ erro: 'não autorizado' });
  }

  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL || null,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || null
  });
    }
