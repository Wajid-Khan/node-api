const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require("bcrypt");

//Port
const port = process.env.PORT || 3000;
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
    "is_success" : false,
    "message" : '',
    "data" : null
};

//create a employee
app.post("/api/employee/create", async(req, res) => {
    try{
        const { first_name, middle_name, last_name, email, password, role_id } = req.body;
        const emp_id = uuidv4();
        const emp_no = "Emp-"+Math.random().toString(36).substring(2, 8);
        const newTodo = await pool.query("INSERT INTO employees (emp_id, emp_no , first_name, middle_name, last_name, email, emp_password, created_by, created_date, role_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *", 
        [emp_id, emp_no, first_name, middle_name, last_name, email, password, email, dateTime, role_id] );

        responseObj = {
            "is_success" : true,
            "message" : "Employee has been inserted",
            "data" : {"empData" : newTodo.rows}
        };
        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});

//get all employees
app.get("/api/employees", async(req, res) => {
    try{
        const allEmp = await pool.query("SELECT * FROM employees");

        responseObj = {
            "is_success" : true,
            "message" : "List of employees",
            "data" : allEmp.rows
        };

        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});

//get a single employee
app.get("/api/employee/:id", async(req, res) => {
    try{
        const { id } = req.params;
        const employee = await pool.query("SELECT * FROM employees WHERE emp_id = $1", [id]);
        if(employee.rows.length > 0)
        {
            responseObj = {
                "is_success" : true,
                "message" : "",
                "data" : employee.rows[0]
            };
        }
        else
        {
            responseObj = {
                "is_success" : false,
                "message" : "No records found",
                "data" : null
            };
        }
        
        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});

//update a employee
app.put("/api/employee/edit/:id", async(req, res) => {
    try{
        const { id } = req.params;
        const { first_name, middle_name, last_name, email, password, role_id } = req.body;
        const emp_update = await pool.query("UPDATE employees SET first_name = $1, middle_name=$2, last_name=$3, email = $4, emp_password = $5, updated_by = $4, role_id = $6, updated_date = $7 WHERE emp_no = $8 RETURNING *", [first_name, middle_name, last_name, email, password, role_id, dateTime, id] );

        responseObj = {
            "is_success" : true,
            "message" : "Employee has been updated",
            "data" : emp_update.rows
        };

        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});

//delete a employee
app.delete("/api/employee/delete/:id", async(req, res) => {
    try{
        const { id } = req.params;
        const todo = await pool.query("DELETE FROM employees WHERE emp_no = $1", [id]);

        responseObj = {
            "is_success" : true,
            "message" : "Employee has been deleted",
            "data" : null
        };
        
        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});


//____________________________________Project_API__________________________________//

//create a project
app.post("/api/project/create", async(req, res) => {
    try{
        const { proj_name, com_id, cb_id } = req.body;
        const proj_id = uuidv4();

        const newProj = await pool.query("INSERT INTO projects (proj_id, proj_name, com_id, cb_id, created_by, created_date) VALUES($1, $2, $3, $4, $5, $6) RETURNING *", 
        [proj_id, proj_name, com_id, cb_id, proj_id, dateTime] );

        responseObj = {
            "is_success" : true,
            "message" : "Project has been inserted",
            "data" : newProj.rows
        };
        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});

//get all projects
app.get("/api/projects", async(req, res) => {
    try{
        const allProj = await pool.query("SELECT * FROM projects");

        responseObj = {
            "is_success" : true,
            "message" : "List of projects",
            "data" : allProj.rows
        };

        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
        };
        res.json(responseObj);
    }
});

// //get a single project
app.get("/api/project/:id", async(req, res) => {
    try{
        const { id } = req.params;
        const project = await pool.query("SELECT * FROM projects WHERE proj_id = $1", [id]);

        responseObj = {
            "is_success" : true,
            "message" : "",
            "data" : project.rows[0]
        };

        res.json(responseObj);

    } catch(err){
        responseObj = {
            "is_success" : false,
            "message" : err.message,
            "data" : null
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