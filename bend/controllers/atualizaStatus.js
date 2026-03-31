const { getConnection } = require("./db");

const statusMap = {
    'pendente': 1,
    'producao': 2,
    'qualidade': 3,
    'carregando': 4,
    'faturado': 5,
    'cancelado': 6
};

async function atualizaStatus(req, res) {
    try {
        const { agendamento, estab, usuario, status } = req.body;

        const statusId = statusMap[status];

        if (!statusId) {
            return res.status(400).json({ erro: "Status inválido" });
        }
        console.log(agendamento);
        // exemplo Oracle
        const sql = `
            INSERT INTO u_logstatusagendamento (
            U_LOGSTATUSAGENDAMENTO_ID,
            U_STATUSAGENDAMENTO_ID,
            U_USUARIOSCUSTO_ID,
            DATALANCAMENTO,
            NUMAGENDAMENTO,
            ESTAB
        ) VALUES (
            SEQ_LOGSTATUSAGENDAMENTO.NEXTVAL,
            :status,
            :usuario,
            SYSDATE,
            :agendamento,
            :estab
        );
        `;

        const connection = await getConnection();

        await connection.execute(sql, {
            agendamento,
            estab,
            usuario,
            status: statusId
        });

        await connection.commit();

        res.status(200).json({ sucesso: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao inserir status" });
    }
}

module.exports = { atualizaStatus };