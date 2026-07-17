javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const sharp = require('sharp');

const COZE_KEY = process.env.COZE_API_KEY;
const BOT_ID = '7662260142188183588';
const SURGE_TOKEN = process.env.SURGE_TOKEN;
const SURGE_LOGIN = process.env.SURGE_LOGIN;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const NOTES_DIR = path.join(PUBLIC_DIR, 'notes');

// 1. 调用 Coze API 拿文案
async function fetchNote() {
  const resp = await fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COZE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bot_id: BOT_ID,
      user_id: 'brewbox_auto',
      query: '按内容日历生成今天的小红书咖啡笔记。只返回JSON：{"title":"...","body":"...","tags":["...","..."]}。标题用中文，正文300字带emoji，标签5个。',
      stream: false
    })
  });
  const data = await resp.json();
  let content = '';
  if (data.answer) content = data.answer;
  else if (data.data && data.data[0]) content = data.data[0].content;
  const match = content.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  return { title: '精品咖啡每日分享', body: content, tags: ['精品咖啡'] };
}

// 2. 用 Sharp 合成真PNG封面 (1242×1660)
async function generateCover(title) {
  const lines = title.length > 6
    ? [title.slice(0, Math.ceil(title.length/2)), title.slice(Math.ceil(title.length/2))]
    : [title, ''];
  
  const svgContent = `<svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1C1512"/>
        <stop offset="100%" stop-color="#2A1F1A"/>
      </linearGradient>
    </defs>
    <rect width="1242" height="1660" fill="url(#bg)"/>
    <circle cx="1100" cy="200" r="350" fill="rgba(200,149,108,0.06)"/>
    <circle cx="200" cy="1400" r="250" fill="rgba(200,149,108,0.04)"/>
    <text x="621" y="280" fill="#C8956C" font-size="28" font-weight="700" font-family="sans-serif" text-anchor="middle" letter-spacing="6">✦ BREWBOX</text>
    <text x="621" y="620" fill="#E8DCC8" font-size="72" font-weight="900" font-family="'PingFang SC','Microsoft YaHei',sans-serif" text-anchor="middle">${lines[0]}</text>
    ${lines[1] ? `<text x="621" y="720" fill="#C8956C" font-size="72" font-weight="900" font-family="'PingFang SC','Microsoft YaHei',sans-serif" text-anchor="middle">${lines[1]}</text>` : ''}
    <line x1="371" y1="1200" x2="871" y2="1200" stroke="rgba(200,149,108,0.3)" stroke-width="2"/>
    <text x="621" y="1300" fill="#8A7A6A" font-size="24" font-family="sans-serif" text-anchor="middle">${new Date().toLocaleDateString('zh-CN')}</text>
    <text x="621" y="1500" fill="#C8956C" font-size="22" font-weight="600" font-family="sans-serif" text-anchor="middle" letter-spacing="4">月月新鲜 · ¥179/月</text>
  </svg>`;

  const cover = await sharp({
    create: { width: 1242, height: 1660, channels: 4, background: { r: 28, g: 21, b: 18, alpha: 1 } }
  }).composite([
    { input: Buffer.from(svgContent), top: 0, left: 0 }
  ]).png().toBuffer();

  fs.writeFileSync(path.join(NOTES_DIR, 'cover.png'), cover);
  console.log('✅ 封面已生成');
}

// 3. 生成 HTML
function generateHTML(note) {
  const bodyHtml = note.body.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
  const tagsHtml = (note.tags || []).map(t => `<span>#${t}</span>`).join('');
  const dateStr = new Date().toLocaleDateString('zh-CN');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BrewBox 今日笔记</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'PingFang SC','Microsoft YaHei',sans-serif}
body{background:#1C1512;color:#E8DCC8;display:flex;flex-direction:column;align-items:center;padding:30px 16px 60px}
h1{color:#C8956C;font-size:22px;margin-bottom:4px}
h1 span{color:#E8DCC8}.sub{color:#8A7A6A;font-size:13px;margin-bottom:20px}
.cover-wrap{width:372px;border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:0 12px 48px rgba(0,0,0,0.6)}
.cover-wrap img{width:100%;display:block}
.btn-group{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;justify-content:center}
.btn{background:#C8956C;color:#1C1512;border:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s}
.btn:hover{background:#D4A57E;transform:translateY(-1px)}
.card{max-width:600px;width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(200,149,108,0.12);border-radius:16px;padding:28px 24px}
.card h2{color:#C8956C;font-size:18px;margin-bottom:14px}
.card p{color:#C8B8A8;font-size:14px;line-height:1.9;margin-bottom:10px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}
.tags span{background:rgba(200,149,108,0.08);color:#C8956C;padding:4px 12px;border-radius:14px;font-size:12px}
.back{color:#8A7A6A;font-size:13px;text-decoration:none;margin-top:16px;display:inline-block}
@media(max-width:480px){.cover-wrap{width:300px}}
</style>
</head>
<body>
<h1>☕ Brew<span>Box</span></h1>
<p class="sub">📅 ${dateStr} · 每日笔记</p>
<div class="cover-wrap"><img src="cover.png" alt="今日封面"></div>
<div class="btn-group">
<button class="btn" onclick="saveCover()">🖼️ 保存封面</button>
<button class="btn" onclick="copyText()">📋 复制文案</button>
</div>
<div class="card">
<h2>${note.title}</h2>
${bodyHtml}
<div class="tags">${tagsHtml}</div>
</div>
<a href="/" class="back">← 返回首页</a>
<script>
function saveCover(){const a=document.createElement('a');a.download='brewbox-${Date.now()}.png';a.href='cover.png';a.click()}
function copyText(){const txt=\`${note.title}\n\n${note.body}\n\n${(note.tags||[]).map(t=>'#'+t).join(' ')}\`;
navigator.clipboard.writeText(txt).then(()=>{const b=document.querySelector('.btn-group .btn:last-child');b.textContent='✅ 已复制';setTimeout(()=>{b.textContent='📋 复制文案'},2000)})}
<\/script>
</body>
</html>`;

  fs.writeFileSync(path.join(NOTES_DIR, 'index.html'), html);
  console.log('✅ HTML 已生成');
}

// 4. 部署到 Surge
function deploySurge() {
  console.log('🚀 部署到 Surge...');
  // 用 npx surge CLI，不用 surge npm 包
  const cmd = `npx surge --project ${PUBLIC_DIR} --domain brewbox-coffee.surge.sh --token ${SURGE_TOKEN}`;
  const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  console.log(result);
  console.log('✅ 部署完成！');
}

// 主流程
async function main() {
  console.log(`☕ 开始生成 ${new Date().toLocaleDateString('zh-CN')} 的笔记...`);
  
  if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });
  
  const note = await fetchNote();
  console.log(`✅ 文案: ${note.title}`);
  
  await generateCover(note.title);
  generateHTML(note);
  deploySurge();
  console.log('🎉 全部完成！打开 https://brewbox-coffee.surge.sh/notes/');
}

main().catch(e => {
  console.error('❌ 失败:', e.message);
  process.exit(1);
});
