import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 IELTS Writing Feedback Tool (MVP)`);
  console.log(`🌐 Local Server running on: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
