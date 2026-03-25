require("dotenv").config();

const express = require("express");
const { login } = require("./bend/controllers/login");
const cors = require("cors");
const authMiddleware = require("./middlewares/authMiddleware");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// frontend
app.use(express.static(path.join(__dirname, "fend", "Templates")));

// rota de login
app.post("/login", login);

// rota protegida
app.get("/home", authMiddleware, (req, res) => {
    res.json({
        msg: "Acesso liberado",
        user: req.user
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 3000");
});