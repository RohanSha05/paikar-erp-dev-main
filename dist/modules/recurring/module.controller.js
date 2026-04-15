"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.post = post;
const service = __importStar(require("./module.service"));
async function list(_req, res) {
    const templates = await service.listRecurringTemplates();
    return res.json({ success: true, data: templates });
}
async function create(req, res) {
    const template = await service.createRecurringTemplate(req.body);
    return res.status(201).json({ success: true, message: 'Recurring template created', data: template });
}
async function update(req, res) {
    const template = await service.updateRecurringTemplate(req.params.id, req.body);
    return res.json({ success: true, message: 'Recurring template updated', data: template });
}
async function remove(req, res) {
    await service.deleteRecurringTemplate(req.params.id);
    return res.json({ success: true, message: 'Recurring template deleted' });
}
async function post(req, res) {
    const year = Number(req.query.year || new Date().getFullYear());
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const result = await service.postRecurringTemplate(req.params.id, year, month);
    return res.json({ success: true, message: 'Recurring template posted', data: result });
}
