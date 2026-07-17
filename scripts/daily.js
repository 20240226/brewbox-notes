javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COZE_KEY = process.env.COZE_API_KEY;
const BOT_ID = '7662260142188183588';
const SURGE_TOKEN = process.env.SURGE_TOKEN;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const NOTES_DIR = path.join(PUBLIC_DIR, 'notes');

async function main() {
  console.log("开始生成...");
  if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });

  // 1. 拿文案
  const resp = await fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + COZE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bot_id: BOT_ID,
      user_id: 'brewbox_auto',
      query: '生成一篇咖啡知识小红书笔记，标题6字内。只返回JSON：{"title":"...","body":"...","tags":["..."]}',
      stream: false
    })
  });
  const data = await resp.json();
  const content = data.answer || (data.data && data.data[0] && data.data[0].content) || '';
  const match = content.match(/\{[\s\S]*\}/);
  const note = match ? JSON.parse(match[0]) : { title: '精品咖啡', body: content, tags: ['咖啡'] };
  console.log("文案: " + note.title);

  // 2. 生成封面 — 最简单的Sharp合成
  const sharp = require('sharp');
  const svg = '<svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="1242" height="1660" fill="#1C1512"/>' +
    '<text x="621" y="600" fill="#C8956C" font-size="72" font-weight="900" text-anchor="middle">' + note.title + '</text>' +
    '<text x="621" y="800" fill="#E8DCC8" font-size="36" text-anchor="middle">精品咖啡 · 每月送到家</text>' +
    '<text x="621" y="1500" fill="#8A7A6A" font-size="24" text-anchor="middle">' + new Date().toLocaleDateString('zh-CN') + '</text>' +
    '</svg>';
  const cover = await sharp({ create: { width: 1242, height: 1660, channels: 4, background: { r: 28, g: 21, b: 18, alpha: 1 } } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png().toBuffer();
  fs.writeFileSync(path.join(NOTES_DIR, 'cover.png'), cover);
  console.log("封面已生成");

  // 3. 生成HTML — 纯字符串拼接，不用模板字符串
  var dateStr = new Date().toLocaleDateString('zh-CN');
  var bodyP = note.body.split('\n').filter(function(p) { return p.trim(); }).map(function(p) { return '<p>' + p + '</p>'; }).join('');
  var tagS = (note.tags || []).map(function(t) { return '<span>' + t + '</span>'; }).join('');
  
  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>BrewBox 今日笔记</title>' +
    '<style>body{background:#1C1512;color:#E8DCC8;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;padding:30px 16px}' +
    'h1{color:#C8956C}.cover-wrap{width:372px;border-radius:14px;overflow:hidden;margin:16px 0}' +
    'img{width:100%}.btn{background:#C8956C;color:#1C1512;border:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin:4px}' +
    '.card{max-width:600px;background:rgba(255,255,255,0.03);border:1px solid rgba(200,149,108,0.12);border-radius:16px;padding:28px 24px;margin:16px 0}' +
    '.card h2{color:#C8956C;font-size:18px}.card p{color:#C8B8A8;font-size:14px;line-height:1.9}' +
    '.tags span{display:inline-block;background:rgba(200,149,108,0.08);color:#C8956C;padding:4px 12px;border-radius:14px;font-size:12px;margin:4px}' +
    '</style></head><body><h1>BrewBox</h1><p>' + dateStr + ' · 每日笔记</p>' +
    '<div class="cover-wrap"><img src="cover.png" alt="封面"></div>' +
    '<div><button class="btn" onclick="var a=document.createElement(\'a\');a.download=\'brewbox.png\';a.href=\'cover.png\';a.click()">保存封面</button>' +
    '<button class="btn" onclick="navigator.clipboard.writeText(document.getElementById(\'t\').textContent).then(function(){this.textContent=\'已复制\';}.bind(this))">复制文案</button></div>' +
    '<div class="card"><h2>' + note.title + '</h2>' + bodyP + '<div class="tags">' + tagS + '</div>' +
    '<p id="t" style="display:none">' + note.title + '\n' + note.body + '\n' + (note.tags||[]).map(function(t){return '#'+t}).join(' ') + '</p>' +
    '</div><a href="/" style="color:#8A7A6A;font-size:13px;margin-top:16px;display:inline-block">返回首页</a></body></html>';
  
  fs.writeFileSync(path.join(NOTES_DIR, 'index.html'), html);
  console.log("HTML已生成");

  // 4. 部署到Surge
  console.log("部署中...");
  execSync('npx surge --project ' + PUBLIC_DIR + ' --domain brewbox-coffee.surge.sh --token ' + SURGE_TOKEN, { timeout: 30000 });
  console.log("完成! https://brewbox-coffee.surge.sh/notes/");
}

main().catch(function(e) { console.error('失败:', e.message); process.exit(1); });
