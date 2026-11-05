// Назначает роль пользователю по почте. Так появляется первый суперадмин: через сайт
// роль себе не выдать.
//
//   npm run set-role -- you@example.com superadmin
//
// Роли: user, editor, superadmin. Пользователь должен сначала зарегистрироваться на сайте.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const ROLES = ["user", "editor", "superadmin"];
const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error(`Использование: npm run set-role -- <почта> <${ROLES.join("|")}>`);
  process.exit(2);
}

config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env"), quiet: true });
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    "update users set role = $2, updated_at = now() where lower(email) = lower($1) returning id, name",
    [email, role],
  );
  if (!rows.length) {
    console.error(`Пользователь ${email} не найден. Сначала зарегистрируйтесь на сайте.`);
    process.exitCode = 1;
  } else {
    await client.query(
      "insert into audit_log (actor_id, action, target_type, target_id, details) values (null, 'user.role', 'user', $1, $2)",
      [String(rows[0].id), { role, via: "set-role" }],
    );
    console.log(`Готово: ${rows[0].name} (${email}) — ${role}`);
  }
} finally {
  await client.end();
}
