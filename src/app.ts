import express from 'express';
const app = express();
app.get('/health', (req, res) => res.send('OK'));
export default app;
