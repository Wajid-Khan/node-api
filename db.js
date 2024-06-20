const Pool = require("pg").Pool;

const pool = new Pool({
    // user: "postgres",
    user: "aeronaut",
    password: 'aeronaut@123',
    host: "192.250.226.152",
    port: 5432,
    database: "af_db_new"
});

module.exports = pool;