"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const prisma_1 = require("./db/prisma");
const logger_1 = require("./config/logger");
const server = app_1.app.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`Backend running on port ${env_1.env.PORT}`);
});
function shutdown(signal) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.info(`Received ${signal}, shutting down`);
        server.close(() => __awaiter(this, void 0, void 0, function* () {
            yield prisma_1.prisma.$disconnect();
            process.exit(0);
        }));
    });
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
