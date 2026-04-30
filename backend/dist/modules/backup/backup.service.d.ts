/**
 * Сервис бэкапов: pg_dump (создание), хранение по дням, список, скачивание, psql (восстановление)
 * Требует postgresql-client в контейнере (apk add postgresql-client)
 */
export interface DbConnection {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}
/** Парсит DATABASE_URL в объект подключения */
export declare function parseDatabaseUrl(url: string): DbConnection | null;
/** Запускает pg_dump и стримит вывод в переданный поток */
export declare function runPgDump(db: DbConnection): Promise<{
    stream: NodeJS.ReadableStream;
    cleanup?: () => Promise<void>;
}>;
/** Создаёт бэкап на диск в папку по дате (backups/YYYY/MM/DD/) и возвращает путь и имя файла */
export declare function saveBackupToFile(db: DbConnection): Promise<{
    relativePath: string;
    filename: string;
    fullPath: string;
}>;
export interface BackupItem {
    path: string;
    filename: string;
    date: string;
    size: number;
}
/** Список бэкапов (рекурсивно по backups/YYYY/MM/DD/) */
export declare function listBackups(): Promise<BackupItem[]>;
/** Безопасно разрешает относительный путь к файлу бэкапа; возвращает полный путь или null */
export declare function resolveBackupPath(relativePath: string): string | null;
/** Стрим файла бэкапа для скачивания */
export declare function createBackupReadStream(relativePath: string): NodeJS.ReadableStream | null;
/** Читает файл бэкапа в буфер (для восстановления с сервера) */
export declare function readBackupFile(relativePath: string): Promise<Buffer | null>;
/** Восстанавливает БД из SQL (буфер). Сначала очищает схему public, затем применяет дамп */
export declare function runPgRestore(db: DbConnection, sqlBuffer: Buffer): Promise<void>;
//# sourceMappingURL=backup.service.d.ts.map