require("dotenv").config();

const oracledb = require("oracledb");

oracledb.initOracleClient({
    libDir: 'C:\\Oracle\\instantclient_23_0'
});

//banco de Produção
async function getConnection() {

    return await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectionString: process.env.DB_CONNECTION,
        poolMin: 1,
        poolMax: 8,
        poolIncrement: 1
    });

}
module.exports = { getConnection };