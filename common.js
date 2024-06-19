const pool = require("./db");
const fs = require("fs");
const path = require("path");

const zeroPad = (num, places) => String(num).padStart(places, '0');

function generate_emp_no() {
  let q = `select count(*) from employees where role_id > 0`;
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve("Emp-" + zeroPad(parseInt(res.rows[0].count) + 1, 3)) : resolve("Emp-001");
    })
  })
}

function generate_comp_no() {
  let q = `select count(*) from companies`;
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve("Com-" + zeroPad(parseInt(res.rows[0].count) + 1, 3)) : resolve("Com-001");
    })
  })
}


function generate_proj_no(cb_id) {
  let q1 = `select * from company_branches where cb_id = '${cb_id}'`;
  return new Promise((resolve, reject) => {
    pool.query(q1, (err1, res1) => {
      if (err1) {
        reject(err1);
      }

      if (res1) {
        let q2 = `select count(*) from projects where cb_id = '${cb_id}'`;
        pool.query(q2, (err2, res2) => {
          if (err2) {
            reject(err2);
          }
          if (res2) {
            parseInt(res2.rows[0].count) > 0 ? resolve("PR-" + zeroPad(parseInt(res2.rows[0].count) + 1, 3) + "-" + res1.rows[0].cb_no) : resolve("PR-001-" + res1.rows[0].cb_no);
          }
        })
      }
    })
  })
}

function generate_branch_no(com_id) {
  let q1 = `select * from companies where com_id = '${com_id}'`;
  return new Promise((resolve, reject) => {
    pool.query(q1, (err1, res1) => {
      if (err1) {
        reject(err1);
      }
      if (res1) {
        let q2 = `select count(*) from company_branches where com_id = '${com_id}'`;
        pool.query(q2, (err2, res2) => {
          if (err2) {
            reject(err2);
          }
          if (res2) {
            parseInt(res2.rows[0].count) > 0 ? resolve(res1.rows[0].com_no + "-B" + zeroPad(parseInt(res2.rows[0].count) + 1, 2)) : resolve(res1.rows[0].com_no + "-B01");
          }
        })
      }
    })
  })
}

function generate_pu_no(proj_id) {
  let q1 = `select * from projects where proj_id = '${proj_id}'`;
  return new Promise((resolve, reject) => {
    pool.query(q1, (err1, res1) => {
      if (err1) {
        reject(err1);
      }

      if (res1) {
        let q2 = `select count(*) from project_units where proj_id = '${proj_id}'`;
        pool.query(q2, (err2, res2) => {
          if (err2) {
            reject(err2);
          }
          if (res2) {
            parseInt(res2.rows[0].count) > 0 ? resolve(res1.rows[0].proj_no + "-U" + zeroPad(parseInt(res2.rows[0].count) + 1, 3)) : resolve(res1.rows[0].proj_no + "-U001");
          }
        })
      }
    })
  })
}

function check_pu_name(u, proj_id) {
  let q = "select unit_name from project_units where is_delete=0 and proj_id= '" + proj_id + "' and unit_name in ('" + u.join("','") + "')";
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : resolve(res.rows);
    })
  })
}

function generate_pdf(employee) {

  try {
    return new Promise((resolve, reject) => {

      const empInfo = {
        emp_no: '124',
        fname: 'Wajid',
        lname: 'Khan',
        email: 'wajid@gmail.com',
        role_id: '2',
      }

      var html = fs.readFileSync(path.join(__dirname, "./table.html"), "utf8");
      var options = {
        format: "A4",
        orientation: "portrait",
        border: "10mm",
        header: {
          height: "45mm",
          contents: '<div style="text-align: center;"><h1>Aero Fans</h1></div>'
        },
      }
      const output = empInfo.emp_no;
      const filePath = path.join(__dirname, `./pdf-files/${output}.pdf`);

      var document = {
        html: html,
        data: {
          users: empInfo
        },
        path: `./pdf-files/${output}.pdf`,
        type: ""
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

function generate_motor_id() {
  let q = `select count(*) from lookup_motors`;
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : parseInt(res.rows[0].count) > 0 ? resolve(zeroPad(parseInt(res.rows[0].count) + 1, 3)) : resolve("1");
    })
  })
}

function getselectedfansofprojectunit(pu_id) {
  let q = "select unit_fan_id from project_units where pu_id ='" + pu_id + "'";
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : resolve(res.rows[0]?.unit_fan_id);
    })
  })
}

