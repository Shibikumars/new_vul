const express = require('express');
const app = express();

app.get('/greet', (req, res) => {
    // Vulnerable to XSS!
    res.send("Hello " + req.query.name);
});