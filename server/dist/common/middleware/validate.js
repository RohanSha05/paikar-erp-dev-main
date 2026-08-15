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
        req.body = parsed.body;
        req.params = parsed.params;
        req.query = parsed.query;
        next();
    };
}
