"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uid = uid;
const crypto_1 = require("crypto");
function uid(prefix) {
    return `${prefix}_${(0, crypto_1.randomUUID)().replace(/-/g, '')}`;
}