function setfanfromselectedfans(pu_id, unit_fan_id, fan_selected_by, fan_selected_date) {
  let q = "UPDATE project_units SET unit_fan_id = '" + unit_fan_id + "', fan_selected_by = '" + fan_selected_by + "', fan_selected_date = '" + fan_selected_date + "' where pu_id = '" + pu_id + "'";
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : resolve(res.rows);
    })
  })
}

function checkForDuplicates(obj) {
  let q = `SELECT * FROM unit_fans WHERE diameter = ${obj?.diameter} and angle = ${obj?.angle} and air_flow = ${obj?.air_flow} and pressure = ${obj?.pressure}
     and fan_velocity = ${obj?.fan_velocity} and velocity_pressure = ${obj?.velocity_pressure} and static_pressure = ${obj?.static_pressure} and fan_speed = ${obj?.fan_speed}
     and power = ${obj?.power} and power_vfd = ${obj?.power_vfd} and total_efficiency = ${obj?.total_efficiency} and total_static_efficiency = ${obj?.total_static_efficiency} and total_pressure = ${obj?.total_pressure} 
     and static_pressure_prts = ${obj?.static_pressure_prts} and lpa = ${obj?.lpa} and lp = ${obj?.lp} and lwat = ${obj?.lwat} and lwt = ${obj?.lwt} and lwai = ${obj?.lwai} and lwi = ${obj?.lwi} 
     and max_torque_required = ${obj?.max_torque_required} and total_efficiency_percentage = ${obj?.total_efficiency_percentage} and static_pressure_percentage = ${obj?.static_pressure_percentage}
     and inlet_sound_power_level = ${obj?.inlet_sound_power_level} and outlet_sound_power_level = ${obj?.outlet_sound_power_level} and sound_pressure_level = ${obj?.sound_pressure_level} 
     and COALESCE(breakout_sound_power_level, 0) = ${obj?.breakout_sound_power_level || 0} and COALESCE(breakout_sound_pressure_level, 0) = ${obj?.breakout_sound_pressure_level || 0}
     and COALESCE(specific_fan_power, 0) = ${obj?.specific_fan_power || 0}`;
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : resolve(res.rows.length);
    })
  })
}

function checkForSearchFanDuplicates(obj) {
  let q = `SELECT * FROM search_fan_history WHERE air_flow = ${obj?.air_flow} and pressure = ${obj?.pressure} and COALESCE(fan_diameter, 0) = ${obj?.fan_diameter || 0} and COALESCE(angle, 0) = ${obj?.angle || 0}
     and COALESCE(fan_start_diameter, 0) = ${obj?.fan_start_diameter || 0} and COALESCE(fan_end_diameter, 0) = ${obj?.fan_end_diameter || 0} and COALESCE(start_angle, 0) = ${obj?.start_angle || 0} 
     and COALESCE(end_angle, 0) = ${obj?.end_angle || 0} and pu_id = '${obj?.pu_id}' order by created_date desc limit 1`;
     console.log(q);
  return new Promise((resolve, reject) => {
    pool.query(q, (err, res) => {
      err ? reject(err) : resolve(res.rows);
    })
  })
}


function insertsearchhistory(obj) {
    const queryText = `INSERT INTO search_fan_history(search_fan_history_id, air_flow, pressure, fan_diameter, angle, fan_start_diameter, fan_end_diameter, start_angle, end_angle, created_by, created_date, pu_id, updated_by, updated_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`;
  
    const values = [
      obj?.search_fan_history_id,
      obj?.air_flow,
      obj?.pressure,
      obj?.fan_diameter,
      obj?.angle,
      obj?.fan_start_diameter,
      obj?.fan_end_diameter,
      obj?.start_angle,
      obj?.end_angle,
      obj?.created_by,
      obj?.created_date,
      obj?.pu_id,
      obj?.updated_by,
      obj?.updated_date
    ];
    return new Promise((resolve, reject) => {
    pool.query(queryText, values, (err, res) => {
      err ? reject(err) : resolve(res.rows);
    })
  })
}

