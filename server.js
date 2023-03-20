const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require('uuid');
const crypto = require("./crypto");
const common = require("./common");
//Port
const port = process.env.PORT || 3007;
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
});

//middleware
app.use(cors());
app.use(express.json()); //req.body

let date_ob = new Date();
let date = ("0" + date_ob.getDate()).slice(-2);
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
let year = date_ob.getFullYear();
let hours = date_ob.getHours();
let minutes = date_ob.getMinutes();
let seconds = date_ob.getSeconds();
const dateTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

let responseObj = {
    "is_success": false,
    "message": '',
    "data": null
};


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
        const emp_no = "Emp-" + await common.generate_emp_no();
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
        let query = `select e.emp_id, e.emp_no, concat(e.first_name, ' ', e.last_name) as name, e.email, e.is_active, e.is_delete, e.role_id, r.role_name
        FROM employees e left join lookup_roles r on e.role_id = r.role_id where is_delete = 0 and r.role_id > 0`
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const allEmp = await pool.query(query);
        var start = parseInt((page - 1) * size);
        var end = parseInt(page * size);
        responseObj = {
            "is_success": true,
            "message": "List of employees",
            "data": allEmp.rows.slice(start, end),
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
            [first_name, middle_name, last_name, role_id,  updated_by,new Date(), emp_id]);

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
app.delete("/api/employee/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const todo = await pool.query("Update employees Set is_delete=1 WHERE emp_no = $1", [id]);

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
        const { proj_name, com_id, cb_id } = req.body;
        const proj_id = uuidv4();

        const newProj = await pool.query("INSERT INTO projects (proj_id, proj_name, com_id, cb_id, created_by, created_date) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
            [proj_id, proj_name, com_id, cb_id, proj_id, dateTime]);

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
        const allProj = await pool.query("SELECT * FROM projects");

        responseObj = {
            "is_success": true,
            "message": "List of projects",
            "data": allProj.rows
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
        const project = await pool.query("SELECT * FROM projects WHERE proj_id = $1", [id]);

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
// app.put("/api/project/edit/:id", async(req, res) => {
//     try{
//         const { id } = req.params;
//         const { first_name, middle_name, last_name, email, password, role_id } = req.body;
//         const emp_update = await pool.query("UPDATE projects SET first_name = $1, middle_name=$2, last_name=$3, email = $4, emp_password = $5, updated_by = $4, role_id = $6, updated_date = $7 WHERE emp_no = $8 RETURNING *", [first_name, middle_name, last_name, email, password, role_id, dateTime, id] );

//         responseObj = {
//             "is_success" : true,
//             "message" : "project has been updated",
//             "data" : emp_update.rows
//         };

//         res.json(responseObj);

//     } catch(err){
//         responseObj = {
//             "is_success" : false,
//             "message" : err.message,
//             "data" : null
//         };
//         res.json(responseObj);
//     }
// });

// //delete a project
// app.delete("/api/project/delete/:id", async(req, res) => {
//     try{
//         const { id } = req.params;
//         const todo = await pool.query("DELETE FROM projects WHERE emp_no = $1", [id]);

//         responseObj = {
//             "is_success" : true,
//             "message" : "project has been deleted",
//             "data" : null
//         };

//         res.json(responseObj);

//     } catch(err){
//         responseObj = {
//             "is_success" : false,
//             "message" : err.message,
//             "data" : null
//         };
//         res.json(responseObj);
//     }
// });

//_______________________________Start__Company___________________________________________________________//

//create a company

app.post("/api/company/create", async (req, res) => {
    try {
        const { com_name, created_by } = req.body;
        const com_id = uuidv4();
        const com_no = "Com-" + await common.generate_comp_no();
        console.log(com_no);
        const comp = await pool.query("INSERT INTO companies (com_id, com_name, com_no, created_by, created_date) VALUES($1, $2, $3, $4, $5) RETURNING *",
            [com_id, com_name,com_no, created_by, new Date()]);

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

app.put("/api/company/edit", async (req, res) => {
    try {
        const { com_name, updated_by, com_id } = req.body;

        const emp_update = await pool.query("UPDATE companies SET com_name = $1, updated_by = $2, updated_date = $3 WHERE com_id = $4 RETURNING *",
            [com_name, updated_by,new Date(), com_id]);

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

//get all companies
app.get("/api/companies", async (req, res) => {
    try {
        const { size, page, sortField, sortOrder } = req.query;
        let query = `select * from companies where is_delete = 0`
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        const allRows = await pool.query(query);
        var start = parseInt((page - 1) * size);
        var end = parseInt(page * size);
        responseObj = {
            "is_success": true,
            "message": "List of companies",
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

app.get("/api/branches/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { size, page, sortField, sortOrder } = req.query;
        let query = `select * from company_branches where is_delete = 0 and com_id='${id}'`
        if (sortField) {
            query += `  order by ${sortField} ${sortOrder == 'ascend' ? `asc` : `desc`}`
        }
        console.log(query);
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

app.post("/api/branch/create", async (req, res) => {
    try {
        const { com_id, com_branch_name, cb_address, phone_no, primary_contact_name, primary_contact_phone_no, primary_contact_email, created_by } = req.body;
        const cb_id = uuidv4();
        const cb_no = "Com-" + await common.generate_comp_no();

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

//_______________________________End__Company___________________________________________________________//

//_______________________________Start__Company__Unit____________________________________________________//

//create a company unit
app.post("/api/unit/create", async (req, res) => {
    try {
        const { proj_id, unit_name, cb_id, com_id } = req.body;
        const pu_id = uuidv4();
        const comp = await pool.query("INSERT INTO project_units (pu_id, proj_id, unit_name, cb_id, com_id, created_by, created_date) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [pu_id, proj_id, unit_name, cb_id, com_id, com_id, dateTime]);

        responseObj = {
            "is_success": true,
            "message": "Company unit has been inserted",
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

//get all companies unit
app.get("/api/units", async (req, res) => {
    try {
        const allProj = await pool.query("SELECT * FROM project_units");

        responseObj = {
            "is_success": true,
            "message": "List of company's unit",
            "data": allProj.rows
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