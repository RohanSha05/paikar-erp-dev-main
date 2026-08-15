"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const pino_http_1 = __importDefault(require("pino-http"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./common/middleware/errorHandler");
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN,
    credentials: true
}));
exports.app.use((0, helmet_1.default)());
exports.app.use((0, compression_1.default)());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use(express_1.default.json({ limit: '1mb' }));
exports.app.use((0, pino_http_1.default)({ logger: logger_1.logger }));
exports.app.use('/api/v1', routes_1.default);
exports.app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
exports.app.use(errorHandler_1.errorHandler);
