const Pool = require("pg").Pool;

const pool = new Pool({
    user : "postgres",
    password: 'IBSks@123$',
    host : "52.202.7.252",
    port : 5432,
    database : "af_db_dev"
});

module.exports = pool;

//host : "52.202.7.252",
//host : "localhost",