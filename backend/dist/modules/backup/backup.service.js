/**
 * Сервис бэкапов: pg_dump (создание), хранение по дням, список, скачивание, psql (восстановление)
 * Требует postgresql-client в контейнере (apk add postgresql-client)
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, writeFile, readFile, rm, readdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(process.cwd(), "backups");
/** Парсит DATABASE_URL в объект подключения */
export function parseDatabaseUrl(url) {
    try {
        const u = new URL(url.replace(/^postgresql:\/\//i, "postgres://"));
        const password = u.password ? decodeURIComponent(u.password) : "";
        return {
            host: u.hostname || "localhost",
            port: u.port ? parseInt(u.port, 10) : 5432,
            user: u.username || "postgres",
            password,
            database: u.pathname ? u.pathname.slice(1).replace(/\/.*$/, "") : "postgres",
        };
    }
    catch {
        return null;
    }
}
/** Запускает pg_dump и стримит вывод в переданный поток */
export function runPgDump(db) {
    return new Promise((resolve, reject) => {
        const env = { ...process.env, PGPASSWORD: db.password };
        const proc = spawn("pg_dump", ["-h", db.host, "-p", String(db.port), "-U", db.user, "-d", db.database, "-F", "p", "--no-owner", "--no-acl", "--clean", "--if-exists"], { env });
        proc.on("error", (err) => reject(err));
        proc.stderr?.on("data", (chunk) => console.error("[pg_dump]", chunk.toString()));
        proc.on("close", (code) => {
            if (code !== 0)
                reject(new Error(`pg_dump exited with code ${code}`));
        });
        resolve({ stream: proc.stdout });
    });
}
/** Создаёт бэкап на диск в папку по дате (backups/YYYY/MM/DD/) и возвращает путь и имя файла */
export async function saveBackupToFile(db) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const time = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `stealthnet-backup-${time}.sql`;
    const dirPath = path.join(BACKUPS_DIR, String(y), m, d);
    const fullPath = path.join(dirPath, filename);
    const relativePath = path.join(String(y), m, d, filename);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dirPath, { recursive: true });
    await new Promise((resolve, reject) => {
        const env = { ...process.env, PGPASSWORD: db.password };
        const proc = spawn("pg_dump", ["-h", db.host, "-p", String(db.port), "-U", db.user, "-d", db.database, "-F", "p", "--no-owner", "--no-acl", "--clean", "--if-exists"], { env });
        const out = createWriteStream(fullPath);
        proc.stdout?.pipe(out);
        proc.stderr?.on("data", (chunk) => console.error("[pg_dump]", chunk.toString()));
        proc.on("error", reject);
        out.on("finish", () => resolve());
        out.on("error", reject);
        proc.on("close", (code) => {
            if (code !== 0)
                reject(new Error(`pg_dump exited with code ${code}`));
        });
    });
    return { relativePath, filename, fullPath };
}
/** Список бэкапов (рекурсивно по backups/YYYY/MM/DD/) */
export async function listBackups() {
    const items = [];
    try {
        await walkDir(BACKUPS_DIR, "");
    }
    catch (e) {
        if (e.code !== "ENOENT")
            throw e;
    }
    return items.sort((a, b) => b.date.localeCompare(a.date));
    async function walkDir(dir, prefix) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const e of entries) {
            const rel = prefix ? path.join(prefix, e.name) : e.name;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                await walkDir(full, rel);
            }
            else if (e.isFile() && e.name.endsWith(".sql")) {
                const st = await stat(full);
                items.push({
                    path: rel.replace(/\\/g, "/"),
                    filename: e.name,
                    date: path.dirname(rel).replace(/\\/g, "/"),
                    size: st.size,
                });
            }
        }
    }
}
/** Безопасно разрешает относительный путь к файлу бэкапа; возвращает полный путь или null */
export function resolveBackupPath(relativePath) {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.join(BACKUPS_DIR, normalized);
    const base = path.resolve(BACKUPS_DIR);
    if (!full.startsWith(base) || path.relative(base, full).startsWith(".."))
        return null;
    return full;
}
/** Стрим файла бэкапа для скачивания */
export function createBackupReadStream(relativePath) {
    const full = resolveBackupPath(relativePath);
    if (!full)
        return null;
    try {
        return createReadStream(full);
    }
    catch {
        return null;
    }
}
/** Читает файл бэкапа в буфер (для восстановления с сервера) */
export async function readBackupFile(relativePath) {
    const full = resolveBackupPath(relativePath);
    if (!full)
        return null;
    try {
        return await readFile(full);
    }
    catch {
        return null;
    }
}
/** Параметры SET из дампов PG17+, которые неизвестны в более старых версиях — убираем при восстановлении */
const STRIP_SET_PARAMS = ["transaction_timeout"];
function filterSqlForRestore(sqlBuffer) {
    const sql = sqlBuffer.toString("utf8");
    return sql
        .split("\n")
        .filter((line) => {
        const t = line.trim();
        if (!t.toUpperCase().startsWith("SET "))
            return true;
        const param = t.replace(/^\s*SET\s+/i, "").split(/\s+/)[0];
        if (!param)
            return true;
        const name = param.replace(/^["']|["']$/g, "");
        return !STRIP_SET_PARAMS.some((p) => name.toLowerCase() === p.toLowerCase());
    })
        .join("\n");
}
function runPsql(db, sql) {
    return new Promise((resolve, reject) => {
        const env = { ...process.env, PGPASSWORD: db.password };
        const proc = spawn("psql", ["-h", db.host, "-p", String(db.port), "-U", db.user, "-d", db.database, "-v", "ON_ERROR_STOP=1"], { env, stdio: ["pipe", "pipe", "pipe"] });
        let stderr = "";
        let stdout = "";
        proc.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
        proc.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
        proc.on("error", (err) => reject(new Error(`psql не запущен: ${err.message}. Установите postgresql-client.`)));
        proc.on("close", (code, signal) => {
            if (code !== 0) {
                const out = [stderr, stdout].filter(Boolean).join("\n").trim() || "Нет вывода";
                reject(new Error(`psql: ${out}`));
            }
            else
                resolve();
        });
        proc.stdin?.end(sql, "utf8");
    });
}
const CLEAN_SCHEMA_SQL = `
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO public;
GRANT CREATE ON SCHEMA public TO public;
`;
/** Восстанавливает БД из SQL (буфер). Сначала очищает схему public, затем применяет дамп */
export async function runPgRestore(db, sqlBuffer) {
    await runPsql(db, CLEAN_SCHEMA_SQL);
    const dir = await mkdtemp(path.join(tmpdir(), "stealthnet-restore-"));
    const sqlPath = path.join(dir, "restore.sql");
    try {
        const sqlContent = filterSqlForRestore(sqlBuffer);
        await writeFile(sqlPath, sqlContent, "utf8");
        await new Promise((resolve, reject) => {
            const env = { ...process.env, PGPASSWORD: db.password };
            const proc = spawn("psql", ["-h", db.host, "-p", String(db.port), "-U", db.user, "-d", db.database, "-f", sqlPath, "-v", "ON_ERROR_STOP=1", "--set", "ON_ERROR_STOP=1"], { env });
            let stderr = "";
            let stdout = "";
            proc.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
            proc.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
            proc.on("error", (err) => reject(new Error(`psql не запущен: ${err.message}. Установите postgresql-client.`)));
            proc.on("close", (code, signal) => {
                if (code !== 0) {
                    const out = [stderr, stdout].filter(Boolean).join("\n").trim() || "Нет вывода";
                    reject(new Error(`psql завершился с кодом ${code}${signal ? ` (${signal})` : ""}. ${out}`));
                }
                else
                    resolve();
            });
        });
    }
    finally {
        await rm(dir, { recursive: true, force: true });
    }
}
//# sourceMappingURL=backup.service.js.map