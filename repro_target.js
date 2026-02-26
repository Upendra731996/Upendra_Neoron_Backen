const express = require('express');
const app = express();
const port = 8000;

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Target server listening on port ${port}`);
});
