const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require('uuid');
const crypto = require("./crypto");
const common = require("./common");
const fs = require("fs");
//Port
const port = process.env.PORT || 3007;
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
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
        pu.pu_no, pu.airflow, pu.pressure, pu.cb_id, pu.com_id, pu.airflow_luc_id, pu.pressure_luc_id, aluc.unit as airflow_unit, pluc.unit as pressure_unit
            from project_units pu left join lookup_unit_conversion aluc on aluc.luc_id = pu.airflow_luc_id
            left join lookup_unit_conversion pluc on pluc.luc_id = pu.pressure_luc_id where pu.proj_id = $1`
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
        const { proj_id, unit_name, airflow, pressure, cb_id, com_id, created_by, airflow_luc_id, pressure_luc_id } = req.body;
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
            const comp = await pool.query("INSERT INTO project_units (pu_id, proj_id, unit_name, cb_id, com_id, created_by, created_date, pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
                [pu_id, proj_id, unit_name, cb_id, com_id, created_by, new Date(), pu_no, airflow, pressure, airflow_luc_id, pressure_luc_id]);

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
        const { pu_id, unit_name, airflow, pressure, updated_by, airflow_luc_id, pressure_luc_id } = req.body;

        const unit_update = await pool.query("UPDATE project_units SET unit_name = $1, airflow = $2, pressure = $3, updated_by = $4, updated_date = $5, airflow_luc_id =$7, pressure_luc_id = $8 WHERE pu_id = $6 RETURNING *",
            [unit_name, airflow, pressure, updated_by, new Date(), pu_id, airflow_luc_id, pressure_luc_id]);
        responseObj = {
            "is_success": true,
            "message": "Company has been updated",
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
    const { id } = req.params;
    const employee = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [id]);
    const response = await common.generate_pdf(employee);
    fs.readFile(response.filename, function (err, data){
        resp.contentType("application/pdf");
        resp.send(data);
    });
});