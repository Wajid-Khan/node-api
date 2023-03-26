const pool = require("./db");
const zeroPad = (num, places) => String(num).padStart(places, '0');

  function generate_emp_no () {
    let q = `select count(*) from employees where role_id > 0`;
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve("Emp-" + zeroPad(parseInt(res.rows[0].count)+1, 3)): resolve("Emp-001");
        })
      })
   }

   function generate_comp_no () {
    let q = `select count(*) from companies`;
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve("Com-" + zeroPad(parseInt(res.rows[0].count) +1, 3)): resolve("Com-001");
        })
      })
   }


   function generate_proj_no (cb_id) {
    let q1 = `select * from company_branches where cb_id = '${cb_id}'`;
    return new Promise((resolve, reject) => {
        pool.query(q1, (err1, res1) => {
          if(err1){
            reject(err1);
          }
          
          if(res1){
            let q2 = `select count(*) from projects where cb_id = '${cb_id}'`;
            pool.query(q2, (err2, res2) => {
              if(err2){
                reject(err2);
              }
              console.log(q2);
              if(res2){
                parseInt(res2.rows[0].count) > 0 ? resolve("PR-"+ zeroPad(parseInt(res2.rows[0].count) +1, 3) + "-"+res1.rows[0].cb_no): resolve("PR-001-" + res1.rows[0].cb_no);
              }
            })
          }
        })
      })
   }

   function generate_branch_no (com_id) {
    let q1 = `select * from companies where com_id = '${com_id}'`;
    return new Promise((resolve, reject) => {
        pool.query(q1, (err1, res1) => {
          if(err1){
            reject(err1);
          }
          if(res1){
            let q2 = `select count(*) from company_branches where com_id = '${com_id}'`;
            pool.query(q2, (err2, res2) => {
              if(err2){
                reject(err2);
              }
              if(res2){
                parseInt(res2.rows[0].count) > 0 ? resolve(res1.rows[0].com_no +"-B"+ zeroPad(parseInt(res2.rows[0].count) +1, 2)): resolve(res1.rows[0].com_no +"-B01");
              }
            })
          }
        })
      })
   }

   function generate_pu_no (proj_id) {
    let q1 = `select * from projects where proj_id = '${proj_id}'`;
    return new Promise((resolve, reject) => {
        pool.query(q1, (err1, res1) => {
          if(err1){
            reject(err1);
          }
          
          if(res1){
            let q2 = `select count(*) from project_units where proj_id = '${proj_id}'`;
            pool.query(q2, (err2, res2) => {
              if(err2){
                reject(err2);
              }
              console.log(q2);
              if(res2){
                parseInt(res2.rows[0].count) > 0 ? resolve(res1.rows[0].proj_no +"-U"+ zeroPad(parseInt(res2.rows[0].count) +1, 3)): resolve(res1.rows[0].proj_no +"-U001");
              }
            })
          }
        })
      })
   }

module.exports = { generate_emp_no, generate_comp_no, generate_branch_no, generate_proj_no, generate_pu_no}