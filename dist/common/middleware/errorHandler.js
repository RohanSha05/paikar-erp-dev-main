"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const httpError_1 = require("../httpError");
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: err.flatten()
        });
    }
    if (err instanceof httpError_1.HttpError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            details: err.details
        });
    }
    console.error(err);
    return res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
}
