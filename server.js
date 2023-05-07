const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require('uuid');
const crypto = require("./crypto");
const common = require("./common");
const fs = require("fs");
const PDFDocument = require('pdfkit');
const { createPdf } = require("./pdf.js");
const fanData = require("./files/fansdata");
const _ = require("lodash");
const fetch = require("node-fetch");
const fandata_api_url = "http://localhost:3007/"; //"http://3.109.124.68/";
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
        let rows = page == undefined ? allEmp.rows.sort((a, b) => b.created_date - a.created_date) : allEmp.rows.slice(start, end).sort((a, b) => b.created_date - a.created_date);
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
        let rows = page == undefined ? allRows.rows.sort((a, b) => b.created_date - a.created_date) : allRows.rows.slice(start, end).sort((a, b) => b.created_date - a.created_date);

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
        let rows = page == undefined ? allRows.rows.sort((a, b) => b.created_date - a.created_date) : allRows.rows.slice(start, end).sort((a, b) => b.created_date - a.created_date);

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
        pu.pu_no, pu.airflow, pu.pressure, pu.pressure_type, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, aluc.unit as airflow_unit, pluc.unit as pressure_unit
            from project_units pu left join lookup_unit_conversion aluc on aluc.luc_id = pu.airflow_luc_id
            left join lookup_unit_conversion pluc on pluc.luc_id = pu.pressure_luc_id where pu.proj_id = $1 and pu.is_delete=0 order by created_date asc`
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
        let query = `select pu.pu_id, pu.proj_id, pu.unit_name, pu.is_delete, pu.created_by, pu.created_date, pu.updated_by, pu.updated_date,pu.pu_no, pu.airflow, pu.pressure, pu.pressure_type, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, com.com_id, com.com_name, cb.cb_id, cb.com_branch_name, pro.proj_id, pro.proj_name, pu.unit_fan_id, pu.fan_selected_by, pu.fan_selected_date from project_units pu inner join projects pro on pu.proj_id = pro.proj_id inner join companies com on pu.com_id = com.com_id inner join company_branches cb on pu.cb_id = cb.cb_id where pu.pu_id = $1`;
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
            const comp = await pool.query("INSERT INTO project_units (pu_id, proj_id, unit_name, cb_id, com_id, created_by, created_date, pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id, pressure_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *",
                [pu_id, proj_id, unit_name, cb_id, com_id, created_by, new Date(), pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id, pressure_type]);

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
        else{
            for (const i in units) {
                units[i].pu_id = uuidv4();
                units[i].pu_no = await common.generate_pu_no(units[i].proj_id);
                const comp = await pool.query("INSERT INTO project_units (pu_id, proj_id, unit_name, cb_id, com_id, created_by, created_date, pu_no, airflow, pressure) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
                    [units[i].pu_id, units[i].proj_id, units[i].unit_name, units[i].cb_id, units[i].com_id, units[i].created_by, new Date(), units[i].pu_no, units[i].airflow, units[i].pressure]);
            }
            responseObj = {
                "is_success": true,
                "message": "Unit has been inserted",
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
        let rows = page == undefined ? allRows.rows.sort((a, b) => b.created_date - a.created_date) : allRows.rows.slice(start, end).sort((a, b) => b.created_date - a.created_date);
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
        let rows = page == undefined ? allRows.rows.sort((a, b) => b.created_date - a.created_date) : allRows.rows.slice(start, end).sort((a, b) => b.created_date - a.created_date);

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

app.get("/api/pdf", async (req, res) => {
    const id = 'ea30c144-f60a-4bd5-a7be-acf2c2aa271b';
    const employee = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [id]);
    createPdf(employee.rows[0], `pdf-files/${id}.pdf`);
    res.json("pdf created");

} );

app.use(express.static('public'));
app.use('/pdf-files', express.static(__dirname + '/pdf-files'));
app.use('/files', express.static(__dirname + '/files'));


// _______________Api_call__________________ \\
app.post("/api/fansdata/searchfansdata", async (req, res) => {

    try {
        // http://3.109.124.68/getrecordsbyairflowpressure?airflow=50000&pressure=490
        let url = "";
        const { fancriteria, airflow, pressure, fan_diameter, angle, fan_start_diameter, fan_end_diameter, start_angle, end_angle } = req.body;
        
        if(fancriteria == "ap"){
            url = `${fandata_api_url}getrecordsbyairflowpressure?airflow=${airflow}&pressure=${pressure}`;
        }
        else if(fancriteria == "apd"){
            url = `${fandata_api_url}getrecordsbydiameter?airflow=${airflow}&pressure=${pressure}&diameter=${fan_diameter}`;
        }
        else if(fancriteria == "apda"){
            url = `${fandata_api_url}getrecordsbyanglediameter?airflow=${airflow}&pressure=${pressure}&diameter=${fan_diameter}&angle=${angle}`;
        }
        else if(fancriteria == "apdr"){
            url = `${fandata_api_url}getrecordsbydiameterrange?airflow=${airflow}&pressure=${pressure}&start=${fan_start_diameter}&end=${fan_end_diameter}`;
        }
        else{
            url = `${fandata_api_url}getrecordsbyanglediameter?airflow=${airflow}&pressure=${pressure}&diameter=${fan_diameter}&start=${start_angle}&end=${end_angle}`;
        }
        console.log(url);
        url = `${fandata_api_url}files/fansdata.json`;
        const response = await fetch(url);
        const data = await response.json(); 
        const mmArr = _.map(data, 'mm')
        const mmString = mmArr.toString();
        const unit = await pool.query(`SELECT * FROM lookup_fans where fan_diameter IN (${mmString}) `);
        const dia = unit.rows;
        var finalObj = [];
        data.forEach(element => {
            let lookUpFanObj = _.filter(dia, function(o) { return o.fan_diameter == element.mm; });
            let _elem = {
                uuid: uuidv4(),
                ...element,
                ...lookUpFanObj[0]
            };
            finalObj.push(_elem);
        });
        responseObj = {
            "is_success": true,
            "message": "",
            "data": finalObj
        };
    } catch (err) {
        responseObj = {
            "is_success": false,
            "message": err.message,
            "data": null
        };
        res.json(responseObj);
    }
    res.json(responseObj);
    
});
// _______________Api_call__________________ \\

//get all motors
app.get("/api/motors", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder } = req.query;
        let query = 'Select * from lookup_motors where is_delete = 0 order by created_date desc';
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const motors = await pool.query(query);
        let start = parseInt((page - 1) * size);
        let end = parseInt(page * size);
        let rows = page == undefined ? motors.rows.sort((a, b) => b.created_date - a.created_date) : motors.rows.slice(start, end).sort((a, b) => b.created_date - a.created_date);
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
        const { motor_make,classification,ambient_temperature,ip_rating,motor_poles,frame_size,insulation_class,temperature_rise,efficiency_class,rated_power,rated_voltage,rated_motor_frequency,motor_model,rated_speed,efficiency_100,efficiency_75,efficiency_50,power_factor,rated_current_ina,rated_current_isin,torque_nm,torque_tstn,torque_tbtn,moment_of_inertia,weight,created_by } = req.body;
        let motor_id = await common.generate_motor_id();
        const motor = await pool.query("INSERT into lookup_motors (motor_id,motor_make,classification,ambient_temperature,ip_rating,motor_poles,frame_size,insulation_class,temperature_rise,efficiency_class,rated_power,rated_voltage,rated_motor_frequency,motor_model,rated_speed,efficiency_100,efficiency_75,efficiency_50,power_factor,rated_current_ina,rated_current_isin,torque_nm,torque_tstn,torque_tbtn,moment_of_inertia,weight,created_by,created_date) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING *",
            [motor_id,motor_make,classification,ambient_temperature,ip_rating,motor_poles,frame_size,insulation_class,temperature_rise,efficiency_class,rated_power,rated_voltage,rated_motor_frequency,motor_model,rated_speed,efficiency_100,efficiency_75,efficiency_50,power_factor,rated_current_ina,rated_current_isin,torque_nm,torque_tstn,torque_tbtn,moment_of_inertia,weight,created_by,new Date()]);

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
        const { motor_make,classification,ambient_temperature,ip_rating,motor_poles,frame_size,insulation_class,temperature_rise,efficiency_class,rated_power,rated_voltage,rated_motor_frequency,motor_model,rated_speed,efficiency_100,efficiency_75,efficiency_50,power_factor,rated_current_ina,rated_current_isin,torque_nm,torque_tstn,torque_tbtn,moment_of_inertia,weight,updated_by,motor_id } = req.body;

        const motor_update = await pool.query("UPDATE lookup_motors SET motor_make = $1, classification = $2, ambient_temperature = $3,ip_rating = $4,motor_poles = $5, frame_size = $6, insulation_class = $7, temperature_rise = $8, efficiency_class = $9, rated_power = $10, rated_voltage = $11, rated_motor_frequency = $12, motor_model = $13, rated_speed = $14, efficiency_100 = $15, efficiency_75 = $16, efficiency_50 = $17, power_factor = $18, rated_current_ina = $19, rated_current_isin = $20, torque_nm = $21, torque_tstn = $22, torque_tbtn = $23, moment_of_inertia = $24, weight = $25, updated_by = $26, updated_date = $27 WHERE motor_id = $28 RETURNING *",
            [motor_make,classification,ambient_temperature,ip_rating,motor_poles,frame_size,insulation_class,temperature_rise,efficiency_class,rated_power,rated_voltage,rated_motor_frequency,motor_model,rated_speed,efficiency_100,efficiency_75,efficiency_50,power_factor,rated_current_ina,rated_current_isin,torque_nm,torque_tstn,torque_tbtn,moment_of_inertia,weight,updated_by,new Date(), motor_id]);

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
        
        let unit_fan_id = uuidv4();
        const motor = await pool.query("INSERT into unit_fans (diameter, angle, air_flow, pressure, fan_velocity, velocity_pressure, static_pressure, fan_speed, power, power_vfd, total_efficiency, total_static_efficiency, total_pressure, static_pressure_prts, lpa, lp, lwat, lwt, lwai, lwi, max_torque_required, total_efficiency_percentage, static_pressure_percentage, inlet_sound_power_level, outlet_sound_power_level, sound_pressure_level, breakout_sound_power_level, breakout_sound_pressure_level, specific_fan_power, motor_id, created_by, created_date, pu_id, unit_fan_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34) RETURNING *",
            [diameter, angle, air_flow, pressure, fan_velocity, velocity_pressure, static_pressure, fan_speed, power, power_vfd, total_efficiency, total_static_efficiency, total_pressure, static_pressure_prts, lpa, lp, lwat, lwt, lwai, lwi, max_torque_required, total_efficiency_percentage, static_pressure_percentage, inlet_sound_power_level, outlet_sound_power_level, sound_pressure_level, breakout_sound_power_level, breakout_sound_pressure_level, specific_fan_power, motor_id, created_by,new Date(), pu_id, unit_fan_id]);
   
        let unit_fan_id_status = await common.getselectedfansofprojectunit(pu_id);

        if(unit_fan_id_status == null || unit_fan_id_status == '')
        {
            //await common.setfanfromselectedfans(pu_id, unit_fan_id,created_by,new Date());
            const update = await pool.query("UPDATE project_units SET unit_fan_id = $2, fan_selected_by=$3, fan_selected_date=$4 WHERE pu_id = $1 RETURNING *",
            [pu_id, unit_fan_id, created_by, new Date()]);
        }

        responseObj = {
            "is_success": true,
            "message": "Selected Fan data has been created",
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
