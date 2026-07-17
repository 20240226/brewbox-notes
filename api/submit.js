javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持POST' });
  const { email, wechat, roast, grind, flavor } = req.body;
  if (!email) return res.status(400).json({ error: '邮箱必填' });

  const SUPABASE_URL = 'https://npsgvmtblisrtrmhirka.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2d2bXRibGlzcnRybWhpcmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTUxNjksImV4cCI6MjA5OTgzMTE2OX0.0G9Nr2Tb3QQUQJsaB1QcpZWpl5bG0Os35kJY34wE6DA';

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, wechat, roast, grind, flavor })
  });

  if (!resp.ok) return res.status(500).json({ error: '存储失败' });
  res.json({ success: true, message: '已收到！客服会尽快联系您。' });
}
