javascript
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持POST' });

  const { email, wechat, roast, grind, flavor } = req.body;
  if (!email) return res.status(400).json({ error: '邮箱必填' });

  const SUPABASE_URL = 'https://npsgvmtblisrtrmhirka.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc2d2bXRibGlzcnRybWhpcmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNTUxNjksImV4cCI6MjA5OTgzMTE2OX0.0G9Nr2Tb3QQUQJsaB1QcpZWpl5bG0Os35kJY34wE6DA';

  try {
    // 第一步：查该邮箱有无活跃订阅
    const subResp = await fetch(
      SUPABASE_URL + '/rest/v1/subscriptions?email=eq.' + encodeURIComponent(email) + '&status=eq.active',
      { headers: { 'apikey': SUPABASE_KEY } }
    );
    const subscriptions = await subResp.json();

    if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      // ❌ 不是会员 → 不存数据，直接返回
      return res.status(403).json({ error: 'not_member', message: '您还不是 BrewBox 会员，请先订阅' });
    }

    // ✅ 是会员 → 存口味数据
    const custResp = await fetch(SUPABASE_URL + '/rest/v1/customers', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, wechat, roast, grind, flavor })
    });

    if (!custResp.ok) return res.status(500).json({ error: '存储失败' });
    return res.json({ success: true, message: '已收到您的口味偏好！' });

  } catch (e) {
    return res.status(500).json({ error: '服务器错误' });
  }
}
