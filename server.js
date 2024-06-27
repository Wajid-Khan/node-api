const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require('uuid');
const crypto = require("./crypto");
const common = require("./common");
//const fs = require("fs");
const PDFDocument = require('pdfkit');
const { createPdf } = require("./pdf.js");
const fanData = require("./files/fansdata");
const _ = require("lodash");
const fetch = require("node-fetch");
const fandata_api_url = "http://192.250.226.152:8000/"; 
//const fandata_api_url = "http://localhost:3007/";
//const plotgraph = "http://13.234.30.175/plotgraph";

const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');

const cfm_to_cms_converter = 2118.88;
const fan_velocity_pressure = 0.6;
const vfd_constant = 1.025;
const vfd_eff = 97.5;

//Port
const port = process.env.PORT || 3007;
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
    // externalApi()
});

//middleware
app.use(cors());
app.use(express.json()); //req.body

let responseObj = {
    "is_success": false,
    "message": '',
    "data": null
};

//login api
app.post("/api/employee/login", async (req, res) => {

    try {
        const { email, password } = req.body;
        let query = `select e.emp_id, e.emp_no, e.first_name, e.middle_name, e.last_name, e.email, e.password, e.is_active, e.is_delete, e.role_id, r.role_name
        FROM employees e left join lookup_roles r on e.role_id = r.role_id where is_delete = 0 and  e.email = '` + email + `'`
        const employee = await pool.query(query);
        if (employee.rows.length > 0) {
            if (employee.rows[0].password === crypto.encryptPassowrd(password)) {
                const emp_update = await pool.query("UPDATE employees SET last_login = $1 WHERE emp_id = $2 RETURNING *",
                    [new Date(), employee.rows[0].emp_id]);

                responseObj = {
                    "is_success": true,
                    "message": "You have successfully logged into Aeronaut Fans portal",
                    "data": employee.rows[0]
                };
            }
            else {
                responseObj = {
                    "is_success": false,
                    "message": "Email or password is not valid",
                    "data": null
                };
            }
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "Email or password is not valid",
                "data": null
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//create a employee
app.post("/api/employee/create", async (req, res) => {
    try {
        const { first_name, middle_name, last_name, email, password, role_id, created_by } = req.body;
        const emp_id = uuidv4();
        const emp_no = await common.generate_emp_no();
        const newTodo = await pool.query("INSERT INTO employees (emp_id, emp_no , first_name, middle_name, last_name, email, password, created_by, created_date, role_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
            [emp_id, emp_no, first_name, middle_name, last_name, email, crypto.encryptPassowrd(password), created_by, new Date(), role_id]);

        responseObj = {
            "is_success": true,
            "message": "Employee has been inserted",
            "data": newTodo.rows
        };
        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get all employees
app.get("/api/employees", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder } = req.query;
        let query = `select e.emp_id, e.emp_no, concat(e.first_name, ' ', e.last_name) as name, e.email, e.is_active, e.is_delete, e.role_id, r.role_name, e.created_date
        FROM employees e left join lookup_roles r on e.role_id = r.role_id where is_delete = 0 and r.role_id > 0`
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const allEmp = await pool.query(query);
        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let rows = page == undefined ? allEmp.rows.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : allEmp.rows.slice(start, end).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        responseObj = {
            "is_success": true,
            "message": "List of employees",
            "data": rows,
            "count": allEmp.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get a single employee
app.get("/api/employee/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [id]);
        if (employee.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": employee.rows[0]
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": null
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//update a employee
app.put("/api/employee/edit", async (req, res) => {
    try {
        const { first_name, middle_name, last_name, role_id, updated_by, emp_id } = req.body;

        const emp_update = await pool.query("UPDATE employees SET first_name = $1, middle_name=$2, last_name=$3, role_id = $4, updated_by = $5, updated_date = $6 WHERE emp_id = $7 RETURNING *",
            [first_name, middle_name, last_name, role_id, updated_by, new Date(), emp_id]);

        responseObj = {
            "is_success": true,
            "message": "Employee has been updated",
            "data": emp_update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//delete a employee
app.get("/api/employee/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const todo = await pool.query("Update employees Set is_delete=1 WHERE emp_id = $1", [id]);

        responseObj = {
            "is_success": true,
            "message": "Employee has been deleted",
            "data": null
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//Change employee password api
app.put('/api/employee/change_password', async (req, resp) => {
    try {
        const { emp_id, new_password, confirm_password, updated_by } = req.body;
        await pool.query("UPDATE employees SET password = $2, updated_by = $3, updated_date = $4, password_changed_date = $5 WHERE emp_id = $1", [emp_id, crypto.encryptPassowrd(new_password), updated_by, new Date(), new Date()]);
        responseObj = {
            "is_success": true,
            "message": "Password has been updated",
            "data": null
        };
        resp.json(responseObj);
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        resp.json(responseObj);
    }
});
//____________________________________Employees_API__________________________________//

//____________________________________Project_API__________________________________//

//create a project
app.post("/api/project/create", async (req, res) => {
    try {
        const { proj_name, com_id, cb_id, created_by } = req.body;
        const proj_id = uuidv4();
        const proj_no = await common.generate_proj_no(cb_id);
        const newProj = await pool.query("INSERT INTO projects (proj_id, proj_no, proj_name, com_id, cb_id, created_by, created_date) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [proj_id, proj_no, proj_name, com_id, cb_id, created_by, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "Project has been inserted",
            "data": newProj.rows
        };
        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get all projects
app.get("/api/projects", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder, com_id, cb_id } = req.query;
        let query = `select p.proj_id, p.proj_name, p.created_date, p.proj_no, p.cb_id, p.com_id, c.com_no, c.com_name,cb.cb_no, cb.com_branch_name,
        (select count(*) from project_units where proj_id = p.proj_id and is_delete=0) as count 
        from projects p 
        left join companies c on p.com_id = c.com_id
        left join company_branches cb on p.cb_id = cb.cb_id
        where p.is_delete = 0`
        if (com_id) {
            query += ` and p.com_id = '${com_id}'`
        }
        if (cb_id) {
            query += ` and p.cb_id = '${cb_id}'`
        }
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }

        const allRows = await pool.query(query);
        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let jsonData = allRows.rows.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        let rows = page == undefined ? jsonData : jsonData.slice(start, end);

        responseObj = {
            "is_success": true,
            "message": "List of branches",
            "data": rows,
            "count": allRows.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

// //get a single project
app.get("/api/project/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const project = await pool.query("SELECT *,  (select count(*) from project_units where proj_id = $1 and is_delete=0) as count  FROM projects WHERE proj_id = $1", [id]);

        responseObj = {
            "is_success": true,
            "message": "",
            "data": project.rows[0]
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

// //update a project
app.put("/api/project/edit", async (req, res) => {
    try {
        const { proj_name, updated_by, proj_id } = req.body;
        const proj_update = await pool.query("UPDATE projects SET proj_name = $1, updated_by = $2, updated_date = $3 WHERE proj_id = $4 RETURNING *", [proj_name, updated_by, new Date(), proj_id]);
        responseObj = {
            "is_success": true,
            "message": "Project has been updated",
            "data": proj_update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

// //delete a project
app.get("/api/project/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const proj = await pool.query("Update projects Set is_delete=1 WHERE proj_id = $1", [id]);
        const units = await pool.query("Update project_units Set is_delete=1 WHERE proj_id = $1", [id]);
        responseObj = {
            "is_success": true,
            "message": "Project and all related Units has been deleted",
            "data": null
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_______________________________Start__Company___________________________________________________________//

//create a company
app.post("/api/company/create", async (req, res) => {
    try {
        const { com_name, created_by } = req.body;
        const com_id = uuidv4();
        const com_no = await common.generate_comp_no();
        const comp = await pool.query("INSERT INTO companies (com_id, com_name, com_no, created_by, created_date) VALUES($1, $2, $3, $4, $5) RETURNING *",
            [com_id, com_name, com_no, created_by, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "Company has been inserted",
            "data": comp.rows
        };
        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get all companies
app.get("/api/companies", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder } = req.query;
        let query = `select * from companies where is_delete = 0`
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const allRows = await pool.query(query);
        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let rows = page == undefined ? allRows.rows.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : allRows.rows.slice(start, end).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        responseObj = {
            "is_success": true,
            "message": "List of companies",
            "data": rows,
            "count": allRows.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }

});

//edit company
app.put("/api/company/edit", async (req, res) => {
    try {
        const { com_name, updated_by, com_id } = req.body;

        const emp_update = await pool.query("UPDATE companies SET com_name = $1, updated_by = $2, updated_date = $3 WHERE com_id = $4 RETURNING *",
            [com_name, updated_by, new Date(), com_id]);

        responseObj = {
            "is_success": true,
            "message": "Company has been updated",
            "data": emp_update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get company by id
app.get("/api/company/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await pool.query("SELECT * FROM companies WHERE com_id = $1", [id]);
        if (employee.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": employee.rows[0]
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": null
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

// //delete a company
app.get("/api/company/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const comp = await pool.query("Update companies Set is_delete=1 WHERE com_id = $1", [id]);
        const branch = await pool.query("Update company_branches Set is_delete=1 WHERE com_id = $1", [id]);
        const proj = await pool.query("Update projects Set is_delete=1 WHERE com_id = $1", [id]);
        const units = await pool.query("Update project_units Set is_delete=1 WHERE com_id = $1", [id]);

        responseObj = {
            "is_success": true,
            "message": "Company along with related its Branches, Projects & Units has been deleted",
            "data": null
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_______________________________End__Company___________________________________________________________//

//_______________________________Start__Company__Unit____________________________________________________//


//get unit by id
app.get("/api/project/units/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let query = `select pu.pu_id, pu.proj_id, pu.unit_name, pu.is_delete, pu.created_by, pu.created_date, pu.updated_by, pu.updated_date,
        pu.pu_no, pu.airflow, pu.pressure, pu.pressure_type, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, aluc.unit as airflow_unit, pluc.unit as pressure_unit, pu.unit_fan_id, uf.motor_id
            from project_units pu left join lookup_unit_conversion aluc on aluc.luc_id = pu.airflow_luc_id
            left join lookup_unit_conversion pluc on pluc.luc_id = pu.pressure_luc_id 
            left join unit_fans uf on uf.unit_fan_id = pu.unit_fan_id
            where pu.proj_id = $1 and pu.is_delete=0 order by created_date asc`
        const unit = await pool.query(query, [id]);
        if (unit.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": unit.rows
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": []
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get unit data by unit id
app.get("/api/unitdata/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let query = `select pu.pu_id, pu.proj_id, pu.unit_name, pu.is_delete, pu.created_by, pu.created_date, pu.updated_by, pu.updated_date,pu.pu_no, pu.airflow, pu.pressure, pu.pressure_type, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, com.com_id, com.com_name, cb.cb_id, cb.com_branch_name, pro.proj_id, pro.proj_name, pu.unit_fan_id, pu.fan_selected_by, pu.fan_selected_date, pu.airflow_luc_name, pu.pressure_luc_name, pu.airflow_conversion, pu.pressure_conversion from project_units pu inner join projects pro on pu.proj_id = pro.proj_id inner join companies com on pu.com_id = com.com_id inner join company_branches cb on pu.cb_id = cb.cb_id where pu.pu_id = $1`;
        const unit = await pool.query(query, [id]);
        if (unit.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": unit.rows[0]
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": []
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

app.get("/api/unit/selectedfans/:id", async (req, res) => {
    try {
        const { id } = req.params;
        let query = `select * from unit_fans where pu_id = $1 order by created_date`;
        const unit = await pool.query(query, [id]);
        if (unit.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": unit.rows
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": []
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});


//create a company unit
app.post("/api/unit/create", async (req, res) => {
    try {
        const { proj_id, unit_name, airflow, pressure, cb_id, com_id, created_by, airflow_luc_id, pressure_luc_id, pressure_type } = req.body;
        const duplicate = await common.check_pu_name([unit_name], proj_id);
        let airflow_luc_name = null;
        let pressure_luc_name = null;
        let airflow_conversion = null;
        let pressure_conversion = null;
        if (duplicate.length > 0) {
            responseObj = {
                "is_success": false,
                "message": duplicate.map(a => a.unit_name).join(",") + " already exists",
                "data": duplicate
            };
            res.json(responseObj);
        }
        else {
            const pu_id = uuidv4();
            const pu_no = await common.generate_pu_no(proj_id);


            //api/lookup/unitconversions
            const lookupunit = await pool.query("SELECT * FROM lookup_unit_conversion order by type asc");
            if (lookupunit.rows.length > 0) {
                airflow_luc_name =  _.filter(lookupunit.rows, function (o) { return o.luc_id == airflow_luc_id; })[0].unit;
                airflow_conversion =  Math.round(airflow * _.filter(lookupunit.rows, function (o) { return o.luc_id == airflow_luc_id; })[0].conversion);
                pressure_luc_name =  _.filter(lookupunit.rows, function (o) { return o.luc_id == pressure_luc_id; })[0].unit;
                pressure_conversion = Math.round(pressure *  _.filter(lookupunit.rows, function (o) { return o.luc_id == pressure_luc_id; })[0].conversion);
            }

            const comp = await pool.query("INSERT INTO project_units (pu_id, proj_id, unit_name, cb_id, com_id, created_by, created_date, pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id, pressure_type, airflow_luc_name, pressure_luc_name, airflow_conversion, pressure_conversion) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *",
                [pu_id, proj_id, unit_name, cb_id, com_id, created_by, new Date(), pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id, pressure_type,
                     airflow_luc_name, pressure_luc_name, airflow_conversion, pressure_conversion]);

            responseObj = {
                "is_success": true,
                "message": "Unit has been inserted",
                "data": comp.rows
            };
            res.json(responseObj);
        }


    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});


app.post("/api/unit/create/bulk", async (req, res) => {
    try {
        let units = req.body;
       
        const duplicate = await common.check_pu_name(units.map(a => a.unit_name), units[0].proj_id);
        if (duplicate.length > 0) {
            responseObj = {
                "is_success": false,
                "message": duplicate.map(a => a.unit_name).join(",") + " already exists",
                "data": duplicate
            };
            res.json(responseObj);
        }
        else {
            const lookupunit = await pool.query("SELECT * FROM lookup_unit_conversion order by type asc");
            for (const i in units) {
                let airflow_luc_id = _.filter(lookupunit.rows, function (o) { return o.unit == units[i].airflow_unit; })[0]?.luc_id;
                let airflow_conversion =  Math.round(units[i].airflow * _.filter(lookupunit.rows, function (o) { return o.luc_id == airflow_luc_id; })[0].conversion);
                let pressure_luc_id = _.filter(lookupunit.rows, function (o) { return o.unit == units[i].pressure_unit; })[0]?.luc_id;
                let pressure_conversion = Math.round(units[i].pressure *  _.filter(lookupunit.rows, function (o) { return o.luc_id == pressure_luc_id; })[0].conversion);
                units[i].pu_id = uuidv4();
                units[i].pu_no = await common.generate_pu_no(units[i].proj_id);
                units[i].airflow_luc_id = airflow_luc_id;
                units[i].airflow_conversion = airflow_conversion;
                units[i].pressure_luc_id = pressure_luc_id;
                units[i].pressure_conversion = pressure_conversion;
                //console.log(units);
                const comp = await pool.query("INSERT INTO project_units (pu_id, proj_id, unit_name, cb_id, com_id, created_by, created_date, pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id, pressure_type, airflow_luc_name, pressure_luc_name, airflow_conversion, pressure_conversion) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *",
                    [units[i].pu_id, units[i].proj_id, units[i].unit_name, units[i].cb_id, units[i].com_id, units[i].created_by, new Date(), units[i].pu_no, units[i].airflow, units[i].pressure, airflow_luc_id, pressure_luc_id, units[i].pressure_type, units[i].airflow_unit, units[i].pressure_unit, airflow_conversion, pressure_conversion]);
            }
            responseObj = {
                "is_success": true,
                "message": "Unit has been inserted",
                "data": units
            };
            res.json(responseObj);
        }
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get all companies unit
app.get("/api/units", async (req, res) => {
    try {
        const { proj_id, size, page, sortField, sortOrder } = req.query;
        let query = `select pu.pu_id, pu.proj_id, pu.unit_name, pu.is_delete, pu.created_by, pu.created_date, pu.updated_by, pu.updated_date,
        pu.pu_no, pu.airflow, pu.pressure, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, aluc.unit as airflow_unit, pluc.unit as pressure_unit
            from project_units pu left join lookup_unit_conversion aluc on aluc.luc_id = pu.airflow_luc_id
            left join lookup_unit_conversion pluc on pluc.luc_id = pu.pressure_luc_id where pu.is_delete = 0`
        if (com_id) {
            query += ` and proj_id = '${proj_id}'`
        }

        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }

        const allRows = await pool.query(query);

        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let rows = page == undefined ? allRows.rows.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : allRows.rows.slice(start, end).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        responseObj = {
            "is_success": true,
            "message": "List of company units",
            "data": rows,
            "count": allRows.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//update unit
app.put("/api/unit/edit", async (req, res) => {
    try {
        const { pu_id, unit_name, airflow, pressure, updated_by, airflow_luc_id, pressure_luc_id, pressure_type } = req.body;

        const unit_update = await pool.query("UPDATE project_units SET unit_name = $1, airflow = $2, pressure = $3, updated_by = $4, updated_date = $5, airflow_luc_id =$7, pressure_luc_id = $8, pressure_type = $9 WHERE pu_id = $6 RETURNING *",
            [unit_name, airflow, pressure, updated_by, new Date(), pu_id, airflow_luc_id, pressure_luc_id, pressure_type]);
        responseObj = {
            "is_success": true,
            "message": "Company unit has been updated",
            "data": unit_update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get unit by id
app.get("/api/unit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const unit = await pool.query("SELECT * FROM project_units WHERE pu_id = $1", [id]);
        if (unit.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": unit.rows[0]
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": null
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//delete a employee
app.get("/api/unit/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const todo = await pool.query("Update project_units Set is_delete=1 WHERE pu_id = $1", [id]);

        responseObj = {
            "is_success": true,
            "message": "Unit has been deleted",
            "data": null
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_______________________________End__Company__Unit____________________________________________________//


//_______________________________Branch__Unit_________________________________________________________//

// Get branches by company id

app.get("/api/branches", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder, com_id } = req.query;
        let query = `select cb.cb_id, cb.com_branch_name, cb.cb_address, cb.primary_contact_name, cb.primary_contact_email, cb.lat, cb."long",
        cb.cb_no, cb.com_id, cb.phone_no, cb.primary_contact_phone_no, c.com_no, c.com_name, cb.created_date 
        from company_branches cb 
        left join companies c on cb.com_id = c.com_id
        where cb.is_delete = 0`
        if (com_id) {
            query += ` and cb.com_id = '${com_id}'`
        }

        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const allRows = await pool.query(query);
        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let rows = page == undefined ? allRows.rows.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : allRows.rows.slice(start, end).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        responseObj = {
            "is_success": true,
            "message": "List of branches",
            "data": rows,
            "count": allRows.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

app.get("/api/branches/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { size, page, sortField, sortOrder } = req.query;
        let query = `select * from company_branches where is_delete = 0 and com_id='${id}'`
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const allRows = await pool.query(query);
        var start = parseInt((page - 1) * size);
        var end = parseInt(page * size);
        responseObj = {
            "is_success": true,
            "message": "List of branches",
            "data": allRows.rows.slice(start, end),
            "count": allRows.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }


});

//Create branch
app.post("/api/branch/create", async (req, res) => {
    try {
        const { com_id, com_branch_name, cb_address, phone_no, primary_contact_name, primary_contact_phone_no, primary_contact_email, created_by } = req.body;
        const cb_id = uuidv4();
        const cb_no = await common.generate_branch_no(com_id);
        const comp = await pool.query("INSERT INTO company_branches (cb_id, cb_no, com_id, com_branch_name, cb_address, phone_no, primary_contact_name, primary_contact_phone_no, primary_contact_email, created_by, created_date) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
            [cb_id, cb_no, com_id, com_branch_name, cb_address, phone_no, primary_contact_name, primary_contact_phone_no, primary_contact_email, created_by, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "Company Branch has been inserted",
            "data": comp.rows
        };
        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

// Get branch by id
app.get("/api/branch/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const branch = await pool.query("SELECT * FROM company_branches WHERE cb_id = $1", [id]);
        if (branch.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": branch.rows[0]
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": null
            };
        }
        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//update a branch
app.put("/api/branch/edit", async (req, res) => {
    try {
        const { cb_id, com_branch_name, cb_address, phone_no, primary_contact_name, primary_contact_phone_no, primary_contact_email } = req.body;

        const comp_branch = await pool.query("UPDATE company_branches SET com_branch_name = $1, cb_address = $2, phone_no = $3, primary_contact_name = $4, primary_contact_phone_no = $5, primary_contact_email = $6, updated_by = $7, updated_date = $8 where cb_id = $9 RETURNING *",
            [com_branch_name, cb_address, phone_no, primary_contact_name, primary_contact_phone_no, primary_contact_email, cb_id, new Date(), cb_id]);

        responseObj = {
            "is_success": true,
            "message": "Company branch has been updated",
            "data": comp_branch.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

// //delete a branch
app.get("/api/branch/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const branch = await pool.query("Update company_branches Set is_delete=1 WHERE cb_id = $1", [id]);
        const proj = await pool.query("Update projects Set is_delete=1 WHERE cb_id = $1", [id]);
        const units = await pool.query("Update project_units Set is_delete=1 WHERE cb_id = $1", [id]);

        responseObj = {
            "is_success": true,
            "message": "Branches along with its related Projects & Units has been deleted",
            "data": null
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_______________________________End__Branch__Unit____________________________________________________//


//_______________________________Lookups____________________________________________________//

app.get("/api/lookup/fans", async (req, res) => {
    try {
        const unit = await pool.query("SELECT * FROM lookup_fans");
        if (unit.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": unit.rows
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": []
            };
        }
        res.json(responseObj);
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

app.get("/api/lookup/unitconversions", async (req, res) => {
    try {
        const unit = await pool.query("SELECT * FROM lookup_unit_conversion order by type asc");
        if (unit.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": unit.rows
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": []
            };
        }
        res.json(responseObj);
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_______________________________End__Lookups____________________________________________________//


app.get('/api/generate_employee_pdf/:id', async (req, resp) => {
    try {
        const { id } = req.params;
        const employee = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [id]);

        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(`pdf-files/${id}.pdf`));
        doc.text(employee.rows[0].first_name);
        doc.end();
        resp.json(doc);
    } catch (error) {
        resp.json(error);
    }

});


app.use(express.static('public'));
app.use('/pdf-files', express.static(__dirname + '/pdf-files'));
app.use('/files', express.static(__dirname + '/files'));


// _______________Api_call__________________ \\
app.post("/api/fansdata/searchfansdata", async (req, res) => {

    try {
        // http://3.109.124.68/getrecordsbyairflowpressure?airflow=50000&pressure=490
        let url = "";
        let { fancriteria, airflow_conversion, pressure_conversion, fan_diameter, angle, fan_start_diameter, fan_end_diameter, start_angle, end_angle, created_by, pu_id } = req.body;
        let airflow = airflow_conversion;
        let pressure = pressure_conversion;
        if (fancriteria == "ap") {
            url = `${fandata_api_url}getrecordsbyairflowpressure?airflow=${airflow}&pressure=${pressure}`;
            fan_diameter = null; angle = null; fan_start_diameter = null; fan_end_diameter = null; start_angle = null; end_angle = null;
        }
        else if (fancriteria == "apd") {
            url = `${fandata_api_url}getrecordsbyairflowpressurediameter?airflow=${airflow}&pressure=${pressure}&diameter=${fan_diameter}`;
            angle = null; fan_start_diameter = null; fan_end_diameter = null; start_angle = null; end_angle = null;
        }
        // else if (fancriteria == "apda") {
        //     url = `${fandata_api_url}getrecordsbyairflowpressure?airflow=${airflow}&pressure=${pressure}&diameter=${fan_diameter}&angle=${angle}`;
        //     fan_start_diameter = null; fan_end_diameter = null; start_angle = null; end_angle = null;
        // }
        else if (fancriteria == "apdr") {
            url = `${fandata_api_url}getrecordsbyairflowpressurediameterrange?airflow=${airflow}&pressure=${pressure}&start=${fan_start_diameter}&end=${fan_end_diameter}`;
            fan_diameter = null; angle = null; start_angle = null; end_angle = null;
        }
        else {
            url = `${fandata_api_url}getrecordsbyairflowpressure?airflow=${airflow}&pressure=${pressure}`;
            fan_diameter = null; angle = null; fan_start_diameter = null; fan_end_diameter = null; start_angle = null; end_angle = null;
        }
        //url = `${fandata_api_url}files/fansdata.json`;
        let search_fan_history_id = uuidv4();
        let _obj = {
            search_fan_history_id: search_fan_history_id,
            air_flow: airflow == undefined ? null : airflow,
            pressure: pressure == undefined ? null : pressure,
            fan_diameter: fan_diameter == undefined ? null : fan_diameter,
            angle: angle == undefined ? null : angle,
            fan_start_diameter: fan_start_diameter == undefined ? null : fan_start_diameter,
            fan_end_diameter: fan_end_diameter == undefined ? null : fan_end_diameter,
            start_angle: start_angle == undefined ? null : start_angle,
            end_angle: end_angle == undefined ? null : end_angle,
            created_by: created_by,
            created_date: new Date(),
            pu_id: pu_id,
            updated_by: null,
            updated_date: null
        }
        const dsh = await common.checkForSearchFanDuplicates(_obj);
        if (dsh.length == 0) {
            const response = await fetch(url);
            if (response?.status == 200) {
                //console.log(url);
                const data = await response.json();
                console.log("--------------------");
                console.log(data);
               
                if(data.length > 0){
                    const sh = await common.insertsearchhistory(_obj);
                    const mmArr = _.map(data, 'DIA')
                    console.log(mmArr);
                    const mmString = mmArr.toString();
                    const unit = await pool.query(`SELECT * FROM lookup_fans where fan_diameter IN (${mmString}) `);
                    const dia = unit.rows;
                    var finalObj = [];
                    data.forEach(e => {
                        console.log(e.DIA);
                        let f = _.filter(dia, function (o) { return o.fan_diameter == e.DIA; });
                        let static_pressure_percentage = (((((e?.G / cfm_to_cms_converter) * (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area)))) / 1000) / e?.N_FAN) * 100);
                        let static_pressure_percentage_sd = (((((e?.G / cfm_to_cms_converter) * (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area)))) / 1000) / e?.N_FAN) * 100);
                        let static_pressure_percentage_ld = (((((e?.G / cfm_to_cms_converter) * (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area)))) / 1000) / e?.N_FAN) * 100);
                        let _elem = {
                            selected_unit_fan_id: uuidv4(),
                            diameter: e?.DIA,
                            angle: e?.ANG,
                            air_flow: e?.G,
                            pressure: e?.P,
                            fan_area: f[0].fan_area,
                            fan_area_sd: f[0].sd_area,
                            fan_area_ld: f[0].ld_area,
                            air_flow_m3s: (e?.G / cfm_to_cms_converter),
                            fan_velocity: ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area),
                            fan_velocity_sd: ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area),
                            fan_velocity_ld: ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area),
                            velocity_pressure: (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area)),
                            velocity_pressure_sd: (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area)),
                            velocity_pressure_ld: (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area)),
                            static_pressure: (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area))),
                            static_pressure_sd: (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area))),
                            static_pressure_ld: (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area))),
                            fan_speed: e?.N,
                            power: e?.N_FAN,
                            power_vfd: (e?.N_FAN * vfd_constant),
                            total_efficiency: e?.EFF_TT,
                            total_static_efficiency: e?.EFF_TS,
                            total_pressure: e?.PRTT,
                            static_pressure_prts: e?.PRTS,
                            lpa: e?.LpA,
                            lp: e?.Lp,
                            lwat: e?.LwAt,
                            lwt: e?.Lwt,
                            lwai: e?.LwAi,
                            lwi: e?.Lwi,
                            max_torque_required: (((e?.N_FAN * 1000) * 60) / (2 * 3.14 * e?.N)),
                            total_efficiency_percentage: (e?.EFF_TT * 100),
                            static_pressure_percentage: static_pressure_percentage == Infinity ? null : static_pressure_percentage, //(((((e?.G / cfm_to_cms_converter) * (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.fan_area)))) / 1000) / e?.N_FAN) * 100),
                            static_pressure_percentage_sd: static_pressure_percentage == Infinity ? null : static_pressure_percentage_sd, //(((((e?.G / cfm_to_cms_converter) * (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.sd_area)))) / 1000) / e?.N_FAN) * 100),
                            static_pressure_percentage_ld: static_pressure_percentage == Infinity ? null : static_pressure_percentage_ld, //(((((e?.G / cfm_to_cms_converter) * (e?.P - (fan_velocity_pressure * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area) * ((e?.G / cfm_to_cms_converter) / f[0]?.ld_area)))) / 1000) / e?.N_FAN) * 100),
                            inlet_sound_power_level: e?.LwAi,
                            outlet_sound_power_level: e?.LwAi,
                            sound_pressure_level: e?.LpA,
                            breakout_sound_power_level: null,
                            breakout_sound_pressure_level: null,
                            specific_fan_power: (e?.N_FAN / (e?.G / cfm_to_cms_converter)),
                            created_by: created_by,
                            created_date: new Date(),
                            search_fan_history_id: search_fan_history_id,
                            pu_id: pu_id,
                            search_fan_history_id: search_fan_history_id
                        };
                        finalObj.push(_elem);
                    });
                    console.log(finalObj);
                    common.insertMultipleRecords(finalObj);
                    console.log("from Phython");
                    responseObj = {
                        "is_success": true,
                        "message": "",
                        "data": finalObj
                    };
                }
                else {
                    responseObj = {
                        "is_success": false,
                        "message": "No record(s) found",
                        "data": []
                    };
                }
                
            }
            else {
                console.log(url);
                responseObj = {
                    "is_success": false,
                    "message": "Something went wrong, please try again later",
                    "data": []
                };
            }
        }
        else {
            const _q = `SELECT * FROM searched_unit_fans WHERE search_fan_history_id = '${dsh[0]?.search_fan_history_id}'`;
            const sfu = await pool.query(_q);
            if (sfu?.rows?.length > 0) {
                console.log("from PostGresql");
                responseObj = {
                    "is_success": true,
                    "message": "",
                    "data": sfu.rows
                };
            }
            else {
                responseObj = {
                    "is_success": false,
                    "message": "No record(s) found",
                    "data": []
                };
            }
        }
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
    }
    res.json(responseObj);

});
// _______________Api_call__________________ \\

//get all motors
app.get("/api/motors", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder } = req.query;
        let query = 'Select * from lookup_motors where is_delete = 0 order by motor_id';
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const motors = await pool.query(query);
        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let rows = page == undefined ? motors.rows.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)) : motors.rows.slice(start, end).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        responseObj = {
            "is_success": true,
            "message": "List of motors",
            "data": motors.rows,
            "count": motors.rows.length,
            "current_page": parseInt(page)
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//get a single motor
app.get("/api/motor/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const motor = await pool.query("SELECT * FROM lookup_motors WHERE motor_id = $1 order by motor_id", [id]);
        if (motor.rows.length > 0) {
            responseObj = {
                "is_success": true,
                "message": "",
                "data": motor.rows[0]
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record(s) found",
                "data": null
            };
        }

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//create motor
app.post("/api/motor/create", async (req, res) => {
    try {
        const { motor_make, classification, ambient_temperature, ip_rating, motor_poles, frame_size, insulation_class, temperature_rise, efficiency_class, rated_power, rated_voltage, rated_motor_frequency, motor_model, rated_speed, efficiency_100, efficiency_75, efficiency_50, power_factor, rated_current_ina, rated_current_isin, torque_nm, torque_tstn, torque_tbtn, moment_of_inertia, weight, created_by } = req.body;
        let motor_id = await common.generate_motor_id();
        const motor = await pool.query("INSERT into lookup_motors (motor_id,motor_make,classification,ambient_temperature,ip_rating,motor_poles,frame_size,insulation_class,temperature_rise,efficiency_class,rated_power,rated_voltage,rated_motor_frequency,motor_model,rated_speed,efficiency_100,efficiency_75,efficiency_50,power_factor,rated_current_ina,rated_current_isin,torque_nm,torque_tstn,torque_tbtn,moment_of_inertia,weight,created_by,created_date) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING *",
            [motor_id, motor_make, classification, ambient_temperature, ip_rating, motor_poles, frame_size, insulation_class, temperature_rise, efficiency_class, rated_power, rated_voltage, rated_motor_frequency, motor_model, rated_speed, efficiency_100, efficiency_75, efficiency_50, power_factor, rated_current_ina, rated_current_isin, torque_nm, torque_tstn, torque_tbtn, moment_of_inertia, weight, created_by, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "Motor has been created",
            "data": motor.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//update a motor
app.put("/api/motor/edit", async (req, res) => {
    try {
        const { motor_make, classification, ambient_temperature, ip_rating, motor_poles, frame_size, insulation_class, temperature_rise, efficiency_class, rated_power, rated_voltage, rated_motor_frequency, motor_model, rated_speed, efficiency_100, efficiency_75, efficiency_50, power_factor, rated_current_ina, rated_current_isin, torque_nm, torque_tstn, torque_tbtn, moment_of_inertia, weight, updated_by, motor_id } = req.body;

        const motor_update = await pool.query("UPDATE lookup_motors SET motor_make = $1, classification = $2, ambient_temperature = $3,ip_rating = $4,motor_poles = $5, frame_size = $6, insulation_class = $7, temperature_rise = $8, efficiency_class = $9, rated_power = $10, rated_voltage = $11, rated_motor_frequency = $12, motor_model = $13, rated_speed = $14, efficiency_100 = $15, efficiency_75 = $16, efficiency_50 = $17, power_factor = $18, rated_current_ina = $19, rated_current_isin = $20, torque_nm = $21, torque_tstn = $22, torque_tbtn = $23, moment_of_inertia = $24, weight = $25, updated_by = $26, updated_date = $27 WHERE motor_id = $28 RETURNING *",
            [motor_make, classification, ambient_temperature, ip_rating, motor_poles, frame_size, insulation_class, temperature_rise, efficiency_class, rated_power, rated_voltage, rated_motor_frequency, motor_model, rated_speed, efficiency_100, efficiency_75, efficiency_50, power_factor, rated_current_ina, rated_current_isin, torque_nm, torque_tstn, torque_tbtn, moment_of_inertia, weight, updated_by, new Date(), motor_id]);

        responseObj = {
            "is_success": true,
            "message": "Motor has been updated",
            "data": motor_update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//delete a motor
app.get("/api/motor/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const motor = await pool.query("Update lookup_motors Set is_delete = 1, updated_by = $2 WHERE id = $1", [id, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "Motor has been deleted",
            "data": null
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_____________________________Motor_API_END___________________________________________________

//_____________________________Save_Unit_Fans__________________________________________________
//create motor
app.post("/api/selected_fan_data/create", async (req, res) => {
    try {
        const { diameter, angle, air_flow, pressure, fan_velocity, velocity_pressure, static_pressure, fan_speed, power, power_vfd, total_efficiency, total_static_efficiency, total_pressure, static_pressure_prts, lpa, lp, lwat, lwt, lwai, lwi, max_torque_required, total_efficiency_percentage, static_pressure_percentage, inlet_sound_power_level, outlet_sound_power_level, sound_pressure_level, breakout_sound_power_level, breakout_sound_pressure_level, specific_fan_power, motor_id, created_by, pu_id } = req.body;

        let checkDuplicate = await common.checkForDuplicates(req.body);
        if (checkDuplicate == 0) {
            let unit_fan_id = uuidv4();
            const motor = await pool.query("INSERT into unit_fans (diameter, angle, air_flow, pressure, fan_velocity, velocity_pressure, static_pressure, fan_speed, power, power_vfd, total_efficiency, total_static_efficiency, total_pressure, static_pressure_prts, lpa, lp, lwat, lwt, lwai, lwi, max_torque_required, total_efficiency_percentage, static_pressure_percentage, inlet_sound_power_level, outlet_sound_power_level, sound_pressure_level, breakout_sound_power_level, breakout_sound_pressure_level, specific_fan_power, motor_id, created_by, created_date, pu_id, unit_fan_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34) RETURNING *",
                [diameter, angle, air_flow, pressure, fan_velocity, velocity_pressure, static_pressure, fan_speed, power, power_vfd, total_efficiency, total_static_efficiency, total_pressure, static_pressure_prts, lpa, lp, lwat, lwt, lwai, lwi, max_torque_required, total_efficiency_percentage, static_pressure_percentage, inlet_sound_power_level, outlet_sound_power_level, sound_pressure_level, breakout_sound_power_level, breakout_sound_pressure_level, specific_fan_power, motor_id, created_by, new Date(), pu_id, unit_fan_id]);

            let unit_fan_id_status = await common.getselectedfansofprojectunit(pu_id);

            if (unit_fan_id_status == null || unit_fan_id_status == '') {
                //await common.setfanfromselectedfans(pu_id, unit_fan_id,created_by,new Date());
                const update = await pool.query("UPDATE project_units SET unit_fan_id = $2, fan_selected_by=$3, fan_selected_date=$4 WHERE pu_id = $1 RETURNING *",
                    [pu_id, unit_fan_id, created_by, new Date()]);
            }

            responseObj = {
                "is_success": true,
                "message": "Selected Fan data has been created",
                "data": motor.rows
            };
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "Record already selected",
                "data": []
            };
        }
        res.json(responseObj);
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});


app.put("/api/setfanfromselectedfans", async (req, res) => {
    try {
        const { pu_id, unit_fan_id, fan_selected_by } = req.body;

        const update = await pool.query("UPDATE project_units SET unit_fan_id = $2, fan_selected_by=$3, fan_selected_date=$4 WHERE pu_id = $1 RETURNING *",
            [pu_id, unit_fan_id, fan_selected_by, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "This fan has been selected",
            "data": update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

app.put("/api/unitfan/updatemotorforfan", async (req, res) => {
    try {
        const { unit_fan_id, motor_id, updated_by } = req.body;

        const update = await pool.query("UPDATE unit_fans SET motor_id = $2, updated_by=$3, updated_date=$4 WHERE unit_fan_id = $1 RETURNING *",
            [unit_fan_id, motor_id, updated_by, new Date()]);

        responseObj = {
            "is_success": true,
            "message": "This motor has been selected",
            "data": update.rows
        };

        res.json(responseObj);

    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

//_____________________________Save_Unit_Fans_END_________________________________________________
async function generatePDF(data) {
    // Read the HTML template
    const template = fs.readFileSync('fandatasheet.html', 'utf-8');

    // Compile the template with Handlebars
    const compiledTemplate = handlebars.compile(template);

    // Replace placeholders with actual data
    const html = compiledTemplate(data);

    // Launch Puppeteer and generate PDF
    //const browser = await puppeteer.launch();
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4' });

    // Save the PDF to a file
    fs.writeFileSync(`pdf-files/${data?.id}.pdf`, pdf);

    // Close the browser
    await browser.close();
}


app.get("/api/generatefandatasheet/:pu_id", async (req, res) => {

    try {
        const { pu_id } = req.params;

        let _query = `select pu.pu_id, pu.proj_id, pu.unit_name, pu.is_delete, pu.created_by, pu.created_date, pu.updated_by, pu.updated_date,
        pu.pu_no, pu.airflow, pu.pressure, pu.pressure_type, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, aluc.unit as airflow_unit, pluc.unit as pressure_unit,
         pu.unit_fan_id, uf.motor_id, pu.pressure_conversion, pu.airflow_conversion
            from project_units pu left join lookup_unit_conversion aluc on aluc.luc_id = pu.airflow_luc_id
            left join lookup_unit_conversion pluc on pluc.luc_id = pu.pressure_luc_id 
            left join unit_fans uf on uf.unit_fan_id = pu.unit_fan_id
            where pu.pu_id = $1`

        const project_unit = await pool.query(_query, [pu_id]);
        if (project_unit.rows.length > 0) {
            if (project_unit.rows[0]?.motor_id != null) {
                const unit_fan = await pool.query("select * from unit_fans where unit_fan_id = $1", [project_unit.rows[0]?.unit_fan_id]);
                if (unit_fan.rows.length > 0) {
                    const motor = await pool.query("select * from lookup_motors where motor_id = $1", [unit_fan.rows[0]?.motor_id]);
                    if (motor.rows.length > 0) {
                        let query = `select p.proj_id, p.proj_name, p.created_date, p.proj_no, p.cb_id, p.com_id, c.com_no, c.com_name,cb.cb_no, cb.com_branch_name
                        from projects p 
                        left join companies c on p.com_id = c.com_id
                        left join company_branches cb on p.cb_id = cb.cb_id
                        where p.proj_id = $1`
                        const project = await pool.query(query, [project_unit.rows[0]?.proj_id]);
                        if (project.rows.length > 0) {
                            
                            const base64 = await pool.query("Select * from base64data WHERE pressure = $1 and airflow = $2 and diameter = $3 and rpm = $4",
                             [project_unit.rows[0]?.pressure_conversion, project_unit.rows[0]?.airflow_conversion, unit_fan.rows[0]?.diameter, unit_fan.rows[0]?.fan_speed]);
                            if (base64.rows.length > 0) {
                                const currentDate = new Date();
                                const formattedDate = currentDate.toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                });
                                const data = {
                                    id: project_unit.rows[0]?.pu_no,
                                    com_name: project.rows[0]?.com_name,
                                    proj_name: project.rows[0]?.proj_name,
                                    com_branch_name: project.rows[0]?.com_branch_name,
                                    unit_name: project_unit.rows[0]?.unit_name,
                                    airflow: project_unit.rows[0]?.airflow,
                                    airflow_unit: project_unit.rows[0]?.airflow_unit,
                                    diameter: unit_fan.rows[0]?.diameter,
                                    pressure: project_unit.rows[0]?.pressure,
                                    pressure_unit: project_unit.rows[0]?.pressure_unit,
                                    volume_flow: project_unit.rows[0]?.airflow,
                                    total_pressure: unit_fan.rows[0]?.total_pressure,
                                    static_pressure: Math.round(unit_fan.rows[0]?.static_pressure),
                                    velocity_pressure: Math.round(unit_fan.rows[0]?.velocity_pressure),
                                    static_pressure_percentage: unit_fan.rows[0]?.static_pressure_percentage?.toFixed(2),
                                    total_efficiency_percentage: unit_fan.rows[0]?.total_efficiency_percentage?.toFixed(2),
                                    specific_fan_power: unit_fan.rows[0]?.specific_fan_power?.toFixed(2),
                                    power: unit_fan.rows[0]?.power,
                                    fan_speed: Math.floor(unit_fan.rows[0]?.fan_speed),
                                    outlet_sound_power_level: unit_fan.rows[0]?.outlet_sound_power_level,
                                    sound_pressure_level: unit_fan.rows[0]?.sound_pressure_level,
                                    motor_make: motor.rows[0]?.motor_make,
                                    classification: motor.rows[0]?.classification,
                                    motor_poles: motor.rows[0]?.motor_poles,
                                    motor_model: motor.rows[0]?.motor_model,
                                    tds_blade_angle: unit_fan.rows[0]?.angle,
                                    rated_power: motor.rows[0]?.rated_power,
                                    torque_nm: motor.rows[0]?.torque_nm,
                                    rated_speed: motor.rows[0]?.rated_speed,
                                    rated_current_ina: motor.rows[0]?.rated_current_ina,
                                    rated_voltage: motor.rows[0]?.rated_voltage,
                                    rated_motor_frequency: motor.rows[0]?.rated_motor_frequency,
                                    insulation_class: motor.rows[0]?.insulation_class,
                                    temperature_rise: motor.rows[0]?.temperature_rise,
                                    ip_rating: motor.rows[0]?.ip_rating,
                                    efficiency_class: motor.rows[0]?.efficiency_class,
                                    efficiency_100: motor.rows[0]?.efficiency_100,
                                    altitude_of_installation: 0,
                                    temperature: 20,
                                    humidity: 50,
                                    air_density: 1.2,
                                    outlet: "Duct",
                                    vfd_efficiency: vfd_eff,
                                    mounting_arrangement: "B5/B14",
                                    start_up: "Direct Starting",
                                    windings_type: "1 Speed(1 Winding)",
                                    power_input: ((unit_fan.rows[0]?.power / vfd_eff) / motor.rows[0]?.efficiency_100).toFixed(2),
                                    system_efficiency: ((unit_fan.rows[0]?.total_efficiency_percentage * motor.rows[0]?.efficiency_100 * vfd_eff)/10000).toFixed(2),
                                    gvp_graph: base64.rows[0].base64,
                                    gveff_graph: base64.rows[1].base64,
                                    gvn_fan_graph: base64.rows[2].base64,
                                    date: formattedDate,
                                };
                                generatePDF(data)
                                    .then(() => {
                                            responseObj = {
                                            "is_success": true,
                                            "message": "Generate PDF",
                                            "data": req.protocol + '://' + req.get('host') + '/' + `pdf-files/${data?.id}.pdf`
                                        };
                                        res.json(responseObj);
                                    })
                                    .catch((error) => {
                                        responseObj = {
                                            "is_success": false,
                                            "message": error,
                                            "data": data
                                        };
                                        res.json(responseObj);
                                    });
                            }
                            else {
                                var finalObj = [];
                                let diameter = unit_fan.rows[0]?.diameter;
                                let airflow = project_unit.rows[0]?.airflow_conversion;
                                let pressure = project_unit.rows[0]?.pressure_conversion;
                                let rpm = unit_fan.rows[0]?.fan_speed;
                                const url = `${fandata_api_url}plotgraph?diameter=${diameter}&airflow=${airflow}&pressure=${pressure}&rpm=${rpm}`;
                                const response = await fetch(url);
                                console.log(response);
                                if (response?.status == 200) {
                                    const data1 = await response.json();
                                    data1.forEach(e => {
                                        let GeneratedBase64Image = e;
                                        let base64_Data = {
                                            pressure: pressure,
                                            airflow: airflow,
                                            diameter: diameter,
                                            rpm: rpm,
                                            base64: GeneratedBase64Image
                                        };
                                        finalObj.push(base64_Data);
                                    });
                                   common.insertMultiplePlotGraph(finalObj);
                                }
                               
                               
                                const currentDate = new Date();
                                const formattedDate = currentDate.toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                });
                                const data = {
                                    id: project_unit.rows[0]?.pu_no,
                                    com_name: project.rows[0]?.com_name,
                                    proj_name: project.rows[0]?.proj_name,
                                    com_branch_name: project.rows[0]?.com_branch_name,
                                    unit_name: project_unit.rows[0]?.unit_name,
                                    airflow: project_unit.rows[0]?.airflow,
                                    airflow_unit: project_unit.rows[0]?.airflow_unit,
                                    diameter: unit_fan.rows[0]?.diameter,
                                    pressure: project_unit.rows[0]?.pressure,
                                    pressure_unit: project_unit.rows[0]?.pressure_unit,
                                    volume_flow: project_unit.rows[0]?.airflow,
                                    total_pressure: unit_fan.rows[0]?.total_pressure,
                                    static_pressure: Math.round(unit_fan.rows[0]?.static_pressure),
                                    velocity_pressure: Math.round(unit_fan.rows[0]?.velocity_pressure),
                                    static_pressure_percentage: unit_fan.rows[0]?.static_pressure_percentage?.toFixed(2),
                                    total_efficiency_percentage: unit_fan.rows[0]?.total_efficiency_percentage?.toFixed(2),
                                    specific_fan_power: unit_fan.rows[0]?.specific_fan_power?.toFixed(2),
                                    power: unit_fan.rows[0]?.power,
                                    fan_speed: Math.floor(unit_fan.rows[0]?.fan_speed),
                                    outlet_sound_power_level: unit_fan.rows[0]?.outlet_sound_power_level,
                                    sound_pressure_level: unit_fan.rows[0]?.sound_pressure_level,
                                    motor_make: motor.rows[0]?.motor_make,
                                    classification: motor.rows[0]?.classification,
                                    motor_poles: motor.rows[0]?.motor_poles,
                                    motor_model: motor.rows[0]?.motor_model,
                                    tds_blade_angle: unit_fan.rows[0]?.angle,
                                    rated_power: motor.rows[0]?.rated_power,
                                    torque_nm: motor.rows[0]?.torque_nm,
                                    rated_speed: motor.rows[0]?.rated_speed,
                                    rated_current_ina: motor.rows[0]?.rated_current_ina,
                                    rated_voltage: motor.rows[0]?.rated_voltage,
                                    rated_motor_frequency: motor.rows[0]?.rated_motor_frequency,
                                    insulation_class: motor.rows[0]?.insulation_class,
                                    temperature_rise: motor.rows[0]?.temperature_rise,
                                    ip_rating: motor.rows[0]?.ip_rating,
                                    efficiency_class: motor.rows[0]?.efficiency_class,
                                    efficiency_100: motor.rows[0]?.efficiency_100,
                                    altitude_of_installation: 0,
                                    temperature: 20,
                                    humidity: 50,
                                    air_density: 1.2,
                                    outlet: "Duct",
                                    vfd_efficiency: vfd_eff,
                                    mounting_arrangement: "B5/B14",
                                    start_up: "Direct Starting",
                                    windings_type: "1 Speed(1 Winding)",
                                    power_input: ((unit_fan.rows[0]?.power / vfd_eff) / motor.rows[0]?.efficiency_100).toFixed(2),
                                    system_efficiency: ((unit_fan.rows[0]?.total_efficiency_percentage * motor.rows[0]?.efficiency_100 * vfd_eff)/10000).toFixed(2),
                                    gvp_graph: finalObj[0]?.base64,
                                    gveff_graph: finalObj[1]?.base64,
                                    gvn_fan_graph: finalObj[2]?.base64,
                                    date: formattedDate,
                                };
                                console.log(8);
                                generatePDF(data)
                                    .then(() => {
                                        responseObj = {
                                            "is_success": true,
                                            "message": "Generate PDF",
                                            "data": req.protocol + '://' + req.get('host') + '/' + `pdf-files/${data?.id}.pdf`
                                        };
                                        res.json(responseObj);
                                    })
                                    .catch((error) => {
                                        responseObj = {
                                            "is_success": false,
                                            "message": error,
                                            "data": data
                                        };
                                        res.json(responseObj);
                                    });
                            }

                        }
                    }
                }
            }
            else {
                responseObj = {
                    "is_success": false,
                    "message": "Please select motor to generate fand data sheet",
                    "data": null
                };
                res.json(responseObj);
            }
        }
        else {
            responseObj = {
                "is_success": false,
                "message": "No record found",
                "data": null
            };
            res.json(responseObj);
        }
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
});

async function updateBase64Data({ pressure, airflow, diameter, base64 }) {
    await pool.query("INSERT INTO base64data (airflow, diameter, pressure, base64) VALUES($1, $2, $3, $4)",
        [airflow, diameter, pressure, base64]);
}

app.put("/api/plotgraph", async (req, res) => {
    try {
        const { pressure, airflow, diameter, rpm } = req.body;
        const base64 = await pool.query("Select * from base64data WHERE pressure = $1 and airflow = $2 and diameter = $3 and rpm = $4 order by id asc", [pressure, airflow, diameter, rpm]);
        if (base64.rows.length > 0) {
            console.log("if");
            responseObj = {
                "is_success": true,
                "message": '',
                "data": base64.rows
            };
            res.json(responseObj);
        }
        else {
            const url = `${fandata_api_url}plotgraph?diameter=${diameter}&airflow=${airflow}&pressure=${pressure}&rpm=${rpm}`;
            const response = await fetch(url);
            console.log(response);
            var finalObj = [];
            if (response?.status == 200) {
                const data = await response.json();
                data.forEach(e => {
                    let GeneratedBase64Image = e;
                    let base64_Data = {
                        pressure: pressure,
                        airflow: airflow,
                        diameter: diameter,
                        rpm: rpm,
                        base64: GeneratedBase64Image
                    };
                    finalObj.push(base64_Data);
                });
               common.insertMultiplePlotGraph(finalObj);
                responseObj = {
                    "is_success": true,
                    "message": '',
                    "data": finalObj
                };
            }
            else{
                responseObj = {
                    "is_success": false,
                    "message": 'Unable to generate Graph for this record',
                    "data": finalObj
                };
            }
            res.json(responseObj);
        }


    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }

});




