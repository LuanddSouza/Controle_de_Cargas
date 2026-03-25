require("dotenv").config();

const oracledb = require("oracledb");

oracledb.initOracleClient({
    libDir: 'C:\\Oracle\\instantclient_23_0'
});

async function getConnection() {
    return await oracledb.getConnection({
        user: process.env.DB_USER_H,
        password: process.env.DB_PASSWORD_H,
        connectionString: process.env.DB_CONNECTION_H,
        poolMin: 1,
        poolMax: 8,
        poolIncrement: 1
    });

}

module.exports = { getConnection };