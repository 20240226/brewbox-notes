javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COZE_KEY = process.env.COZE_API_KEY;
const BOT_ID = '7662260142188183588';
const SURGE_TOKEN = process.env.SURGE_TOKEN;
const PUBLIC_DIR = '/home/runner/work/brewbox-notes/brewbox-notes/public';
const NOTES_DIR = PUBLIC_DIR + '/notes';

async function main() {
  console.log('开始生成...');
  if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });

  console.log('调用Coze API...');
  const resp = await fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + COZE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bot_id: BOT_ID, user_id: 'brewbox_auto',
      query: '生成一篇小红书咖啡笔记。只返回JSON：{"title":"4字标题","body":"正文带emoji","tags":["tag1","tag2"]}',
      stream: false
    })
  });
  const data = await resp.json();
  let content = data.answer || '';
  if (!content && data.data) content = data.data[0].content || '';
  const m = content.match(/\{[\s\S]*\}/);
  const note = m ? JSON.parse(m[0]) : { title: '每日咖啡', body: content, tags: ['咖啡'] };
  console.log('文案: ' + note.title);

  console.log('合成封面...');
  const sharp = require('sharp');
  const title = note.title || '每日咖啡';
  const dateStr = new Date().toLocaleDateString('zh-CN');
  const svg = '<svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1C1512"/><stop offset="100%" stop-color="#2A1F1A"/></linearGradient></defs>' +
    '<rect width="1242" height="1660" fill="url(#g)"/>' +
    '<circle cx="1100" cy="200" r="350" fill="rgba(200,149,108,0.06)"/>' +
    '<circle cx="200" cy="1400" r="250" fill="rgba(200,149,108,0.04)"/>' +
    '<text x="621" y="260" fill="#C8956C" font-size="26" font-weight="700" text-anchor="middle" letter-spacing="5">BREWBOX</text>' +
    '<text x="621" y="580" fill="#E8DCC8" font-size="66" font-weight="900" text-anchor="middle">' + title + '</text>' +
    '<text x="621" y="700" fill="#C8956C" font-size="36" font-weight="500" text-anchor="middle">精品咖啡 · 每月送到家</text>' +
    '<line x1="371" y1="1200" x2="871" y2="1200" stroke="rgba(200,149,108,0.3)" stroke-width="2"/>' +
    '<text x="621" y="1300" fill="#8A7A6A" font-size="24" text-anchor="middle">' + dateStr + '</text>' +
    '<text x="621" y="1500" fill="#C8956C" font-size="20" font-weight="600" text-anchor="middle" letter-spacing="4">月月新鲜 · 179/月</text>' +
    '</svg>';
  const img = await sharp({ create: { width: 1242, height: 1660, channels: 4, background: { r: 28, g: 21, b: 18, alpha: 1 } } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png().toBuffer();
  fs.writeFileSync(NOTES_DIR + '/cover.png', img);
  console.log('封面已生成');

  console.log('生成HTML...');
  var bodyHtml = note.body.split('\n').filter(function(p) { return p.trim(); }).map(function(p) { return '<p>' + p + '</p>'; }).join('');
  var tagsHtml = (note.tags || []).map(function(t) { return '<span>' + t + '</span>'; }).join('');
  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + title + ' - BrewBox</title><style>body{background:#1C1512;color:#E8DCC8;font-family:sans-serif;padding:30px 16px;text-align:center}h1{color:#C8956C;font-size:22px}.cover{width:372px;margin:16px auto;border-radius:14px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.6)}.cover img{width:100%;display:block}.btn{background:#C8956C;color:#1C1512;border:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;margin:4px}.card{max-width:600px;margin:16px auto;background:rgba(255,255,255,0.03);border:1px solid rgba(200,149,108,0.12);border-radius:16px;padding:28px 24px;text-align:left}.card h2{color:#C8956C;font-size:18px;margin-bottom:14px}.card p{color:#C8B8A8;font-size:14px;line-height:1.9}.tags{margin:14px 0}.tags span{display:inline-block;background:rgba(200,149,108,0.08);color:#C8956C;padding:4px 12px;border-radius:14px;font-size:12px;margin:3px}a{color:#8A7A6A;font-size:13px;margin-top:16px;display:inline-block;text-decoration:none}</style></head><body><h1>BrewBox</h1><p>' + dateStr + ' · 每日笔记</p><div class="cover"><img src="cover.png" alt="封面"></div><div><button class="btn" onclick="var a=document.createElement(\'a\');a.download=\'cover.png\';a.href=\'cover.png\';a.click()">保存封面</button><button class="btn" onclick="navigator.clipboard.writeText(\'' + title + '\\n\\n' + note.body.replace(/'/g, "\\'").replace(/"/g, '\\"') + '\\n\\n' + (note.tags || []).map(function(t) { return '#' + t; }).join(' ') + '\').then(function(){this.textContent=\'已复制\';}.bind(this))">复制文案</button></div><div class="card"><h2>' + title + '</h2>' + bodyHtml + '<div class="tags">' + tagsHtml + '</div></div><a href="/">返回首页</a></body></html>';
  fs.writeFileSync(NOTES_DIR + '/index.html', html);
  console.log('HTML已生成');

  console.log('部署中...');
  execSync('npx surge --project ' + PUBLIC_DIR + ' --domain brewbox-coffee.surge.sh --token ' + SURGE_TOKEN, { timeout: 30000, stdio: 'inherit' });
  console.log('完成! https://brewbox-coffee.surge.sh/notes/');
}

main().catch(function(e) { console.error('失败:', e.message); process.exit(1); });
