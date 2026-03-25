require("dotenv").config();
const { getConnection } = require("./db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function getSecret() {
    return process.env.JWT_SECRET;
}

function verifyPassword(password, hashFromDb) {
    const [algo, N, r, rest] = hashFromDb.split(':');

    const [p, salt, keyHex] = rest.split('$');

    const key = Buffer.from(keyHex, 'hex');

    const derivedKey = crypto.scryptSync(password, salt, key.length, {
        N: Number(N),
        r: Number(r),
        p: Number(p),
        maxmem: 128 * 1024 * 1024 // 128MB
    });

    return crypto.timingSafeEqual(key, derivedKey);
}


async function login(req, res) {
    const { user, pass } = req.body;

    try {
        const conn = await getConnection();

        const result = await conn.execute(
            `SELECT * FROM NP_USUARIOSCUSTO WHERE USERID = :userid`,
            { userid: user }
        );
        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({ erro: "Usuário inválido" });
        }
        const senhaHash = usuario[2]

        if (!verifyPassword(pass, senhaHash)) {
            return res.status(401).json({ erro: "Senha inválida" });
        }
        const token = jwt.sign(
            {
                user: user
                //role: usuario.TIPO // adicionar tipos de usuario
            },
            getSecret(),
            { expiresIn: "1h" }
        );
        res.json({ ok: true, token });

    } catch (err) {
        console.error("ERRO REAL:", err);
        res.status(500).json({ erro: "Erro no servidor" });
    }
}

module.exports = { login };