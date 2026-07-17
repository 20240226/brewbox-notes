const fs = require('fs');
const path = require('path');

const COZE_KEY = process.env.COZE_API_KEY;
const BOT_ID = '7662260142188183588';
const PUBLIC_DIR = path.resolve(process.env.GITHUB_WORKSPACE || process.cwd(), 'public');
const NOTES_DIR = path.join(PUBLIC_DIR, 'notes');
const TOTAL_COVERS = 5;

async function main() {
  console.log('开始生成...');
  if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true });

  // ── 1. 调用 Coze API ──────────────────────────────────────────
  console.log('调用 Coze API — 要求通义万相生成 5 张小红书封面...');
  const resp = await fetch('https://api.coze.cn/v3/chat', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + COZE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bot_id: BOT_ID,
      user_id: 'brewbox_auto',
      query: [
        '请调用通义万相为这篇小红书咖啡笔记生成 5 张不同风格的小红书封面图（1242×1660），',
        '风格可以包括：极简风、手绘风、复古风、ins风、文字海报风。',
        '正文内容要与咖啡相关，带 emoji。',
        '只返回严格的 JSON（不要 markdown 代码块包裹），格式如下：',
        '{',
        '  "title": "4字标题",',
        '  "body": "正文内容\\n多行文本带emoji",',
        '  "tags": ["tag1","tag2","tag3"],',
        '  "images": ["https://通义万相生成的图片URL1","URL2","URL3","URL4","URL5"]',
        '}',
        'images 数组必须有 5 个有效的图片 URL。'
      ].join('\n'),
      stream: false
    })
  });
  const data = await resp.json();
  let content = data.answer || '';
  if (!content && data.data && data.data.messages && data.data.messages.length > 0) {
    content = data.data.messages[0].content || "";
  }
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('无法从 Coze 响应中解析 JSON：' + content.slice(0, 500));
  const note = JSON.parse(m[0]);
  console.log('标题: ' + note.title);
  console.log('图片 URL 数: ' + (note.images ? note.images.length : 0));

  // ── 2. 下载 5 张封面图 ──────────────────────────────────────
  console.log('下载 ' + TOTAL_COVERS + ' 张封面图...');
  const imageUrls = note.images || [];
  for (let i = 0; i < TOTAL_COVERS; i++) {
    const url = imageUrls[i];
    if (!url) {
      console.log('第 ' + (i + 1) + ' 张 URL 缺失，留待备用封面填充');
      continue;
    }
    console.log('下载第 ' + (i + 1) + ' 张: ' + url);
    try {
      const imgResp = await fetch(url);
      if (!imgResp.ok) throw new Error('HTTP ' + imgResp.status);
      const buffer = await imgResp.arrayBuffer();
      fs.writeFileSync(path.join(NOTES_DIR, 'cover-' + (i + 1) + '.png'), Buffer.from(buffer));
      console.log('  ✓ 已保存 cover-' + (i + 1) + '.png');
    } catch (err) {
      console.error('  ✗ 下载失败: ' + err.message + '，使用备用封面');
    }
  }

  // ── 3. 用 Sharp 生成备用封面（补缺失）─────────────────────────
  console.log('检查并补充缺失的封面图...');
  const sharp = require('sharp');
  const title = note.title || '每日咖啡';
  const dateStr = new Date().toLocaleDateString('zh-CN');
  const STYLES = [
    { bg1: '#1C1512', bg2: '#2A1F1A', accent: '#C8956C', sub:'极简 · 深棕' },
    { bg1: '#2D1B2E', bg2: '#1A1020', accent: '#E8A0C0', sub:'手绘 · 粉彩' },
    { bg1: '#1A2F1A', bg2: '#0F1F0F', accent: '#A8D0A0', sub:'复古 · 墨绿' },
    { bg1: '#1E2A3A', bg2: '#0F1A2A', accent: '#80B0D0', sub:'ins · 海蓝' },
    { bg1: '#2A1F10', bg2: '#1A1208', accent: '#F0D080', sub:'海报 · 暖金' }
  ];

  for (let i = 1; i <= TOTAL_COVERS; i++) {
    const filePath = path.join(NOTES_DIR, 'cover-' + i + '.png');
    if (fs.existsSync(filePath)) continue;

    console.log('生成第 ' + i + ' 张备用封面（' + STYLES[i - 1].sub + '）...');
    const s = STYLES[i - 1];
    const svg = [
      '<svg width="1242" height="1660" xmlns="http://www.w3.org/2000/svg">',
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="' + s.bg1 + '"/>',
      '<stop offset="100%" stop-color="' + s.bg2 + '"/>',
      '</linearGradient></defs>',
      '<rect width="1242" height="1660" fill="url(#g)"/>',
      '<circle cx="1100" cy="200" r="350" fill="' + s.accent + '10"/>',
      '<circle cx="200" cy="1400" r="250" fill="' + s.accent + '08"/>',
      '<text x="621" y="260" fill="' + s.accent + '" font-size="26" font-weight="700" text-anchor="middle" letter-spacing="5">BREWBOX</text>',
      '<text x="621" y="520" fill="#E8DCC8" font-size="60" font-weight="900" text-anchor="middle">' + title + '</text>',
      '<text x="621" y="640" fill="' + s.accent + '" font-size="28" font-weight="500" text-anchor="middle">' + s.sub + '</text>',
      '<text x="621" y="720" fill="' + s.accent + 'aa" font-size="22" font-weight="400" text-anchor="middle">封面 ' + i + ' / ' + TOTAL_COVERS + '</text>',
      '<line x1="371" y1="1200" x2="871" y2="1200" stroke="' + s.accent + '44" stroke-width="2"/>',
      '<text x="621" y="1300" fill="#8A7A6A" font-size="24" text-anchor="middle">' + dateStr + '</text>',
      '<text x="621" y="1500" fill="' + s.accent + '" font-size="20" font-weight="600" text-anchor="middle" letter-spacing="4">月月新鲜 · 179/月</text>',
      '</svg>'
    ].join('');
    const img = await sharp({
      create: { width: 1242, height: 1660, channels: 4, background: { r: 28, g: 21, b: 18, alpha: 1 } }
    })
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
    fs.writeFileSync(filePath, img);
    console.log('  ✓ 已生成 cover-' + i + '.png');
  }

  // ── 4. 生成 HTML（含 5 张封面切换 + 下载）────────────────────
  console.log('生成 HTML（含 5 张封面画廊 + 下载）...');
  const bodyHtml = note.body.split('\n').filter(function(p) { return p.trim(); }).map(function(p) { return '<p>' + p + '</p>'; }).join('');
  const tagsHtml = (note.tags || []).map(function(t) { return '<span>' + t + '</span>'; }).join('');

  var html = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width,initial-scale=1.0">\n';
  html += '<title>' + title + ' - BrewBox</title>\n';
  html += '<style>\n';
  html += '*{margin:0;padding:0;box-sizing:border-box}\n';
  html += 'body{background:#1C1512;color:#E8DCC8;font-family:system-ui,-apple-system,sans-serif;padding:30px 16px;text-align:center}\n';
  html += 'h1{color:#C8956C;font-size:22px;margin-bottom:8px}\n';
  html += '.date{color:#8A7A6A;font-size:14px;margin-bottom:20px}\n';
  html += '.date .tags span{display:inline-block;background:rgba(200,149,108,0.15);color:#C8956C;padding:2px 10px;border-radius:12px;font-size:12px;margin:2px}\n';
  html += '.gallery{max-width:400px;margin:0 auto 20px;position:relative}\n';
  html += '.gallery .main-cover{width:100%;border-radius:14px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.6)}\n';
  html += '.gallery .main-cover img{width:100%;display:block}\n';
  html += '.gallery .nav-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(200,149,108,0.85);color:#1C1512;border:none;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;font-weight:700;transition:opacity .2s;z-index:2;line-height:40px;text-align:center}\n';
  html += '.gallery .nav-btn:hover{opacity:0.75}\n';
  html += '.gallery .nav-btn.prev{left:-16px}\n';
  html += '.gallery .nav-btn.next{right:-16px}\n';
  html += '.thumbs{display:flex;gap:8px;justify-content:center;margin:12px auto 20px;max-width:400px;flex-wrap:wrap}\n';
  html += '.thumbs .thumb{width:60px;height:80px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:border-color .2s,transform .2s,opacity .2s;opacity:0.5}\n';
  html += '.thumbs .thumb.active{border-color:#C8956C;transform:scale(1.12);opacity:1}\n';
  html += '.thumbs .thumb:hover{opacity:0.85}\n';
  html += '.thumbs .thumb img{width:100%;height:100%;object-fit:cover;display:block}\n';
  html += '.counter{color:#8A7A6A;font-size:13px;margin-bottom:16px}\n';
  html += '.card{max-width:600px;margin:0 auto 20px;background:rgba(255,255,255,0.03);border:1px solid rgba(200,149,108,0.15);border-radius:14px;padding:24px 20px;text-align:left}\n';
  html += '.card .body{line-height:1.8;font-size:15px}\n';
  html += '.card .body p{margin-bottom:10px}\n';
  html += '.card .tags{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px}\n';
  html += '.card .tags span{background:rgba(200,149,108,0.15);color:#C8956C;padding:4px 12px;border-radius:20px;font-size:12px}\n';
  html += '.actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px}\n';
  html += '.btn{background:#C8956C;color:#1C1512;border:none;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .2s}\n';
  html += '.btn:hover{opacity:0.85}\n';
  html += '.btn-outline{background:transparent;color:#C8956C;border:2px solid #C8956C}\n';
  html += '.btn-sm{background:rgba(200,149,108,0.15);color:#C8956C;border:none;padding:8px 16px;border-radius:6px;font-size:13px;cursor:pointer;transition:opacity .2s}\n';
  html += '.btn-sm:hover{opacity:0.75}\n';
  html += '</style>\n';
  html += '</head>\n<body>\n';

  html += '<h1>☕ ' + title + '</h1>\n';
  html += '<div class="date">' + dateStr;
  if (note.tags && note.tags.length) {
    html += ' · <span class="tags">' + tagsHtml + '</span>';
  }
  html += '</div>\n';

  // 封面画廊
  html += '<div class="gallery" id="gallery">\n';
  html += '  <button class="nav-btn prev" onclick="prevCover()">‹</button>\n';
  html += '  <div class="main-cover"><img id="mainCover" src="cover-1.png" alt="封面1"></div>\n';
  html += '  <button class="nav-btn next" onclick="nextCover()">›</button>\n';
  html += '</div>\n';
  html += '<div class="counter" id="counter">1 / ' + TOTAL_COVERS + '</div>\n';

  // 缩略图
  html += '<div class="thumbs" id="thumbs">\n';
  for (var i = 1; i <= TOTAL_COVERS; i++) {
    var active = i === 1 ? ' active' : '';
    html += '  <div class="thumb' + active + '" onclick="showCover(' + (i - 1) + ')"><img src="cover-' + i + '.png" alt="' + i + '"></div>\n';
  }
  html += '</div>\n';

  // 笔记内容
  html += '<div class="card">\n';
  html += '  <div class="body">' + bodyHtml + '</div>\n';
  html += '  <div class="tags">' + tagsHtml + '</div>\n';
  html += '</div>\n';

  // 操作按钮
  html += '<div class="actions">\n';
  html += '  <button class="btn" onclick="downloadCover()">⬇ 下载当前封面</button>\n';
  html += '  <button class="btn btn-outline" onclick="downloadAll()">⬇ 下载全部 ' + TOTAL_COVERS + ' 张</button>\n';
  html += '</div>\n';

  // JS
  html += '<script>\n';
  html += 'var current=0,total=' + TOTAL_COVERS + ';\n';
  html += 'var coverNames=["cover-1.png","cover-2.png","cover-3.png","cover-4.png","cover-5.png"];\n';
  html += 'function showCover(i){current=i;document.getElementById("mainCover").src=coverNames[i];';
  html += 'document.getElementById("counter").textContent=(i+1)+" / "+total;';
  html += 'var thumbs=document.querySelectorAll(".thumb");';
  html += 'thumbs.forEach(function(t,idx){t.classList.toggle("active",idx===i)})}\n';
  html += 'function prevCover(){showCover((current-1+total)%total)}\n';
  html += 'function nextCover(){showCover((current+1)%total)}\n';
  html += 'function downloadCover(){var a=document.createElement("a");a.href=coverNames[current];a.download="brewbox-cover-"+(current+1)+".png";document.body.appendChild(a);a.click();document.body.removeChild(a)}\n';
  html += 'function downloadAll(){coverNames.forEach(function(n,i){setTimeout(function(){var a=document.createElement("a");a.href=n;a.download="brewbox-cover-"+(i+1)+".png";document.body.appendChild(a);a.click();document.body.removeChild(a)},i*300)})}\n';
  html += 'document.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")prevCover();if(e.key==="ArrowRight")nextCover()});\n';
  html += '</script>\n';
  html += '</body>\n</html>';

  fs.writeFileSync(path.join(NOTES_DIR, 'index.html'), html);
  console.log('HTML 已生成（含 5 张封面画廊 + 下载按钮）');

  // ── 5. 复制到 notes/index.html ──────────────────────────────
  const notesPublicDir = path.join(PUBLIC_DIR, 'notes');
  if (!fs.existsSync(notesPublicDir)) fs.mkdirSync(notesPublicDir, { recursive: true });
  fs.copyFileSync(path.join(NOTES_DIR, 'index.html'), path.join(notesPublicDir, 'index.html'));
  console.log('已复制到 notes/index.html');

  // ── 6. 更新 notes.json ──────────────────────────────────────
  const notesJsonPath = path.join(PUBLIC_DIR, '..', 'data', 'notes.json');
  let notes = [];
  try {
    notes = JSON.parse(fs.readFileSync(notesJsonPath, 'utf-8'));
    if (!Array.isArray(notes)) notes = [];
  } catch { notes = []; }
  notes.push({
    id: Date.now(),
    date: dateStr,
    weekday: new Date().toLocaleDateString('zh-CN', { weekday: 'long' }),
    title: note.title,
    body: note.body,
    tags: note.tags || [],
    images: imageUrls,
    createdAt: new Date().toISOString()
  });
  if (notes.length > 365) notes = notes.slice(-365);
  fs.writeFileSync(notesJsonPath, JSON.stringify(notes, null, 2), 'utf-8');
  console.log('notes.json 已更新');

  console.log('完成！');
}

main().catch(function(err) {
  console.error('错误:', err);
  process.exit(1);
});
