"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uid = uid;
let uidCounter = 0;
function yyyymmdd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}
function uid(prefix) {
    uidCounter = (uidCounter % 999) + 1;
    return `${prefix}-${yyyymmdd(new Date())}-${String(uidCounter).padStart(3, '0')}`;
}
