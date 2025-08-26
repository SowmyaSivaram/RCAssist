document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const csvFileInput = document.getElementById('csv-file');
    const uploadStatus = document.getElementById('upload-status');
    const startStreamBtn = document.getElementById('start-stream-btn');
    const stopStreamBtn = document.getElementById('stop-stream-btn');
    const logStream = document.getElementById('log-stream');
    let socket;

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const file = csvFileInput.files[0];
        if (!file) {
            uploadStatus.textContent = 'Please select a file.';
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        uploadStatus.textContent = 'Uploading and processing...';
        try {
            const response = await fetch('/classify_csv/', {
                method: 'POST',
                body: formData,
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'result.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                uploadStatus.textContent = 'Processing complete. Your file has been downloaded.';
            } else {
                uploadStatus.textContent = 'Error processing file.';
            }
        } catch (error) {
            console.error('Error:', error);
            uploadStatus.textContent = 'An error occurred.';
        }
    });

    startStreamBtn.addEventListener('click', () => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

        logStream.innerHTML = 'Connecting to stream...';
        startStreamBtn.style.display = 'none';
        stopStreamBtn.style.display = 'inline-block';

        socket.onopen = () => {
            logStream.innerHTML = 'Connection established. Starting simulation...\n';
        };
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.status === 'complete') {
                logStream.innerHTML += '\n<b>Simulation Complete.</b>';
                socket.close();
                return;
            }
            const analysis = data.analysis;
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            const header = document.createElement('div');
            header.className = 'log-header';
            header.innerHTML = `<span class="classification">${analysis.error_type}</span>
                ${analysis.severity !== 'N/A' ? `<span class="severity">${analysis.severity}</span>` : ''}`;
            logEntry.appendChild(header);
            const message = document.createElement('div');
            message.className = 'log-message';
            message.textContent = data.log_message;
            logEntry.appendChild(message);
            if (analysis.suggested_root_cause !== 'N/A') {
                const rca = document.createElement('div');
                rca.className = 'log-rca';
                rca.innerHTML = `<span class="rca-title">Root Cause:</span> ${analysis.suggested_root_cause}`;
                logEntry.appendChild(rca);
            }
            logStream.appendChild(logEntry);
            logStream.scrollTop = logStream.scrollHeight;
        };

        socket.onclose = () => {
            logStream.innerHTML += '\nConnection closed.';
            startStreamBtn.style.display = 'inline-block';
            stopStreamBtn.style.display = 'none';
        };

        socket.onerror = (error) => {
            console.error('WebSocket Error:', error);
            logStream.innerHTML += '\nAn error occurred with the connection.';
        };
    });

    stopStreamBtn.addEventListener('click', () => {
        if (socket) {
            socket.close();
        }
    });
});