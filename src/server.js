import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 IELTS Writing Feedback Tool (MVP)`);
  console.log(`🌐 Local Server running on: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
