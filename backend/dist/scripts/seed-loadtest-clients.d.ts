/**
 * Массовое создание тестовых клиентов для нагрузочного теста БД.
 *
 * Использование:
 *   LOADTEST_COUNT=30000 npx tsx src/scripts/seed-loadtest-clients.ts
 *   LOADTEST_COUNT=1000 npx tsx src/scripts/seed-loadtest-clients.ts   # быстрая проверка
 *
 * Удалить всех тестовых (email *@loadtest.local):
 *   npx tsx src/scripts/seed-loadtest-clients.ts --cleanup
 */
import "dotenv/config";
//# sourceMappingURL=seed-loadtest-clients.d.ts.map