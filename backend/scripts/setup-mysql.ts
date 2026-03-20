import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { execSync } from "child_process";
import * as readline from "readline";

const projectRoot = path.resolve(__dirname, "..", "..");
const backendDir = path.join(projectRoot, "backend");
const envPath = path.join(backendDir, ".env");
const envExamplePath = path.join(backendDir, ".env.example");
const schemaPath = path.join(backendDir, "prisma", "schema.prisma");

function ensureEnvFile() {
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
    } else {
      // минимальный дефолт
      fs.writeFileSync(
        envPath,
        `DB_URL=mysql://root@localhost:3306/exam_project\nJWT_SECRET=\nFRONTEND_URL=http://localhost:5173\nPORT=4000\n`,
        "utf8"
      );
    }
  }
}

function readEnvFile(): Record<string, string> {
  ensureEnvFile();
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  const out: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

function writeEnvFile(next: Record<string, string>) {
  const current = readEnvFile();
  const merged = { ...current, ...next };

  const keys = Object.keys(merged);
  const content = keys
    .map((k) => {
      const v = merged[k];
      return `${k}=${v ?? ""}`;
    })
    .join("\n");
  fs.writeFileSync(envPath, content + "\n", "utf8");
}

function parseMysqlUrl(dbUrl: string) {
  const u = new URL(dbUrl);
  if (u.protocol !== "mysql:") {
    throw new Error(`DB_URL must start with mysql://, got: ${dbUrl}`);
  }
  const host = u.hostname;
  const port = Number(u.port || 3306);
  const user = decodeURIComponent(u.username);
  const password = u.password ? decodeURIComponent(u.password) : "";
  const database = u.pathname.replace(/^\//, "");
  return { host, port, user, password, database };
}

async function promptHidden(query: string) {
  // Простой "скрытый" ввод: echo не выключаем (в PowerShell может быть непредсказуемо),
  // но это достаточно для учебного проекта.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  ensureEnvFile();
  dotenv.config({ path: envPath });

  const raw = readEnvFile();

  // Set defaults if env is empty
  let dbUrl = raw.DB_URL || process.env.DB_URL || "";
  if (!dbUrl.trim()) {
    dbUrl = "mysql://root@localhost:3306/exam_project";
  }

  let jwtSecret = raw.JWT_SECRET || process.env.JWT_SECRET || "";
  if (!jwtSecret.trim() || jwtSecret.length < 16) {
    jwtSecret = crypto.randomBytes(24).toString("hex");
  }

  // Ensure env contains correct values (so prisma schema validation won't fail)
  writeEnvFile({
    ...raw,
    DB_URL: dbUrl,
    JWT_SECRET: jwtSecret,
  });

  let { host, port, user, password, database } = parseMysqlUrl(dbUrl);

  // 1) Connect to MySQL server (without DB) to inspect/alter auth plugin and create DB
  let conn: mysql.Connection;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: false,
    });
  } catch (e: any) {
    const isAccessDenied =
      e?.code === "ER_ACCESS_DENIED_ERROR" ||
      e?.errno === 1045 ||
      String(e?.message ?? "").toLowerCase().includes("access denied");

    if (!isAccessDenied) throw e;

    // Любая ошибка авторизации — просим пароль один раз.
    const entered = await promptHidden(`MySQL password for '${user}' (access denied). Enter: `);
    if (!entered || !entered.trim()) {
      throw new Error("Empty MySQL password entered. Aborting setup.");
    }

    password = entered;
    dbUrl = `mysql://${encodeURIComponent(user)}:${encodeURIComponent(
      password
    )}@${host}:${port}/${database}`;
    writeEnvFile({
      ...raw,
      DB_URL: dbUrl,
      JWT_SECRET: jwtSecret,
    });

    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: false,
    });
  }

  const [rows] = await conn.query<any[]>(
    `SELECT user, host, plugin
     FROM mysql.user
     WHERE user = ? AND (host = 'localhost' OR host = '127.0.0.1' OR host = '%' OR host = ? OR host = '::1')`,
    [user, host]
  );

  // 2) If plugin is sha256_password, switch to mysql_native_password
  const escapeSqlString = (s: string) => s.replace(/'/g, "''");

  for (const r of rows) {
    if (!r.plugin) continue;
    const plugin = String(r.plugin);
    if (plugin === "sha256_password") {
      try {
        await conn.query(
          `ALTER USER '${escapeSqlString(user)}'@'${escapeSqlString(String(r.host))}' IDENTIFIED WITH mysql_native_password`
        );
      } catch (e) {
        // Some configs require BY clause; if we have a password from DB_URL, retry.
        if (password !== "") {
          await conn.query(
            `ALTER USER '${escapeSqlString(user)}'@'${escapeSqlString(String(r.host))}' IDENTIFIED WITH mysql_native_password BY '${escapeSqlString(
              password
            )}'`
          );
        } else {
          throw e;
        }
      }
    }
    if (plugin === "caching_sha2_password") {
      // Convert to a driver-friendly default too
      try {
        await conn.query(
          `ALTER USER '${escapeSqlString(user)}'@'${escapeSqlString(String(r.host))}' IDENTIFIED WITH mysql_native_password`
        );
      } catch (e) {
        if (password !== "") {
          await conn.query(
            `ALTER USER '${escapeSqlString(user)}'@'${escapeSqlString(String(r.host))}' IDENTIFIED WITH mysql_native_password BY '${escapeSqlString(
              password
            )}'`
          );
        } else {
          throw e;
        }
      }
    }
  }

  await conn.query(`FLUSH PRIVILEGES`);

  // 3) Ensure database exists
  if (!database) {
    throw new Error("DB_URL must include database name, e.g. mysql://user:pass@localhost:3306/exam_project");
  }

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  // 4) Run Prisma
  console.log("Running prisma generate...");
  execSync(`npx prisma generate --schema "${schemaPath}"`, {
    stdio: "inherit",
    cwd: backendDir,
  });

  console.log("Running prisma migrate dev...");
  execSync(`npx prisma migrate dev --schema "${schemaPath}"`, {
    stdio: "inherit",
    cwd: backendDir,
  });

  // Migrate dev usually runs seed, but we ensure it explicitly
  console.log("Running prisma db seed (if needed)...");
  execSync(`npx prisma db seed --schema "${schemaPath}"`, {
    stdio: "inherit",
    cwd: backendDir,
  });

  console.log("Setup completed successfully.");
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Setup failed:", e);
  process.exitCode = 1;
});

