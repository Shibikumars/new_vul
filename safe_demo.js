// Example safe code for security check demo
const express = require('express');
const app = express();
const mysql = require('mysql');
const connection = mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'test' });

app.get('/user', (req, res) => {
    // Safe: Use parameterized queries to prevent SQL Injection
    const query = "SELECT * FROM users WHERE name = ?";
    connection.query(query, [req.query.name], (err, results) => {
        if (err) return res.status(500).send('DB error');
        res.json(results);
    });
});

app.get('/greet', (req, res) => {
    // Safe: Escape user input to prevent XSS
    const escape = str => String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    res.send("Hello " + escape(req.query.name));
});

app.listen(3000, () => {
    console.log('Safe demo app running on port 3000');
});
