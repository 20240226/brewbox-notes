const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.COZE_API_KEY || 'pat_493z1qZKCLyTKWlJ4gStJ75CQOaZpCs6m4KMQMP4qRVyAZ7zg7v0SgIi944rpdWk';
const BOT_ID = process.env.COZE_BOT_ID || '7662260142188183588';

const WEEKDAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const PROMPTS = {
  Monday:    'Share a productivity tip for starting the week strong.',
  Tuesday:   'Share a creative brewing or cocktail idea.',
  Wednesday: 'Share a mid-week motivation quote with a brewing metaphor.',
  Thursday:  'Share a fun fact about coffee or tea culture.',
  Friday:    'Share a weekend relaxation ritual or self-care tip.',
  Saturday:  'Share a brunch recipe or pairing suggestion.',
  Sunday:    'Share a reflection prompt for the new week ahead.',
};

function callCoze(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      bot_id: BOT_ID,
      user_id: 'brewbox-cron',
      additional_messages: [{ role: 'user', content: prompt, content_type: 'text' }],
      stream: false,
      auto_save: true,
    });
    const opts = {
      hostname: 'api.coze.com',
      path: '/v3/chat',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'brewbox-notes/1.0',
      },
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(body)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const today = new Date();
  const dayName = WEEKDAYS[today.getDay()];
  const prompt = PROMPTS[dayName] || 'Share a random insight about coffee, tea, or brewing.';

  console.log(`Generating note for ${dayName}: ${prompt}`);

  let content = '';
  try {
    const res = await callCoze(prompt);
    console.log('Coze response:', JSON.stringify(res, null, 2));
    content = res?.data?.content || res?.message || 'No response from Coze API.';
  } catch (err) {
    console.error('Coze API error:', err.message);
    content = `☕ **Brewbox Note (${dayName})**\n\nFailed to generate note. Error: ${err.message}\n\n_Try re-running the workflow manually._`;
  }

  // Read existing notes
  const notesPath = path.join(__dirname, '..', 'data', 'notes.json');
  let notes = [];
  try {
    notes = JSON.parse(fs.readFileSync(notesPath, 'utf-8'));
    if (!Array.isArray(notes)) notes = [];
  } catch { notes = []; }

  // Add new note
  notes.push({
    id: Date.now(),
    date: today.toISOString().split('T')[0],
    weekday: dayName,
    prompt,
    content,
    createdAt: today.toISOString(),
  });

  // Keep only last 365 days
  if (notes.length > 365) notes = notes.slice(-365);

  fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2), 'utf-8');
  console.log(`Wrote ${notes.length} notes to data/notes.json`);
}

main().catch(console.error);
