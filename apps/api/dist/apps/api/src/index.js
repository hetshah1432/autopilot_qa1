"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const projects_1 = __importDefault(require("./routes/projects"));
const scans_1 = __importDefault(require("./routes/scans"));
const reports_1 = __importDefault(require("./routes/reports"));
const auth_1 = require("./middleware/auth");
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const status_1 = __importDefault(require("./routes/status"));
const auth_2 = __importDefault(require("./routes/auth"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// 1. Middlewares
if (process.env.NODE_ENV !== 'production') {
    app.use((0, morgan_1.default)('dev'));
}
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// 2. Health check (no auth needed)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/status', status_1.default);
// 3. Authenticated routes
app.use('/api/projects', auth_1.requireAuth, projects_1.default);
app.use('/api/scans', auth_1.requireAuth, scans_1.default);
app.use('/api/auth', auth_1.requireAuth, auth_2.default);
app.use('/api/reports', reports_1.default);
app.listen(port, () => {
    console.log(`API server is running at http://localhost:${port}`);
});
