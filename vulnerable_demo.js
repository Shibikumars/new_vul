// Example vulnerable code for security check demo
const express = require('express');
const app = express();
const mysql = require('mysql');
const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'test' });

app.get('/user', (req, res) => {
    // Vulnerable to SQL Injection!
    const query = "SELECT * FROM users WHERE name = '" + req.query.name + "'";
    connection.query(query, (err, results) => {
        if (err) return res.status(500).send('DB error');
        res.json(results);
    });
});

app.get('/greet', (req, res) => {
    // Vulnerable to XSS!
    res.send("Hello " + req.query.name);
});

app.listen(3000, () => {
    console.log('Vulnerable demo app running on port 3000');
});
