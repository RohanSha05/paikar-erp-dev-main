"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const httpError_1 = require("../httpError");
const jwt_1 = require("../jwt");
function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new httpError_1.HttpError(401, 'Unauthorized');
    }
    const token = authHeader.slice(7);
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.authUser = payload;
        next();
    }
    catch {
        throw new httpError_1.HttpError(401, 'Unauthorized');
    }
}
function requireRole(roles) {
    return (req, _res, next) => {
        if (!req.authUser) {
            throw new httpError_1.HttpError(401, 'Unauthorized');
        }
        if (!roles.includes(req.authUser.role)) {
            throw new httpError_1.HttpError(403, 'Forbidden');
        }
        next();
    };
}
