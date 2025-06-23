// Remove theme toggle code
// Wrap all code in DOMContentLoaded to ensure elements exist

document.addEventListener('DOMContentLoaded', function() {
// Process Table Management
let processCount = 1;
const addProcessBtn = document.querySelector('.add-process-btn');
const removeProcessBtn = document.querySelector('.remove-process-btn');
const processTable = document.querySelector('.main-table tbody');

function createProcessRow(id) {
    return `
        <tr>
            <td class="process-id">P${id}</td>
            <td class="priority hide"><input type="number" min="1" step="1" value="1"></td>
            <td class="arrival-time"><input type="number" min="0" step="1" value="0"></td>
            <td class="burst-time"><input type="number" min="1" step="1" value="1"></td>
            <td>
                <button class="add-process-btn"><i class="fas fa-plus"></i></button>
                <button class="remove-process-btn"><i class="fas fa-minus"></i></button>
            </td>
        </tr>
    `;
}

// Add process button click handler
document.addEventListener('click', function(e) {
    if (e.target.closest('.add-process-btn')) {
        processCount++;
        processTable.insertAdjacentHTML('beforeend', createProcessRow(processCount));
        updateProcessColors();
    }
});

// Remove process button click handler
document.addEventListener('click', function(e) {
    if (e.target.closest('.remove-process-btn')) {
        if (processCount > 1) {
            const rows = processTable.querySelectorAll('tr');
            if (rows.length > 0) {
                processTable.removeChild(rows[rows.length - 1]);
                processCount--;
                updateProcessColors();
            }
        }
    }
});

// Process Colors
const processColors = [
    '#4a90e2', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'
];

function updateProcessColors() {
    const processIds = document.querySelectorAll('.process-id');
    processIds.forEach((id, index) => {
        id.style.color = processColors[index % processColors.length];
    });
}

// Algorithm Selection
const algorithmInputs = document.querySelectorAll('input[name="algo"]');
const timeQuantumDiv = document.getElementById('time-quantum');

algorithmInputs.forEach(input => {
    input.addEventListener('change', () => {
        timeQuantumDiv.classList.toggle('hide', input.id !== 'rr');
    });
});

// Simulation Speed Control
const speedControl = document.getElementById('simulation-speed');
let simulationSpeed = 3;

speedControl.addEventListener('input', (e) => {
    simulationSpeed = e.target.value;
});

// Export/Import Configuration
const exportBtn = document.querySelector('.export-btn');
const importBtn = document.querySelector('.import-btn');

exportBtn.addEventListener('click', () => {
    const config = {
        processes: Array.from(processTable.children).reduce((acc, row, index) => {
            if (index % 2 === 0) {
                const processId = row.querySelector('.process-id').textContent;
                const priority = row.querySelector('.priority input')?.value;
                const arrivalTime = row.querySelector('.arrival-time input').value;
                const burstTime = row.querySelector('.burst-time input').value;
                acc.push({ processId, priority, arrivalTime, burstTime });
            }
            return acc;
        }, []),
        algorithm: document.querySelector('input[name="algo"]:checked').id,
        timeQuantum: document.getElementById('tq').value
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scheduler-config.json';
    a.click();
    URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const config = JSON.parse(event.target.result);
            // Clear existing processes
            while (processCount > 1) {
                processTable.removeChild(processTable.lastElementChild);
                processTable.removeChild(processTable.lastElementChild);
                processCount--;
            }
            // Add imported processes
            config.processes.forEach((process, index) => {
                if (index > 0) {
                    processCount++;
                    processTable.insertAdjacentHTML('beforeend', createProcessRow(processCount));
                }
                const rows = processTable.children;
                const row = rows[index * 2];
                row.querySelector('.process-id').textContent = process.processId;
                if (process.priority) {
                    row.querySelector('.priority input').value = process.priority;
                }
                row.querySelector('.arrival-time input').value = process.arrivalTime;
                row.querySelector('.burst-time input').value = process.burstTime;
            });
            // Set algorithm and time quantum
            document.getElementById(config.algorithm).checked = true;
            document.getElementById('tq').value = config.timeQuantum;
            timeQuantumDiv.classList.toggle('hide', config.algorithm !== 'rr');
            updateProcessColors();
        };
        reader.readAsText(file);
    };
    input.click();
});

// Gantt Chart Visualization
google.charts.load('current', { packages: ['timeline'] });
google.charts.setOnLoadCallback(drawGanttChart);

function drawGanttChart(data = []) {
    const container = document.getElementById('gantt-chart');
    const chart = new google.visualization.Timeline(container);
    const dataTable = new google.visualization.DataTable();

    dataTable.addColumn({ type: 'string', id: 'Process' });
    dataTable.addColumn({ type: 'number', id: 'Start' });
    dataTable.addColumn({ type: 'number', id: 'End' });

    dataTable.addRows(data);

    const options = {
        timeline: {
            showRowLabels: true,
            groupByRowLabel: false,
            colorByRowLabel: true,
            barLabelStyle: { fontSize: 10 },
            rowLabelStyle: { fontSize: 12 }
        },
        backgroundColor: 'transparent',
        colors: processColors,
        height: Math.max(150, data.length * 50), // Dynamic height for all processes
        hAxis: {
            format: '0', // Force integer display
            minValue: 0
        },
    };

    chart.draw(dataTable, options);
}

// Metrics Update
function updateMetrics(waitingTime, turnaroundTime, cpuUtilization) {
    document.getElementById('avg-waiting-time').textContent = waitingTime.toFixed(2);
    document.getElementById('avg-turnaround-time').textContent = turnaroundTime.toFixed(2);
    document.getElementById('cpu-utilization').textContent = `${(cpuUtilization * 100).toFixed(1)}%`;
}

// Run Simulation
const calculateBtn = document.querySelector('.calculate');

// Ensure a hidden P1 row exists before simulation
function ensureHiddenP1() {
    const processIds = Array.from(processTable.querySelectorAll('.process-id'));
    if (!processIds.some(pidElem => pidElem.textContent === 'P1')) {
        // Insert a hidden P1 row at the top
        const tr = document.createElement('tr');
        tr.style.display = 'none';
        tr.innerHTML = `
            <td class="process-id">P1</td>
            <td class="priority hide"><input type="number" min="1" step="1" value="1"></td>
            <td class="arrival-time"><input type="number" min="0" step="1" value="0"></td>
            <td class="burst-time"><input type="number" min="1" step="1" value="1"></td>
            <td></td>
        `;
        processTable.insertBefore(tr, processTable.firstChild);
    }
}

// Animate Gantt Chart
function animateGanttChart(ganttData, speedValue) {
    const delayMap = { 1: 800, 2: 500, 3: 300, 4: 150, 5: 50 };
    const delay = delayMap[speedValue] || 300;
    let step = 0;
    function drawStep() {
        drawGanttChart(ganttData.slice(0, step + 1));
        if (step < ganttData.length - 1) {
            step++;
            setTimeout(drawStep, delay);
        }
    }
    drawStep();
}

calculateBtn.addEventListener('click', () => {
    ensureHiddenP1();
    // Collect all processes using .process-id and force renumbering
    const processIds = Array.from(processTable.querySelectorAll('.process-id'));
    const processes = [];
    processIds.forEach((pidElem, idx) => {
        const row = pidElem.closest('tr');
        // Force processId to be sequential: P1, P2, ...
        const processId = `P${idx + 1}`;
        // Also update the table display to match, except for hidden P1
        if (row.style.display !== 'none') pidElem.textContent = processId;
        const priority = row.querySelector('.priority input')?.value;
        const arrivalInput = row.querySelector('.arrival-time input');
        const burstInput = row.querySelector('.burst-time input');
        if (!processId || !arrivalInput || !burstInput) {
            console.log(`Process ${processId}: missing fields, skipping.`);
            return;
        }
        const arrivalTime = parseInt(arrivalInput.value);
        const burstTime = parseInt(burstInput.value);
        if (isNaN(arrivalTime) || isNaN(burstTime)) {
            console.log(`Process ${processId}: invalid numbers, skipping.`);
            return;
        }
        if (arrivalTime < 0 || burstTime < 1) {
            console.log(`Process ${processId}: invalid range, skipping.`);
            return;
        }
        processes.push({ processId, priority, arrivalTime, burstTime });
        console.log(`Added process:`, { processId, arrivalTime, burstTime });
    });
    console.log('All collected processes:', processes);
    if (processes.length === 0) {
        alert('Please add at least one process with valid data.');
        return;
    }
    const algorithm = document.querySelector('input[name="algo"]:checked').id;
    const timeQuantum = parseInt(document.getElementById('tq').value) || 2;
    let result;
    switch (algorithm) {
        case 'fcfs':
            result = runFCFS(processes);
            break;
        case 'sjf':
            result = runSJF(processes);
            break;
        case 'ljf':
            result = runLJF(processes);
            break;
        case 'rr':
            result = runRoundRobin(processes, timeQuantum);
            break;
        case 'srjf':
            result = runSRTF(processes);
            break;
        case 'lrjf':
            result = runLRTF(processes);
            break;
        case 'hrrn':
            result = runHRRN(processes);
            break;
    }
    if (result) {
        console.log('Gantt chart data:', result.ganttData);
        // Use the simulation speed slider value
        const speedValue = parseInt(document.getElementById('simulation-speed').value) || 3;
        animateGanttChart(result.ganttData, speedValue);
        updateMetrics(result.avgWaitingTime, result.avgTurnaroundTime, result.cpuUtilization);
    }
});

// Sample data button
document.querySelector('.sample-data-btn').addEventListener('click', () => {
    // Clear existing processes
    processTable.innerHTML = '';
    processCount = 0;
    
    // Add sample processes
    const sampleProcesses = [
        { id: 1, arrival: 0, burst: 4 },
        { id: 2, arrival: 1, burst: 3 },
        { id: 3, arrival: 2, burst: 5 }
    ];
    
    sampleProcesses.forEach(proc => {
        processCount++;
        processTable.insertAdjacentHTML('beforeend', createProcessRow(processCount));
        const rows = processTable.querySelectorAll('tr');
        const lastRow = rows[rows.length - 1];
        lastRow.querySelector('.arrival-time input').value = proc.arrival;
        lastRow.querySelector('.burst-time input').value = proc.burst;
    });
    
    updateProcessColors();
});

// Algorithm Implementations
function runFCFS(processes) {
    // Defensive copy and sort
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const ganttData = [];
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    sortedProcesses.forEach(process => {
        if (currentTime < process.arrivalTime) {
            currentTime = process.arrivalTime;
        }
        const waitingTime = currentTime - process.arrivalTime;
        const turnaroundTime = waitingTime + process.burstTime;
        ganttData.push([process.processId, currentTime, currentTime + process.burstTime]);
        totalWaitingTime += waitingTime;
        totalTurnaroundTime += turnaroundTime;
        currentTime += process.burstTime;
    });
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / sortedProcesses.length,
        avgTurnaroundTime: totalTurnaroundTime / sortedProcesses.length,
        cpuUtilization: sortedProcesses.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// Shortest Job First (Non-preemptive)
function runSJF(processes) {
    let procs = processes.map(p => ({...p}));
    let n = procs.length, completed = 0, currentTime = 0;
    let ganttData = [];
    let totalWaitingTime = 0, totalTurnaroundTime = 0;
    let isCompleted = Array(n).fill(false);
    while (completed < n) {
        let idx = -1, minBurst = Infinity;
        for (let i = 0; i < n; i++) {
            if (!isCompleted[i] && procs[i].arrivalTime <= currentTime && procs[i].burstTime < minBurst) {
                minBurst = procs[i].burstTime;
                idx = i;
            }
        }
        if (idx === -1) {
            currentTime++;
        } else {
            let start = currentTime;
            let end = start + procs[idx].burstTime;
            ganttData.push([procs[idx].processId, start, end]);
            let waiting = start - procs[idx].arrivalTime;
            let turnaround = end - procs[idx].arrivalTime;
            totalWaitingTime += waiting;
            totalTurnaroundTime += turnaround;
            currentTime = end;
            isCompleted[idx] = true;
            completed++;
        }
    }
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        cpuUtilization: procs.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// Longest Job First (Non-preemptive)
function runLJF(processes) {
    let procs = processes.map(p => ({...p}));
    let n = procs.length, completed = 0, currentTime = 0;
    let ganttData = [];
    let totalWaitingTime = 0, totalTurnaroundTime = 0;
    let isCompleted = Array(n).fill(false);
    while (completed < n) {
        let idx = -1, maxBurst = -1;
        for (let i = 0; i < n; i++) {
            if (!isCompleted[i] && procs[i].arrivalTime <= currentTime && procs[i].burstTime > maxBurst) {
                maxBurst = procs[i].burstTime;
                idx = i;
            }
        }
        if (idx === -1) {
            currentTime++;
        } else {
            let start = currentTime;
            let end = start + procs[idx].burstTime;
            ganttData.push([procs[idx].processId, start, end]);
            let waiting = start - procs[idx].arrivalTime;
            let turnaround = end - procs[idx].arrivalTime;
            totalWaitingTime += waiting;
            totalTurnaroundTime += turnaround;
            currentTime = end;
            isCompleted[idx] = true;
            completed++;
        }
    }
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        cpuUtilization: procs.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// Round Robin (Preemptive)
function runRoundRobin(processes, timeQuantum) {
    let procs = processes.map(p => ({...p, remaining: p.burstTime}));
    let n = procs.length, completed = 0, currentTime = 0;
    let ganttData = [];
    let queue = [];
    let totalWaitingTime = 0, totalTurnaroundTime = 0;
    let lastEnd = {};
    let arrived = Array(n).fill(false);
    while (completed < n) {
        // Add newly arrived processes
        for (let i = 0; i < n; i++) {
            if (!arrived[i] && procs[i].arrivalTime <= currentTime) {
                queue.push(i);
                arrived[i] = true;
            }
        }
        if (queue.length === 0) {
            currentTime++;
            continue;
        }
        let idx = queue.shift();
        let proc = procs[idx];
        let start = Math.max(currentTime, proc.arrivalTime, lastEnd[idx] || 0);
        let execTime = Math.min(timeQuantum, proc.remaining);
        let end = start + execTime;
        ganttData.push([proc.processId, start, end]);
        proc.remaining -= execTime;
        currentTime = end;
        lastEnd[idx] = end;
        // Add newly arrived processes during this quantum
        for (let i = 0; i < n; i++) {
            if (!arrived[i] && procs[i].arrivalTime <= currentTime) {
                queue.push(i);
                arrived[i] = true;
            }
        }
        if (proc.remaining > 0) {
            queue.push(idx);
        } else {
            completed++;
            let turnaround = end - proc.arrivalTime;
            let waiting = turnaround - proc.burstTime;
            totalWaitingTime += waiting;
            totalTurnaroundTime += turnaround;
        }
    }
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        cpuUtilization: procs.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// Shortest Remaining Time First (Preemptive SJF)
function runSRTF(processes) {
    let procs = processes.map(p => ({...p, remaining: p.burstTime}));
    let n = procs.length, completed = 0, currentTime = 0;
    let ganttData = [];
    let isCompleted = Array(n).fill(false);
    let lastProc = null, startTime = 0;
    let totalWaitingTime = 0, totalTurnaroundTime = 0;
    while (completed < n) {
        let idx = -1, minRem = Infinity;
        for (let i = 0; i < n; i++) {
            if (!isCompleted[i] && procs[i].arrivalTime <= currentTime && procs[i].remaining < minRem && procs[i].remaining > 0) {
                minRem = procs[i].remaining;
                idx = i;
            }
        }
        if (idx === -1) {
            currentTime++;
            continue;
        }
        if (lastProc !== idx) {
            if (lastProc !== null && procs[lastProc].remaining > 0) {
                ganttData.push([procs[lastProc].processId, startTime, currentTime]);
            }
            startTime = currentTime;
            lastProc = idx;
        }
        procs[idx].remaining--;
        currentTime++;
        if (procs[idx].remaining === 0) {
            isCompleted[idx] = true;
            completed++;
            ganttData.push([procs[idx].processId, startTime, currentTime]);
            let turnaround = currentTime - procs[idx].arrivalTime;
            let waiting = turnaround - procs[idx].burstTime;
            totalWaitingTime += waiting;
            totalTurnaroundTime += turnaround;
            lastProc = null;
        }
    }
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        cpuUtilization: procs.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// Longest Remaining Time First (Preemptive LJF)
function runLRTF(processes) {
    let procs = processes.map(p => ({...p, remaining: p.burstTime}));
    let n = procs.length, completed = 0, currentTime = 0;
    let ganttData = [];
    let isCompleted = Array(n).fill(false);
    let lastProc = null, startTime = 0;
    let totalWaitingTime = 0, totalTurnaroundTime = 0;
    while (completed < n) {
        let idx = -1, maxRem = -1;
        for (let i = 0; i < n; i++) {
            if (!isCompleted[i] && procs[i].arrivalTime <= currentTime && procs[i].remaining > maxRem && procs[i].remaining > 0) {
                maxRem = procs[i].remaining;
                idx = i;
            }
        }
        if (idx === -1) {
            currentTime++;
            continue;
        }
        if (lastProc !== idx) {
            if (lastProc !== null && procs[lastProc].remaining > 0) {
                ganttData.push([procs[lastProc].processId, startTime, currentTime]);
            }
            startTime = currentTime;
            lastProc = idx;
        }
        procs[idx].remaining--;
        currentTime++;
        if (procs[idx].remaining === 0) {
            isCompleted[idx] = true;
            completed++;
            ganttData.push([procs[idx].processId, startTime, currentTime]);
            let turnaround = currentTime - procs[idx].arrivalTime;
            let waiting = turnaround - procs[idx].burstTime;
            totalWaitingTime += waiting;
            totalTurnaroundTime += turnaround;
            lastProc = null;
        }
    }
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        cpuUtilization: procs.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// Highest Response Ratio Next (Non-preemptive)
function runHRRN(processes) {
    let procs = processes.map(p => ({...p}));
    let n = procs.length, completed = 0, currentTime = 0;
    let ganttData = [];
    let totalWaitingTime = 0, totalTurnaroundTime = 0;
    let isCompleted = Array(n).fill(false);
    while (completed < n) {
        let idx = -1, maxRR = -1;
        for (let i = 0; i < n; i++) {
            if (!isCompleted[i] && procs[i].arrivalTime <= currentTime) {
                let waiting = currentTime - procs[i].arrivalTime;
                let rr = (waiting + procs[i].burstTime) / procs[i].burstTime;
                if (rr > maxRR) {
                    maxRR = rr;
                    idx = i;
                }
            }
        }
        if (idx === -1) {
            currentTime++;
        } else {
            let start = currentTime;
            let end = start + procs[idx].burstTime;
            ganttData.push([procs[idx].processId, start, end]);
            let waiting = start - procs[idx].arrivalTime;
            let turnaround = end - procs[idx].arrivalTime;
            totalWaitingTime += waiting;
            totalTurnaroundTime += turnaround;
            currentTime = end;
            isCompleted[idx] = true;
            completed++;
        }
    }
    return {
        ganttData,
        avgWaitingTime: totalWaitingTime / n,
        avgTurnaroundTime: totalTurnaroundTime / n,
        cpuUtilization: procs.reduce((sum, p) => sum + p.burstTime, 0) / currentTime
    };
}

// --- Page Replacement Section ---
const pageTable = document.querySelector('.page-table tbody');
const addPageBtn = document.querySelector('.add-page-btn');
const removePageBtn = document.querySelector('.remove-page-btn');
const pageSampleBtn = document.querySelector('.page-sample-data-btn');
const pageCalcBtn = document.querySelector('.page-calculate');
const pageReferenceInput = document.querySelector('.page-reference-input');
const pageFaultsElem = document.getElementById('page-faults');
const pageHitsElem = document.getElementById('page-hits');
const pageChart = document.getElementById('page-replacement-chart');

// Add/Remove reference string rows (optional, but UI supports it)
addPageBtn.addEventListener('click', () => {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="page-reference-input" placeholder="e.g. 7 0 1 2 0 3 0 4 2 3 0 3 2" style="width: 100%"></td>
        <td>
            <button class="add-page-btn"><i class="fas fa-plus"></i></button>
            <button class="remove-page-btn"><i class="fas fa-minus"></i></button>
        </td>
    `;
    pageTable.appendChild(row);
    row.querySelector('.add-page-btn').addEventListener('click', addPageBtn.onclick);
    row.querySelector('.remove-page-btn').addEventListener('click', removePageBtn.onclick);
});

removePageBtn.addEventListener('click', () => {
    if (pageTable.children.length > 1) {
        pageTable.removeChild(pageTable.lastElementChild);
    }
});

// Load Sample Data
pageSampleBtn.addEventListener('click', () => {
    // Use a standard reference string
    const sample = '7 0 1 2 0 3 0 4 2 3 0 3 2';
    // Set the first input
    pageTable.querySelector('.page-reference-input').value = sample;
    // Clear any additional rows
    while (pageTable.children.length > 1) {
        pageTable.removeChild(pageTable.lastElementChild);
    }
});

// Page Replacement Algorithms
function parseReferenceString(str) {
    return str.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
}

function runFIFO(refs, frames) {
    let queue = [];
    let faults = 0, hits = 0;
    let history = [];
    refs.forEach(page => {
        if (!queue.includes(page)) {
            faults++;
            if (queue.length === frames) queue.shift();
            queue.push(page);
        } else {
            hits++;
        }
        history.push([...queue]);
    });
    return { faults, hits, history };
}

function runLRU(refs, frames) {
    let queue = [];
    let faults = 0, hits = 0;
    let history = [];
    refs.forEach(page => {
        let idx = queue.indexOf(page);
        if (idx === -1) {
            faults++;
            if (queue.length === frames) queue.shift();
        } else {
            hits++;
            queue.splice(idx, 1);
        }
        queue.push(page);
        history.push([...queue]);
    });
    return { faults, hits, history };
}

function runOptimal(refs, frames) {
    let queue = [];
    let faults = 0, hits = 0;
    let history = [];
    refs.forEach((page, i) => {
        if (!queue.includes(page)) {
            faults++;
            if (queue.length === frames) {
                // Find the page not used for the longest in future
                let idxToRemove = 0, farthest = -1;
                for (let j = 0; j < queue.length; j++) {
                    let idx = refs.slice(i + 1).indexOf(queue[j]);
                    if (idx === -1) {
                        idxToRemove = j;
                        break;
                    } else if (idx > farthest) {
                        farthest = idx;
                        idxToRemove = j;
                    }
                }
                queue.splice(idxToRemove, 1);
            }
            queue.push(page);
        } else {
            hits++;
        }
        history.push([...queue]);
    });
    return { faults, hits, history };
}

// Visualization (enhanced table with color coding and summary row)
function showPageChart(refs, history, frames, faultArr) {
    let html = '<table style="width:100%;text-align:center;border-collapse:collapse;">';
    html += '<tr><th>Ref</th>';
    for (let i = 0; i < refs.length; i++) html += `<th>${refs[i]}</th>`;
    html += '</tr>';
    for (let f = 0; f < frames; f++) {
        html += `<tr><td>Frame ${f + 1}</td>`;
        for (let i = 0; i < refs.length; i++) {
            let val = history[i][f] !== undefined ? history[i][f] : '';
            let style = '';
            if (faultArr && faultArr[i] && history[i][f] !== undefined && val === refs[i]) style = 'background:#ffcccc;font-weight:bold;';
            html += `<td style="${style}">${val}</td>`;
        }
        html += '</tr>';
    }
    // Summary row for Fault/Hit
    html += '<tr><td><b>Result</b></td>';
    for (let i = 0; i < refs.length; i++) {
        if (faultArr && faultArr[i]) {
            html += '<td style="background:#ff4d4d;color:white;font-weight:bold;">F</td>';
        } else {
            html += '<td style="background:#4caf50;color:white;font-weight:bold;">H</td>';
        }
    }
    html += '</tr>';
    html += '</table>';
    // Legend
    html += '<div style="margin-top:10px;text-align:left;font-size:0.95em;">'
        + '<span style="display:inline-block;width:18px;height:18px;background:#ff4d4d;margin-right:5px;vertical-align:middle;"></span>Page Fault '
        + '<span style="display:inline-block;width:18px;height:18px;background:#4caf50;margin-left:15px;margin-right:5px;vertical-align:middle;"></span>Page Hit '
        + '<span style="display:inline-block;width:18px;height:18px;background:#ffeb3b;margin-left:15px;margin-right:5px;vertical-align:middle;border:1px solid #ccc;"></span>Current Reference'
        + '</div>';
    pageChart.innerHTML = html;
}

// Animate Page Replacement Chart
function animatePageChart(refs, history, frames, faultArr, speedValue) {
    const delayMap = { 1: 800, 2: 500, 3: 300, 4: 150, 5: 50 };
    const delay = delayMap[speedValue] || 300;
    let step = 0;
    function drawStep() {
        showPageChart(refs.slice(0, step + 1), history.slice(0, step + 1), frames, faultArr ? faultArr.slice(0, step + 1) : undefined);
        if (step < refs.length - 1) {
            step++;
            setTimeout(drawStep, delay);
        }
    }
    drawStep();
}

// Run Simulation
pageCalcBtn.addEventListener('click', () => {
    // Get reference string and number of frames (default 3)
    const refInput = pageTable.querySelector('.page-reference-input').value;
    const refs = parseReferenceString(refInput);
    const frames = parseInt(document.getElementById('num-frames').value) || 3;
    const algo = document.querySelector('input[name="page-algo"]:checked').id;
    let result;
    let faultArr = [];
    if (algo === 'fifo') {
        result = runFIFO(refs, frames);
        // Fault array: true if fault at that step
        let queue = [], arr = [];
        refs.forEach(page => {
            if (!queue.includes(page)) {
                arr.push(true);
                if (queue.length === frames) queue.shift();
                queue.push(page);
            } else {
                arr.push(false);
            }
        });
        faultArr = arr;
    }
    else if (algo === 'lru') {
        result = runLRU(refs, frames);
        let queue = [], arr = [];
        refs.forEach(page => {
            let idx = queue.indexOf(page);
            if (idx === -1) {
                arr.push(true);
                if (queue.length === frames) queue.shift();
            } else {
                arr.push(false);
                queue.splice(idx, 1);
            }
            queue.push(page);
        });
        faultArr = arr;
    }
    else if (algo === 'optimal') {
        result = runOptimal(refs, frames);
        let queue = [], arr = [];
        refs.forEach((page, i) => {
            if (!queue.includes(page)) {
                arr.push(true);
                if (queue.length === frames) {
                    let idxToRemove = 0, farthest = -1;
                    for (let j = 0; j < queue.length; j++) {
                        let idx = refs.slice(i + 1).indexOf(queue[j]);
                        if (idx === -1) {
                            idxToRemove = j;
                            break;
                        } else if (idx > farthest) {
                            farthest = idx;
                            idxToRemove = j;
                        }
                    }
                    queue.splice(idxToRemove, 1);
                }
                queue.push(page);
            } else {
                arr.push(false);
            }
        });
        faultArr = arr;
    }
    else return;
    pageFaultsElem.textContent = result.faults;
    pageHitsElem.textContent = result.hits;
    // Animate the chart
    const speedValue = parseInt(document.getElementById('page-simulation-speed').value) || 3;
    animatePageChart(refs, result.history, frames, faultArr, speedValue);
});

});