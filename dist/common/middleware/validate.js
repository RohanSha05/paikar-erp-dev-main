"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema) {
    return (req, _res, next) => {
        const parsed = schema.parse({
            body: req.body,
            params: req.params,
            query: req.query
        });
        // Preserve existing request fields when a schema validates only one part
        // (e.g. params-only middleware before body middleware).
        if (parsed.body !== undefined) {
            req.body = parsed.body;
        }
        if (parsed.params !== undefined) {
            req.params = parsed.params;
        }
        if (parsed.query !== undefined) {
            req.query = parsed.query;
        }
        next();
    };
}
