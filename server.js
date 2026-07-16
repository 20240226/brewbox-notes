// Minimal static server for brewbox-notes (no Coze API calls)
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/data', express.static(path.join(__dirname, 'data')));

// SPA fallback — serve index.html for all non-file routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => console.log(`Brewbox Notes running on port ${port}`));
