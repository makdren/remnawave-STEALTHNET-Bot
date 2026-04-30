import { randomBytes, createHash } from "crypto";
import { prisma } from "../../db.js";
const KEY_PREFIX_LEN = 8;
function hashKey(key) {
    return createHash("sha256").update(key).digest("hex");
}
export function generateApiKey() {
    const raw = "sk_" + randomBytes(32).toString("hex");
    const prefix = raw.slice(0, KEY_PREFIX_LEN);
    const hash = hashKey(raw);
    return { raw, prefix, hash };
}
export async function createApiKey(name, description) {
    const { raw, prefix, hash } = generateApiKey();
    const record = await prisma.apiKey.create({
        data: { name, description, keyHash: hash, prefix },
    });
    return { ...record, rawKey: raw };
}
export async function listApiKeys() {
    return prisma.apiKey.findMany({
        select: {
            id: true,
            name: true,
            description: true,
            prefix: true,
            isActive: true,
            lastUsedAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });
}
export async function deleteApiKey(id) {
    return prisma.apiKey.delete({ where: { id } });
}
export async function toggleApiKey(id, isActive) {
    return prisma.apiKey.update({
        where: { id },
        data: { isActive },
    });
}
export async function validateApiKey(raw) {
    const hash = hashKey(raw);
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key || !key.isActive)
        return null;
    prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        .catch(() => { });
    return key;
}
//# sourceMappingURL=api-keys.service.js.map