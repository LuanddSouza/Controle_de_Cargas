require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { login } = require("./bend/controllers/validaLogin");
const { atualizaStatus } = require("./bend/controllers/atualizaStatus");
const authMiddleware = require("./middlewares/authMiddleware");
const { getConnection } = require("./bend/controllers/db");
const oracledb = require('oracledb');
const crypto = require("crypto");
const app = express();

function hashPassword(password) {
    const algo = "scrypt";
    const N = 16384;
    const r = 8;
    const p = 1;

    const salt = crypto.randomBytes(16).toString("hex");

    const key = crypto.scryptSync(password, salt, 64, {
        N,
        r,
        p,
        maxmem: 128 * 1024 * 1024
    });


    return `${algo}:${N}:${r}:${p}$${salt}$${key.toString("hex")}`;
}

app.use(cors());
app.use(express.json());

// LOGIN
app.post("/validaLogin", login);

// Atualizar status
app.post("/atualizaStatus", atualizaStatus);

// FRONT
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "fend", "Templates", "login.html"));
});

app.get("/addUser", (req, res) => {
    res.sendFile(path.join(__dirname, "fend", "Templates", "addUser.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "fend", "Templates", "index.html"));
});


// HOME
app.get("/home", authMiddleware, (req, res) => {
    res.json({
        msg: "Acesso liberado",
        user: req.user,
        tipo: req.tipo
    });
});

// CARGAS
app.get("/cargas", authMiddleware, async (req, res) => {
    try {
        let { estab, data } = req.query;

        if (!estab || !data) {
            return res.status(400).json({ erro: "Estabelecimento e data são obrigatórios" });
        }

        let d = new Date(data);
        d.setDate(d.getDate() + 1);

        data = d.toLocaleDateString('pt-BR');

        console.log("FILTRO:", estab, data);
        const conn = await getConnection();

        const result = await conn.execute(
            `SELECT 
    t.idcarga,
   -- t.represent,
    t.coordenador,

    TO_CHAR(MAX(CASE WHEN s.carregamento = 'S' THEN l.datalancamento END), 'HH24:MI:SS') AS horacarrega,
    SUM(i.quantidade) AS quantidade,
    TO_CHAR(MAX(CASE WHEN s.qualidade = 'S' THEN l.datalancamento END), 'HH24:MI:SS') AS horaqualidade,
    t.placa,


    t.motorista,
    t.tipocarga,
    TO_CHAR(MAX(CASE WHEN s.faturamento = 'S' THEN l.datalancamento END), 'HH24:MI:SS') AS horafaturamento,

    COALESCE(
      MAX(
          CASE 
              WHEN l.datalancamento IS NOT NULL 
               AND l.datalancamento > DATE '1900-01-01'
              THEN s.descricao
          END
      ) KEEP (DENSE_RANK LAST ORDER BY l.datalancamento),null
    ) AS status
FROM 
(
    SELECT 
        ordemcargacab.estab,
        ordemcargacab.idcarga,
        preprese.represent,
        preprese.descricao coordenador,    
        ordemcargatransp.placa,

        CASE 
            WHEN ppesspre.nome IS NOT NULL THEN 
                ppesspre.nome || ' - celular: ' || ppesspre.celular
        END motorista,

        UPPER(ordemcargacab_u.tipocarga) tipocarga,

        ordemcargadoc.iddoc,
        ordemcargadoc.estabped, 
        ordemcargadoc.serieped,
        ordemcargadoc.numeroped    

    FROM ordemcargacab 

    LEFT JOIN ordemcargadoc 
        ON ordemcargadoc.idcarga = ordemcargacab.idcarga     
        
    LEFT JOIN pedcab 
        ON pedcab.estab = ordemcargadoc.estabped
        AND pedcab.serie = ordemcargadoc.serieped
        AND pedcab.numero = ordemcargadoc.numeroped 

    LEFT JOIN preprese 
        ON preprese.represent = pedcab.canaldevenda
        AND preprese.empresa = 1

    LEFT JOIN ordemcargatransp 
        ON ordemcargatransp.idcarga = ordemcargacab.idcarga 

    LEFT JOIN ppesspre    
        ON ppesspre.empresa = 1
        AND ppesspre.prestador = idmotorista

    LEFT JOIN ordemcargacab_u 
        ON ordemcargacab_u.idcarga = ordemcargacab.idcarga 
        
    WHERE ordemcargacab.estab = :estab
    AND ordemcargacab.dtinclusao =  TO_DATE(:data, 'DD/MM/YYYY')

) t

LEFT JOIN u_logstatusagendamento l
    ON l.estab = t.estab 
    AND l.numagendamento = t.idcarga

LEFT JOIN u_statusagendamento s
    ON s.u_statusagendamento_id = l.u_statusagendamento_id

INNER JOIN (
    SELECT 
        iddoc,
        estabped,
        serieped,
        numeroped,        
        ROUND(SUM((quantidade * CASE WHEN itemagro.unidade IN ('SC','FD') THEN itemagro.pesobruto ELSE 1 END)) / 1000,2) AS quantidade        
    FROM ordemcargaitem
         INNER JOIN itemagro on 
            itemagro.item = ordemcargaitem.item 
    GROUP BY 
        iddoc,
        estabped,
        serieped,
        numeroped
) i
    ON i.iddoc = t.iddoc
GROUP BY 
    t.idcarga,
    t.represent,
    t.coordenador,
    t.placa,
    t.motorista,
    t.tipocarga

ORDER BY 
    t.idcarga` ,
            {
                estab,
                data
            }
        );

        res.json(result.rows);

    } catch (err) {
        console.error("ERRO SQL:", err);
        res.status(500).json({ erro: "Erro ao buscar cargas" });
    }
});

// CARGAS COMERCIAL
app.get("/cargasComercial", authMiddleware, async (req, res) => {
    try {
        let { estab, data } = req.query;

        if (!estab || !data) {
            return res.status(400).json({ erro: "Estabelecimento e data são obrigatórios" });
        }

        let d = new Date(data);
        d.setDate(d.getDate() + 1);

        data = d.toLocaleDateString('pt-BR');

        console.log("FILTRO:", estab, data);
        const conn = await getConnection();

        const result = await conn.execute(
            `SELECT 
    t.idcarga,
   -- t.represent,
    t.coordenador,
    t.placa,


    t.motorista,
    t.tipocarga,
        TO_CHAR(MAX(CASE WHEN s.faturamento = 'S' THEN l.datalancamento END), 'HH24:MI:SS') AS horafaturamento,

    COALESCE(
      MAX(
          CASE 
              WHEN l.datalancamento IS NOT NULL 
               AND l.datalancamento > DATE '1900-01-01'
              THEN s.descricao
          END
      ) KEEP (DENSE_RANK LAST ORDER BY l.datalancamento),null
    ) AS status
FROM 
(
    SELECT 
        ordemcargacab.estab,
        ordemcargacab.idcarga,
        preprese.represent,
        preprese.descricao coordenador,    
        ordemcargatransp.placa,

        CASE 
            WHEN ppesspre.nome IS NOT NULL THEN 
                ppesspre.nome || ' - celular: ' || ppesspre.celular
        END motorista,

        UPPER(ordemcargacab_u.tipocarga) tipocarga,

        ordemcargadoc.iddoc,
        ordemcargadoc.estabped, 
        ordemcargadoc.serieped,
        ordemcargadoc.numeroped    

    FROM ordemcargacab 

    LEFT JOIN ordemcargadoc 
        ON ordemcargadoc.idcarga = ordemcargacab.idcarga     
        
    LEFT JOIN pedcab 
        ON pedcab.estab = ordemcargadoc.estabped
        AND pedcab.serie = ordemcargadoc.serieped
        AND pedcab.numero = ordemcargadoc.numeroped 

    LEFT JOIN preprese 
        ON preprese.represent = pedcab.canaldevenda
        AND preprese.empresa = 1

    LEFT JOIN ordemcargatransp 
        ON ordemcargatransp.idcarga = ordemcargacab.idcarga 

    LEFT JOIN ppesspre    
        ON ppesspre.empresa = 1
        AND ppesspre.prestador = idmotorista

    LEFT JOIN ordemcargacab_u 
        ON ordemcargacab_u.idcarga = ordemcargacab.idcarga 
        
    WHERE ordemcargacab.estab = :estab
    AND ordemcargacab.dtinclusao =  TO_DATE(:data, 'DD/MM/YYYY')

) t

LEFT JOIN u_logstatusagendamento l
    ON l.estab = t.estab 
    AND l.numagendamento = t.idcarga

LEFT JOIN u_statusagendamento s
    ON s.u_statusagendamento_id = l.u_statusagendamento_id

INNER JOIN (
    SELECT 
        iddoc,
        estabped,
        serieped,
        numeroped,        
        ROUND(SUM((quantidade * CASE WHEN itemagro.unidade IN ('SC','FD') THEN itemagro.pesobruto ELSE 1 END)) / 1000,2) AS quantidade        
    FROM ordemcargaitem
         INNER JOIN itemagro on 
            itemagro.item = ordemcargaitem.item 
    GROUP BY 
        iddoc,
        estabped,
        serieped,
        numeroped
) i
    ON i.iddoc = t.iddoc
GROUP BY 
    t.idcarga,
    t.represent,
    t.coordenador,
    t.placa,
    t.motorista,
    t.tipocarga

ORDER BY 
    t.idcarga` ,
            {
                estab,
                data
            }
        );

        res.json(result.rows);

    } catch (err) {
        console.error("ERRO SQL:", err);
        res.status(500).json({ erro: "Erro ao buscar cargas" });
    }
});


//ADICIONAR STATUS
app.put("/cargas/:agendamento/status", authMiddleware, async (req, res) => {
    try {
        const statusMap = {
            'pendente': 1,
            'producao': 2,
            'qualidade': 3,
            'carregando': 4,
            'faturado': 5,
            'cancelado': 6
        };

        const { agendamento } = req.params;
        const { status, estab } = req.body;
        const userID = req.user.userID;
        const statusId = statusMap[status];
        const conn = await getConnection();
        console.log('Status ' + statusId +
            ' Codigo User: ' + userID +
            ' Agendamento: ' + agendamento +
            ' Estab: ' + estab)
        await conn.execute(
            `INSERT INTO u_logstatusagendamento 
            (
                U_LOGSTATUSAGENDAMENTO_ID,
                u_statusagendamento_id,
                u_usuarioscusto_id,
                datalancamento,
                numagendamento,
                ESTAB
            )
            VALUES (
                SEQ_U_LOGSTATUSAGENDAMENTO.NEXTVAL,
                :statusId,
                :userID,
                SYSDATE,
                :agendamento,
                :estab
            )`,
            {
                statusId,
                userID,
                agendamento,
                estab
            }
        );

        await conn.commit();
        res.sendStatus(200);

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao inserir status" });
    }
});

//mostrar no calendario
app.get("/cargas-calendario", async (req, res) => {
    try {
        const { estab } = req.query;
        const conn = await getConnection();
        const result = await conn.execute(
            `
             WITH base AS (
    SELECT 
        ordemcargacab.idcarga,
        TRUNC(ordemcargacab.dtinclusao) AS data,
        
        MAX(s.U_STATUSAGENDAMENTO_ID)
            KEEP (DENSE_RANK LAST ORDER BY l.datalancamento) AS status_id

    FROM ordemcargacab

    LEFT JOIN u_logstatusagendamento l
        ON l.estab = ordemcargacab.estab 
        AND l.numagendamento = ordemcargacab.idcarga

    LEFT JOIN u_statusagendamento s
        ON s.u_statusagendamento_id = l.u_statusagendamento_id

    WHERE ordemcargacab.estab = :estab
    AND TRUNC(ordemcargacab.dtinclusao) > DATE '2026-01-01'

    GROUP BY 
        ordemcargacab.idcarga,
        TRUNC(ordemcargacab.dtinclusao)
)

SELECT 
    TO_CHAR(data, 'YYYY-MM-DD') AS data,

    COUNT(idcarga) AS total_cargas,

    COUNT(CASE 
        WHEN status_id > 2 THEN 1
    END) AS produzidas,

    COUNT(CASE 
        WHEN status_id >= 5 THEN 1
    END) AS faturadas

FROM base

GROUP BY data
ORDER BY data
            `,
            [estab],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

//adicionar ususario
app.post("/api/users", async (req, res) => {
    const { usuario, senha, email, comercial, status } = req.body;
    const senhaHash = hashPassword(senha);
    const conn = await getConnection();

    try {

        let userId;

        //INSERT USUÁRIO (ORACLE)
        const result = await conn.execute(
            `
    INSERT INTO U_USUARIOSCUSTO 
    (U_USUARIOSCUSTO_ID, USERID, SENHACRIP, EMAIL, COMERCIAL)
    VALUES (SEQ_USUARIOSCUSTO.NEXTVAL, :usuario, :senha, :email, :comercial)
    RETURNING U_USUARIOSCUSTO_ID INTO :id
    `,
            {
                usuario,
                senha: senhaHash,
                email,
                comercial,
                id: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER }
            }
        );

        userId = result.outBinds.id[0];

        // INSERT STATUS
        await conn.execute(
            `
           INSERT INTO u_usuariostatus 
            (U_USUARIOSTATUS_ID, U_USUARIOSCUSTO_ID, U_STATUSAGENDAMENTO_ID)
            VALUES (SEQ_USUARIOSTATUS.NEXTVAL, :userId, :status)
            `,
            { userId, status }
        );

        await conn.commit();

        res.json({ sucesso: true });

    } catch (err) {
        console.error(err);
        await conn.rollback();
        res.status(500).json({ erro: "Erro no servidor" });
    }
});



app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});


// STATIC
app.use(express.static(path.join(__dirname, "fend")));

// SERVER
app.listen(3000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 3000");
});