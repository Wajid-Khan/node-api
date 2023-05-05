const pool = require("./db");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-creator-node");
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
              if(res2){
                parseInt(res2.rows[0].count) > 0 ? resolve(res1.rows[0].proj_no +"-U"+ zeroPad(parseInt(res2.rows[0].count) +1, 3)): resolve(res1.rows[0].proj_no +"-U001");
              }
            })
          }
        })
      })
   }

   function check_pu_name (u, proj_id) {
      let q = "select unit_name from project_units where is_delete=0 and proj_id= '" + proj_id +"' and unit_name in ('" + u.join("','") + "')";
      return new Promise((resolve, reject) => {
          pool.query(q, (err, res) => {
            err ? reject(err) : resolve(res.rows);
          })
        })
   }

   function generate_pdf (employee) {

    try {
        return new Promise((resolve, reject) => {

          const empInfo = {
            emp_no : '124',
            fname : 'Wajid',
            lname : 'Khan',
            email : 'wajid@gmail.com',
            role_id : '2',
          }
    
          var html = fs.readFileSync(path.join(__dirname, "./table.html"), "utf8");
            var options = {
                format : "A4",
                orientation : "portrait",
                border : "10mm",
                header: {
                    height: "45mm",
                    contents: '<div style="text-align: center;"><h1>Aero Fans</h1></div>'
                },
            }
            const output = empInfo.emp_no;
            const filePath = path.join(__dirname,`./pdf-files/${output}.pdf`);
    
            var document = {
              html : html,
              data : {
                  users : empInfo
              },
              path : `./pdf-files/${output}.pdf`,
              type : ""
            }
            
          pdf.create(document, options).then((res) => {
            resolve(document);
            // resolve(res);
          })
          .catch((error) => {
              reject(error)
          })
        })
    } catch (error) {
      return error
    }
   }

   function generate_motor_id () {
    let q = `select count(*) from lookup_motors`;
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve(zeroPad(parseInt(res.rows[0].count)+1, 3)): resolve("1");
        })
      })
   }

   function getselectedfansofprojectunit (pu_id) {
    let q = "select unit_fan_id from project_units where pu_id ='" + pu_id + "'";
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : resolve(res.rows[0]?.unit_fan_id);
        })
      })
   }

   function setfanfromselectedfans(pu_id, unit_fan_id) {
    let q = "UPDATE project_units SET unit_fan_id = '"+ unit_fan_id +"' where pu_id = '" + pu_id + "'";
    return new Promise((resolve, reject) => {
        pool.query(q, (err, res) => {
          err ? reject(err) : resolve(res.rows);
        })
      })
   }

module.exports = { generate_emp_no, generate_comp_no, generate_branch_no, generate_proj_no, generate_pu_no, check_pu_name, generate_pdf, generate_motor_id, getselectedfansofprojectunit, setfanfromselectedfans}