require("dotenv").config();

const express = require("express");
const { login } = require("./bend/controllers/validaLogin");
const cors = require("cors");
const authMiddleware = require("./middlewares/authMiddleware");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// rota POST (API)
app.post("/validaLogin", login);

// rota GET (página login)
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "fend", "Templates", "login.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "fend", "Templates", "index.html"));
});

// rota protegida
app.get("/home", authMiddleware, (req, res) => {
    res.json({
        msg: "Acesso liberado",
        user: req.user
    });
});

//FRONTEND (DEPOIS DAS ROTAS)
app.use(express.static(path.join(__dirname, "fend")));

// servidor
app.listen(3000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 3000");
});