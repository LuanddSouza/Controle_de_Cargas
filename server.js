require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const { login } = require("./bend/controllers/validaLogin");
const { atualizaStatus } = require("./bend/controllers/atualizaStatus");
const authMiddleware = require("./middlewares/authMiddleware");
const { getConnection } = require("./bend/controllers/db");
const oracledb = require('oracledb');

const app = express();

const permissoes = {
    producao: ["producao"],
    logistica: ["carregando"],
    financeiro: ["faturado"],
    adm: ["producao", "carregando", "faturado", "cancelado"]
};

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
        t.carga,
        t.coordenador,
        TO_CHAR(MAX(CASE WHEN s.carregamento = 'S' THEN l.datalancamento END), 'HH24:MI') AS horacarrega,
        SUM(i.quantidade) AS quantidade,
        TO_CHAR(MAX(CASE WHEN s.qualidade = 'S' THEN l.datalancamento END), 'HH24:MI') AS horaqualidade,
        t.placa,
        t.motorista,
         t.tipocarga,
         TO_CHAR(MAX(CASE WHEN s.faturamento = 'S' THEN l.datalancamento END), 'HH24:MI') AS horafaturamento,
         t.represent,

    COALESCE(
    MAX(
        CASE 
            WHEN l.datalancamento IS NOT NULL 
             AND l.datalancamento > DATE '1900-01-01'
            THEN s.descricao
        END
    ) KEEP (DENSE_RANK LAST ORDER BY l.datalancamento),null
        /*(
           select * from 
           (
             select descricao from u_statusagendamento
             order by sequencia
           ) where rownum = 1
        )*/
    ) AS status

FROM 
(
    SELECT 
        cargafat.estab,
        cargafat.carga,
        preprese.represent,
        preprese.descricao coordenador,    
        cargafat.placa,

        CASE 
            WHEN ppesspre.nome IS NOT NULL THEN 
                ppesspre.nome || ' - celular: ' || ppesspre.celular
        END motorista,

        UPPER(ordemcargacab_u.tipocarga) tipocarga,

        ordemcargadoc.iddoc,
        ordemcargadoc.estabped, 
        ordemcargadoc.serieped,
        ordemcargadoc.numeroped    

    FROM cargafat
    
    LEFT JOIN ordemcargacab 
        ON ordemcargacab.estab = cargafat.estab
        AND ordemcargacab.idcarga = cargafat.carga
       
    LEFT JOIN ordemcargadoc 
        ON ordemcargadoc.idcarga = cargafat.carga     
       
    LEFT JOIN pedcab 
        ON pedcab.estab = ordemcargadoc.estabped
        AND pedcab.serie = ordemcargadoc.serieped
        AND pedcab.numero = ordemcargadoc.numeroped 
    
    LEFT JOIN preprese 
        ON preprese.represent = pedcab.canaldevenda
        AND preprese.empresa = 1
       
    LEFT JOIN ordemcargatransp 
        ON ordemcargatransp.idcarga = cargafat.carga 
       
    LEFT JOIN ppesspre    
        ON ppesspre.empresa = 1
        AND ppesspre.prestador = idmotorista
       
    LEFT JOIN ordemcargacab_u 
        ON ordemcargacab_u.idcarga = cargafat.carga 
       
    WHERE cargafat.estab = :estab
    AND cargafat.dtinclusao = TO_DATE(:data, 'DD/MM/YYYY')
    
) t

LEFT JOIN u_logstatusagendamento l
    ON l.estab = t.estab 
    AND l.numagendamento = t.carga

LEFT JOIN u_statusagendamento s
    ON s.u_statusagendamento_id = l.u_statusagendamento_id

