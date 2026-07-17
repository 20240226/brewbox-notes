javascript
const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const COZE_KEY = process.env.COZE_API_KEY;
const BOT_ID = '7662260142188183588';

// 1. 调用 Coze 拿文案
async function fetchNote() {
  const body = JSON.stringify({
    bot_id: BOT_ID,
    user_id: 'brewbox_auto',
    query: '按内容日历生成今天的小红书咖啡笔记，包含标题、正文、标签。用中文。只返回JSON：{"title":"...","body":"...","tags":["..."]}',
    stream: false
  });
  const resp = await fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${COZE_KEY}`, 'Content-Type': 'application/json' },
    body,
    timeout: 60000
  });
  const data = await resp.json();
  let answer = '';
  if (data.data && data.data[0] && data.data[0].content) answer = data.data[0].content;
  else if (data.answer) answer = data.answer;
  else answer = '{"title":"精品咖啡每日分享","body":"今天没有新笔记，明天再来看看吧～","tags":["精品咖啡","BrewBox"]}';
  // 提取JSON
  const m = answer.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { title: '精品咖啡', body: answer, tags: ['咖啡'] };
}

// 2. 用 Sharp 合成真PNG封面
async function generateCover(title, dateStr) {
  const width = 1242, height = 1660;
  // 深咖啡渐变背景
  const svgBg = `<svg width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1C1512"/>
        <stop offset="100%" stop-color="#2A1F1A"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <circle cx="1100" cy="200" r="350" fill="rgba(200,149,108,0.06)"/>
    <circle cx="200" cy="1400" r="250" fill="rgba(200,149,108,0.04)"/>
  </svg>`;

  // 暖金色标题文字
  const lines = title.length > 8
    ? [title.slice(0, Math.ceil(title.length/2)), title.slice(Math.ceil(title.length/2))]
    : [title, ''];
  
  const svgText = `<svg width="${width}" height="${height}">
    <style>
      .title1 { fill: #E8DCC8; font-size: 72px; font-weight: 900; font-family: 'PingFang SC','Microsoft YaHei',sans-serif; text-anchor: middle; }
      .title2 { fill: #C8956C; font-size: 72px; font-weight: 900; font-family: 'PingFang SC','Microsoft YaHei',sans-serif; text-anchor: middle; }
      .brand { fill: #C8956C; font-size: 28px; font-weight: 700; font-family: sans-serif; letter-spacing: 6px; text-anchor: middle; }
      .date { fill: #8A7A6A; font-size: 24px; font-family: sans-serif; text-anchor: middle; }
      .footer { fill: #C8956C; font-size: 22px; font-weight: 600; font-family: sans-serif; letter-spacing: 4px; text-anchor: middle; }
      .line { stroke: rgba(200,149,108,0.3); stroke-width: 2; }
    </style>
    <text x="${width/2}" y="280" class="brand">✦ BREWBOX</text>
    <text x="${width/2}" y="620" class="title1">${lines[0]}</text>
    ${lines[1] ? `<text x="${width/2}" y="720" class="title2">${lines[1]}</text>` : ''}
    <line x1="371" y1="1200" x2="871" y2="1200" class="line"/>
    <text x="${width/2}" y="1280" class="date">${dateStr}</text>
    <text x="${width/2}" y="1480" class="footer">月月新鲜 · ¥179/月</text>
  </svg>`;

  const bgBuffer = Buffer.from(svgBg);
  const textBuffer = Buffer.from(svgText);
  
  const cover = await sharp({
    create: { width, height, channels: 4, background: { r: 28, g: 21, b: 18, alpha: 1 } }
  }).composite([
    { input: bgBuffer, top: 0, left: 0 },
    { input: textBuffer, top: 0, left: 0 }
  ]).png().toBuffer();

  fs.writeFileSync('public/cover.png', cover);
  return 'public/cover.png';
}

// 3. 生成 HTML 笔记页
function generateHTML(note, dateStr) {
  const bodyHtml = note.body.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
  const tagsHtml = (note.tags || []).map(t => `<span>#${t}</span>`).join('');
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>今日笔记 — BrewBox</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'PingFang SC','Microsoft YaHei',sans-serif}
body{background:#1C1512;color:#E8DCC8;display:flex;flex-direction:column;align-items:center;padding:30px 16px 60px}
h1{color:#C8956C;font-size:22px;margin-bottom:4px}
h1 span{color:#E8DCC8}.sub{color:#8A7A6A;font-size:13px;margin-bottom:20px}
.cover-wrap{width:372px;border-radius:14px;overflow:hidden;margin-bottom:16px;box-shadow:0 12px 48px rgba(0,0,0,0.6)}
.cover-wrap img{width:100%;display:block}
.btn-group{display:flex;gap:12px;margin-bottom:20px}
.btn{background:#C8956C;color:#1C1512;border:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}
.btn:hover{background:#D4A57E}
.card{max-width:600px;width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(200,149,108,0.12);border-radius:16px;padding:28px 24px}
.card h2{color:#C8956C;font-size:18px;margin-bottom:14px}
.card p{color:#C8B8A8;font-size:14px;line-height:1.9;margin-bottom:10px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}
.tags span{background:rgba(200,149,108,0.08);color:#C8956C;padding:4px 12px;border-radius:14px;font-size:12px}
.back{color:#8A7A6A;font-size:13px;text-decoration:none;margin-top:16px;display:inline-block}
</style>
</head>
<body>
<h1>☕ Brew<span>Box</span></h1>
<p class="sub">📅 ${dateStr} · 每日笔记</p>
<div class="cover-wrap"><img src="cover.png" alt="封面"></div>
<div class="btn-group">
<button class="btn" onclick="saveCover()">🖼️ 保存封面</button>
<button class="btn" onclick="copyNote()">📋 复制文案</button>
</div>
<div class="card">
<h2>${note.title}</h2>
${bodyHtml}
<div class="tags">${tagsHtml}</div>
</div>
<a href="/" class="back">← 返回首页</a>
<script>
function saveCover(){const a=document.createElement('a');a.download='brewbox-cover.png';a.href='cover.png';a.click()}
function copyNote(){const t=\`${note.title}\n\n${note.body}\n\n${(note.tags||[]).map(t=>'#'+t).join(' ')}\`;
navigator.clipboard.writeText(t).then(()=>{document.querySelector('.btn-group .btn:last-child').textContent='✅ 已复制！';setTimeout(()=>{location.reload()},1500)})}
</script>
</body>
</html>`;

  fs.writeFileSync('public/index.html', html);
}

// 4. 部署到 Surge
async function deploySurge() {
  const surge = require('surge');
  return new Promise((resolve, reject) => {
    surge({
      project: path.join(__dirname, '..', 'public'),
      domain: 'brewbox-coffee.surge.sh/notes'
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// 主流程
async function main() {
  const dateStr = new Date().toLocaleDateString('zh-CN');
  console.log(`☕ 开始生成 ${dateStr} 的笔记...`);
  
  if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
  
  const note = await fetchNote();
  console.log(`✅ 文案已生成: ${note.title}`);
  
  await generateCover(note.title, dateStr);
  console.log(`✅ 封面已生成: public/cover.png`);
  
  generateHTML(note, dateStr);
  console.log(`✅ HTML 已生成`);
  
  console.log(`🎉 全部完成！`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
