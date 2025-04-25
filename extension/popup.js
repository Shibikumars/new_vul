document.getElementById('checkBtn').addEventListener('click', async function() {
    const code = document.getElementById('codeInput').value;
    const resultDiv = document.getElementById('result');
    const fixBtn = document.getElementById('fixBtn');
    const fixArea = document.getElementById('fixArea');
    resultDiv.textContent = 'Checking for vulnerabilities...';
    fixBtn.style.display = 'none';
    fixArea.style.display = 'none';
    try {
        const response = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        if (!response.ok) {
            resultDiv.textContent = 'Server error: ' + response.status;
            return;
        }
        const data = await response.json();
        if (data && data.vulnerabilities) {
            if (data.vulnerabilities.length === 0) {
                resultDiv.textContent = 'No vulnerabilities detected.';
            } else {
                resultDiv.innerHTML = '<b>Vulnerabilities Found:</b><br>' +
                    data.vulnerabilities.map(vul => `• ${vul}`).join('<br>');
                if (data.fix) {
                    fixBtn.style.display = 'block';
                    fixArea.style.display = 'block';
                    fixArea.innerHTML = '<b>Suggested Fix:</b><br><pre>' + data.fix + '</pre>';
                    fixBtn.onclick = function() {
                        document.getElementById('codeInput').value = data.fix;
                    };
                } else {
                    fixBtn.style.display = 'none';
                    fixArea.style.display = 'none';
                }
            }
        } else {
            resultDiv.textContent = 'Unexpected response from server.';
        }
    } catch (err) {
        resultDiv.textContent = 'Error connecting to backend: ' + err;
        fixBtn.style.display = 'none';
        fixArea.style.display = 'none';
    }
});