LEFT JOIN (
    SELECT 
        iddoc,
        estabped,
        serieped,
        numeroped,
        ROUND(SUM(quantidade / case when itemagro.unidade <> 'KG' then itemagro.pesobruto else 1000 end),2) quantidade
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
    AND i.estabped = t.estabped 
    AND i.serieped = t.serieped
    AND i.numeroped = t.numeroped

GROUP BY 
    t.carga,
    t.represent,
    t.coordenador,
    t.placa,
    t.motorista,
    t.tipocarga

ORDER BY 
    t.carga` ,
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
        t.carga,
        t.coordenador,
        t.placa,
        t.motorista,
         t.tipocarga,
         TO_CHAR(MAX(CASE WHEN s.faturamento = 'S' THEN l.datalancamento END), 'HH24:MI') AS horafaturamento,
    COALESCE(
    MAX(
        CASE 
            WHEN l.datalancamento IS NOT NULL 
             AND l.datalancamento > DATE '1900-01-01'
            THEN s.descricao
        END
    ) KEEP (DENSE_RANK LAST ORDER BY l.datalancamento),null
        /*(
           select * from 
           (
             select descricao from u_statusagendamento
             order by sequencia
           ) where rownum = 1
        )*/
    ) AS status

FROM 
(
    SELECT 
        cargafat.estab,
        cargafat.carga,
        preprese.represent,
        preprese.descricao coordenador,    
        cargafat.placa,

        CASE 
            WHEN ppesspre.nome IS NOT NULL THEN 
                ppesspre.nome || ' - celular: ' || ppesspre.celular
        END motorista,

        UPPER(ordemcargacab_u.tipocarga) tipocarga,

        ordemcargadoc.iddoc,
        ordemcargadoc.estabped, 
        ordemcargadoc.serieped,
        ordemcargadoc.numeroped    

    FROM cargafat
    
    LEFT JOIN ordemcargacab 
        ON ordemcargacab.estab = cargafat.estab
        AND ordemcargacab.idcarga = cargafat.carga
       
    LEFT JOIN ordemcargadoc 
        ON ordemcargadoc.idcarga = cargafat.carga     
       
    LEFT JOIN pedcab 
        ON pedcab.estab = ordemcargadoc.estabped
        AND pedcab.serie = ordemcargadoc.serieped
        AND pedcab.numero = ordemcargadoc.numeroped 
    
    LEFT JOIN preprese 
        ON preprese.represent = pedcab.canaldevenda
        AND preprese.empresa = 1
       
    LEFT JOIN ordemcargatransp 
        ON ordemcargatransp.idcarga = cargafat.carga 
       
    LEFT JOIN ppesspre    
        ON ppesspre.empresa = 1
        AND ppesspre.prestador = idmotorista
       
    LEFT JOIN ordemcargacab_u 
        ON ordemcargacab_u.idcarga = cargafat.carga 
       
    WHERE cargafat.estab = :estab
    AND cargafat.dtinclusao = TO_DATE(:data, 'DD/MM/YYYY')
    
) t

LEFT JOIN u_logstatusagendamento l
    ON l.estab = t.estab 
    AND l.numagendamento = t.carga

LEFT JOIN u_statusagendamento s
    ON s.u_statusagendamento_id = l.u_statusagendamento_id

LEFT JOIN (
    SELECT 
        iddoc,
        estabped,
        serieped,
        numeroped,
        ROUND(SUM(quantidade / case when itemagro.unidade <> 'KG' then itemagro.pesobruto else 1000 end),2) quantidade
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
    AND i.estabped = t.estabped 
    AND i.serieped = t.serieped
    AND i.numeroped = t.numeroped

GROUP BY 
    t.carga,
    t.represent,
    t.coordenador,
    t.placa,
    t.motorista,
    t.tipocarga

ORDER BY 
    t.carga` ,
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
        const userCod = req.user.userCod;
        const statusId = statusMap[status];
        const conn = await getConnection();

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
                :userCod,
                SYSDATE,
                :agendamento,
                :estab
            )`,
            {
                statusId,
                userCod,
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


app.get("/cargas-calendario", async (req, res) => {
    try {
        const { estab } = req.query;
        const conn = await getConnection();
        const result = await conn.execute(
            `
            SELECT 
                TO_CHAR(TRUNC(t.dtinclusao), 'YYYY-MM-DD') AS data,

                COUNT(DISTINCT t.carga) AS total_cargas,

                COUNT(DISTINCT CASE 
                    WHEN s_final.U_STATUSAGENDAMENTO_ID < 5
                    AND s_final.U_STATUSAGENDAMENTO_ID > 2
                    THEN t.carga 
                END) AS produzidas,

                COUNT(DISTINCT CASE 
                    WHEN s_final.U_STATUSAGENDAMENTO_ID >= 5 
                    THEN t.carga 
                END) AS faturadas

            FROM cargafat t

            LEFT JOIN (
                SELECT 
                    l.estab,
                    l.numagendamento,
                    MAX(s.U_STATUSAGENDAMENTO_ID)
                        KEEP (DENSE_RANK LAST ORDER BY l.datalancamento) AS U_STATUSAGENDAMENTO_ID
                FROM u_logstatusagendamento l
                JOIN u_statusagendamento s
                    ON s.U_STATUSAGENDAMENTO_ID = l.U_STATUSAGENDAMENTO_ID
                GROUP BY 
                    l.estab,
                    l.numagendamento
            ) s_final
                ON s_final.estab = t.estab
                AND s_final.numagendamento = t.carga

            WHERE t.estab = :estab
            GROUP BY TRUNC(t.dtinclusao)
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

// STATIC
app.use(express.static(path.join(__dirname, "fend")));

// SERVER
app.listen(3000, '0.0.0.0', () => {
    console.log("Servidor rodando na porta 3000");
});