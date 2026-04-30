import { validateApiKey } from "./api-keys.service.js";
export async function requireApiKey(req, res, next) {
    const raw = req.headers["x-api-key"] ||
        (req.headers.authorization?.startsWith("Bearer sk_")
            ? req.headers.authorization.slice(7)
            : null);
    if (!raw) {
        return res.status(401).json({
            error: "API key required",
            message: "Provide API key via X-Api-Key header or Authorization: Bearer sk_...",
        });
    }
    const key = await validateApiKey(raw);
    if (!key) {
        return res.status(403).json({
            error: "Invalid or disabled API key",
        });
    }
    req.apiKeyId = key.id;
    req.apiKeyName = key.name;
    next();
}
//# sourceMappingURL=api-key.middleware.js.map