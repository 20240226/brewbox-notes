javascript
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { pwd } = req.query;
  if (pwd !== 'brewbox2024') return res.status(401).json({ error: '密码错误' });

  const SUPABASE_URL = 'https://npsgvmtblisrtrmhirka.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2d2bXRibGlzcnRybWhpcmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTUxNjksImV4cCI6MjA5OTgzMTE2OX0.0G9Nr2Tb3QQUQJsaB1QcpZWpl5bG0Os35kJY34wE6DA';

  try {
    const [custResp, subResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/customers`, { headers: { 'apikey': SUPABASE_KEY } }),
      fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, { headers: { 'apikey': SUPABASE_KEY } })
    ]);
    res.json({ customers: await custResp.json(), subscriptions: await subResp.json() });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
}
