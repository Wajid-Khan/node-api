const pool = require("./db");
const zeroPad = (num, places) => String(num).padStart(places, '0');

  function generate_emp_no () {
    let q = `select count(*) from employees where role_id > 0`;
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve(zeroPad(parseInt(res.rows[0].count)+1, 3)): resolve("001");
        })
      })
   }

   function generate_comp_no () {
    let q = `select count(*) from companies`;
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve(zeroPad(parseInt(res.rows[0].count) +1, 3)): resolve("001");
        })
      })
   }

   function generate_branch_no (com_id) {
    let q = `select count(*) from company_branches where com_id = '${com_id}'`;
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve(zeroPad(parseInt(res.rows[0].count) +1, 3)): resolve("001");
        })
      })
   }

module.exports = { generate_emp_no, generate_comp_no }