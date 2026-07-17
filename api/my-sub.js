javascript
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

export default async function handler(req, res) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const email = req.query.email;
  if (!email) return res.status(400).json({ error: '邮箱必填' });

  const SUPABASE_URL = 'https://npsgvmtblisrtrmhirka.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2d2bXRibGlzcnRybWhpcmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTUxNjksImV4cCI6MjA5OTgzMTE2OX0.0G9Nr2Tb3QQUQJsaB1QcpZWpl5bG0Os35kJY34wE6DA';

  try {
    const [custResp, subResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${email}`, {
        headers: { 'apikey': SUPABASE_KEY }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions?email=eq.${email}&order=start_date.desc`, {
        headers: { 'apikey': SUPABASE_KEY }
      })
    ]);
    const customers = await custResp.json();
    const subscriptions = await subResp.json();
    res.json({ customer: customers[0] || null, subscriptions });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
}
