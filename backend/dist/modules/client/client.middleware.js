import { verifyClientToken } from "./client.service.js";
import { prisma } from "../../db.js";
const BEARER = "Bearer ";
export async function requireClientAuth(req, res, next) {
    const raw = req.headers.authorization;
    const token = typeof raw === "string" && raw.startsWith(BEARER) ? raw.slice(BEARER.length) : null;
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = verifyClientToken(token);
    if (!payload) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
    const client = await prisma.client.findUnique({ where: { id: payload.clientId } });
    if (!client || client.isBlocked) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.clientId = client.id;
    req.client = client;
    next();
}
//# sourceMappingURL=client.middleware.js.map