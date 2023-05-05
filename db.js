const Pool = require("pg").Pool;

const pool = new Pool({
    user : "postgres",
    password: 'IBSks@123$',
    host : "65.2.130.99",
    port : 5432,
    database : "af_db_new"
});

module.exports = pool;