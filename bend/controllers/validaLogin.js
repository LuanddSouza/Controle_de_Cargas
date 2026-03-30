require("dotenv").config();

const { getConnection } = require("./db");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function getSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET não definido no .env");
    }
    return process.env.JWT_SECRET;
}

// validar a senha
function verifyPassword(password, hashFromDb) {
    try {
        if (!password || !hashFromDb) return false;
   
                const parts = hashFromDb.split(":");
                if (parts.length < 4) return false;
        
                const [algo, N, r, rest] = parts;
        
                if (!rest) return false;
        
                const restParts = rest.split("$");
                if (restParts.length < 3) return false;
        
                const [p, salt, keyHex] = restParts;
        
                const key = Buffer.from(keyHex, "hex");
        
                const derivedKey = crypto.scryptSync(password, salt, key.length, {
                    N: Number(N),
                    r: Number(r),
                    p: Number(p),
                    maxmem: 128 * 1024 * 1024
                });
        
                return crypto.timingSafeEqual(key, derivedKey); 


    } catch (err) {
        console.error("Erro no verifyPassword:", err);
        return false;
    }
}

// LOGIN CONTROLLER
async function login(req, res) {
    const { user, pass } = req.body;

    //validação básica
    if (!user || !pass) {
        return res.status(400).json({ erro: "Usuário e senha são obrigatórios" });
    }

    try {
        const conn = await getConnection();
        const result = await conn.execute(
             `SELECT USERID, SENHACRIP FROM U_USUARIOSCUSTO WHERE USERID = :userid`,
            { userid: user }
        );

        const usuario = result.rows[0];
        console.log("Login tentativa:", user);
        console.log("Encontrado:", !!usuario);

        if (!usuario) {
            return res.status(401).json({ erro: "Usuário inválido" });
        }

        const senhaHash = usuario.SENHACRIP || usuario[1];

        if (!senhaHash) {
            console.error("Hash não encontrado no usuário");
            return res.status(500).json({ erro: "Erro interno (hash)" });
        }

        const senhaValida = verifyPassword(pass, senhaHash);

        if (!senhaValida) {
            return res.status(401).json({ erro: "Senha inválida" });
        }

        //gera token
        const token = jwt.sign(
            {
                user: user,
               // tipo: 'adm' //adm ou o status referente a carga para os usuarios
            },
            getSecret(),
            { expiresIn: "1h" }
        );

        return res.json({
            ok: true,
            token
        });

    } catch (err) {
        console.error("ERRO REAL LOGIN:", err);

        return res.status(500).json({
            erro: "Erro no servidor"
        });
    }
}

module.exports = { login };