async function insertRecord(record) {
  const queryText = `INSERT INTO searched_unit_fans(
    searched_unit_fan_id, 
    diameter, 
    angle, 
    air_flow, 
    pressure, 
    fan_area, 
    fan_area_sd, 
    fan_area_ld, 
    air_flow_m3s, 
    fan_velocity, 
    fan_velocity_sd, 
    fan_velocity_ld, 
    velocity_pressure, 
    velocity_pressure_sd, 
    velocity_pressure_ld, 
    static_pressure, 
    static_pressure_sd, 
    static_pressure_ld, 
    fan_speed, 
    power, 
    power_vfd, 
    total_efficiency, 
    total_static_efficiency, 
    total_pressure, 
    static_pressure_prts, 
    lpa, 
    lp, 
    lwat, 
    lwt, 
    lwai, 
    lwi, 
    max_torque_required, 
    total_efficiency_percentage, 
    static_pressure_percentage, 
    static_pressure_percentage_sd, 
    static_pressure_percentage_ld, 
    inlet_sound_power_level, 
    outlet_sound_power_level, 
    sound_pressure_level, 
    breakout_sound_power_level, 
    breakout_sound_pressure_level, 
    specific_fan_power, 
    created_by, 
    created_date, 
    pu_id,
    search_fan_history_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46);`;

  const values = [
    record?.selected_unit_fan_id,
    record?.diameter,
    record?.angle,
    record?.air_flow,
    record?.pressure,
    record?.fan_area,
    record?.fan_area_sd,
    record?.fan_area_ld,
    record?.air_flow_m3s,
    record?.fan_velocity,
    record?.fan_velocity_sd,
    record?.fan_velocity_ld,
    record?.velocity_pressure,
    record?.velocity_pressure_sd,
    record?.velocity_pressure_ld,
    record?.static_pressure,
    record?.static_pressure_sd,
    record?.static_pressure_ld,
    record?.fan_speed,
    record?.power,
    record?.power_vfd,
    record?.total_efficiency,
    record?.total_static_efficiency,
    record?.total_pressure,
    record?.static_pressure_prts,
    record?.lpa,
    record?.lp,
    record?.lwat,
    record?.lwt,
    record?.lwai,
    record?.lwi,
    record?.max_torque_required,
    record?.total_efficiency_percentage,
    record?.static_pressure_percentage,
    record?.static_pressure_percentage_sd,
    record?.static_pressure_percentage_ld,
    record?.inlet_sound_power_level,
    record?.outlet_sound_power_level,
    record?.sound_pressure_level,
    record?.breakout_sound_power_level,
    record?.breakout_sound_pressure_level,
    record?.specific_fan_power,
    record?.created_by,
    record?.created_date,
    record?.pu_id,
    record?.search_fan_history_id
  ];
  await pool.query(queryText, values);
}

async function insertMultipleRecords(lobj) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const record of lobj) {
      await insertRecord(record);
    }
    await client.query('COMMIT');
    console.log('Data inserted successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting data:', error);
  } finally {
    client.release();
    //await pool.end();
  }
}

async function insertPlotGraph(obj) {
      const queryText = `INSERT INTO base64data(
        airflow, 
        diameter, 
        pressure,
        rpm,
        base64
        ) VALUES ($1, $2, $3, $4, $5)`

      const values = [
        obj?.airflow,
        obj?.diameter,
        obj?.pressure,
        obj?.rpm,
        obj?.base64
      ];
      await pool.query(queryText, values);
}

async function insertMultiplePlotGraph(lobj) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const record of lobj) {
      await insertPlotGraph(record);
    }
    await client.query('COMMIT');
    console.log('Data inserted successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting data:', error);
  } finally {
    client.release();
    //await pool.end();
  }
}

module.exports = {
  generate_emp_no, generate_comp_no, generate_branch_no, generate_proj_no, generate_pu_no, check_pu_name,
  generate_pdf, generate_motor_id, getselectedfansofprojectunit, setfanfromselectedfans, checkForDuplicates, insertMultipleRecords, insertsearchhistory,
  checkForSearchFanDuplicates, insertMultiplePlotGraph}