const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ erro: "Token não enviado" });
    }

    // formato: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET);

        // salva dados do usuário na requisição
        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({ erro: "Token inválido" });
    }
}

module.exports = authMiddleware;