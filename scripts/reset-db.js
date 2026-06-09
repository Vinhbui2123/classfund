const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env.local
const envPath = path.join(__dirname, '../.env.local');
let databaseUrl = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      databaseUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
} catch (err) {
  console.error('Không tìm thấy tệp .env.local hoặc không đọc được DATABASE_URL');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('DATABASE_URL không được định nghĩa trong .env.local');
  process.exit(1);
}

async function reset() {
  console.log('Đang kết nối database và xóa bảng...');
  const sql = neon(databaseUrl);
  
  try {
    // Drop all tables in cascade mode
    await sql`DROP TABLE IF EXISTS transactions CASCADE;`;
    await sql`DROP TABLE IF EXISTS expenses CASCADE;`;
    await sql`DROP TABLE IF EXISTS campaign_members CASCADE;`;
    await sql`DROP TABLE IF EXISTS campaigns CASCADE;`;
    await sql`DROP TABLE IF EXISTS members CASCADE;`;
    await sql`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;`;
    
    console.log('🎉 Đã xóa sạch toàn bộ các bảng và dữ liệu trong database!');
    console.log('Đang chạy db:push để khởi tạo lại cấu trúc bảng trống...');
    
    // Run drizzle-kit push automatically using child_process
    const { execSync } = require('child_process');
    execSync('npm run db:push -- --force', { stdio: 'inherit' });
    
    console.log('✅ Đã reset database về trạng thái trống thành công!');
  } catch (error) {
    console.error('❌ Lỗi khi reset database:', error);
    process.exit(1);
  }
}

reset();
