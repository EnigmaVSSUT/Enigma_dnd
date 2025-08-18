"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv").config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const auth_routes_1 = __importDefault(require("./routes/auth/auth.routes"));
const form_routes_1 = __importDefault(require("./routes/form/form.routes"));
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/form", form_routes_1.default);
app.get("/", (req, res) => {
    res.status(200).json({
        info: "Drag and drop form builder api",
        version: "v1",
        dev: "Gyanranjan Patra & Dharmendra Mahanta"
    });
});
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT || 3000}`);
});
