"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema) {
    return (req, _res, next) => {
        schema.parse({
            body: req.body,
            params: req.params,
            query: req.query
        });
        next();
    };
}
