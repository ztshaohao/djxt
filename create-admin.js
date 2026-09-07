// 新增 / 重置管理员账号
// 用法：
//   npm run create-admin -- 用户名 密码
//   node src/create-admin.js zhangsan 123456
// 不传参数时，使用环境变量 ADMIN_USERNAME / ADMIN_PASSWORD，
// 再没有则用 config 里的 DEFAULT_ADMIN_USERNAME / DEFAULT_ADMIN_PASSWORD。

const { execSync } = require('child_process');
const prisma = require('./prisma');
const bcrypt = require('bcryptjs');
const config = require('./config');

async function ensureSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM admins LIMIT 1`;
  } catch (e) {
    console.log('[prisma] 同步数据库结构...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  }
}

async function createAdmin() {
  const username =
    process.argv[2] || process.env.ADMIN_USERNAME || config.DEFAULT_ADMIN_USERNAME;
  const password =
    process.argv[3] || process.env.ADMIN_PASSWORD || config.DEFAULT_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('请提供用户名和密码');
    process.exit(1);
  }
  if (String(password).length < 6) {
    console.error('密码长度至少 6 位');
    process.exit(1);
  }

  await ensureSchema();

  const exist = await prisma.admin.findUnique({ where: { username } });
  if (exist) {
    // 已存在则重置密码
    await prisma.admin.update({
      where: { username },
      data: { passwordHash: bcrypt.hashSync(String(password), 10) },
    });
    console.log(`管理员「${username}」已存在，密码已重置为：${password}`);
  } else {
    await prisma.admin.create({
      data: { username, passwordHash: bcrypt.hashSync(String(password), 10) },
    });
    console.log(`已新增管理员  账号：${username}  密码：${password}`);
  }

  const all = await prisma.admin.findMany({ select: { id: true, username: true } });
  console.log('当前管理员列表：', all.map((a) => a.username).join('、'));
}

createAdmin()
  .catch((e) => console.error('操作失败：', e.message))
  .finally(() => prisma.$disconnect());
