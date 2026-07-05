// State Management
let allLogs = [];
let agentFilter = 'all';
let statusFilter = 'all';

// HTML Entity Escaper for XSS Prevention
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Fetch Initial Data
async function initDashboard() {
  try {
    // 1. Fetch initial statistics
    const statsRes = await fetch('/api/stats');
    if (statsRes.ok) {
      const stats = await statsRes.json();
      updateMetrics(stats.summary);
      renderDonutChart(stats.tokenUsageByModel);
      populateAgentFilter(stats.actionsByAgent);
    }

    // 2. Fetch initial logs
    const logsRes = await fetch('/api/logs');
    if (logsRes.ok) {
      allLogs = await logsRes.json();
      renderLogs();
    }
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
  }
}

// Update Dashboard metrics cards
function updateMetrics(summary) {
  if (!summary) return;
  document.getElementById('metric-cost').textContent = `$${summary.totalCost.toFixed(6)}`;
  document.getElementById('metric-tokens').textContent = summary.totalTokens.toLocaleString();
  document.getElementById('metric-prompt-comp').textContent = 
    `${summary.totalPromptTokens.toLocaleString()} prompt / ${summary.totalCompletionTokens.toLocaleString()} completion`;
  document.getElementById('metric-actions').textContent = summary.totalActions.toLocaleString();
  document.getElementById('metric-success-fail').textContent = 
    `${summary.successfulActions.toLocaleString()} success / ${summary.failedActions.toLocaleString()} failed`;
  document.getElementById('metric-rate').textContent = `${summary.successRate.toFixed(1)}%`;
  document.getElementById('rate-bar').style.width = `${summary.successRate}%`;
}

// Populate Agent Dropdown Filter
function populateAgentFilter(actionsByAgent) {
  const select = document.getElementById('filter-agent');
  // Clear options except "All"
  select.innerHTML = '<option value="all">All Agents</option>';
  
  if (actionsByAgent) {
    Object.keys(actionsByAgent).forEach(agentId => {
      const option = document.createElement('option');
      option.value = agentId;
      option.textContent = agentId.charAt(0).toUpperCase() + agentId.slice(1);
      select.appendChild(option);
    });
  }
  select.value = agentFilter;
}

// Render dynamic Donut Chart using SVG
function renderDonutChart(usageByModel) {
  const svg = document.getElementById('svg-donut');
  const legend = document.getElementById('chart-legend');
  svg.innerHTML = '';
  legend.innerHTML = '';

  const models = Object.keys(usageByModel || {});
  if (models.length === 0) {
    // Empty state circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '35');
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', '#1f2937');
    circle.setAttribute('stroke-width', '10');
    svg.appendChild(circle);
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', '53');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#9ca3af');
    text.setAttribute('font-size', '6');
    text.textContent = 'No Data';
    svg.appendChild(text);
    return;
  }

  const totalTokens = models.reduce((sum, m) => sum + usageByModel[m].total, 0);
  let cumulativePercent = 0;
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  models.forEach((model, idx) => {
    const data = usageByModel[model];
    const percent = data.total / totalTokens;
    const color = colors[idx % colors.length];

    const r = 35;
    const circumference = 2 * Math.PI * r;
    const strokeLength = percent * circumference;
    const strokeOffset = circumference - strokeLength;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', r.toString());
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '10');
    circle.setAttribute('stroke-dasharray', `${strokeLength} ${circumference}`);
    circle.setAttribute('stroke-dashoffset', (-cumulativePercent * circumference).toString());
    circle.setAttribute('transform', 'rotate(-90 50 50)');
    svg.appendChild(circle);

    cumulativePercent += percent;

    // Legend list items
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="legend-label">
        <span class="legend-color" style="background-color: ${color}"></span>
        <span>${model}</span>
      </div>
      <span class="legend-value">${(percent * 100).toFixed(1)}% (${data.total.toLocaleString()} tkn)</span>
    `;
    legend.appendChild(item);
  });

  // Center display text
  const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  centerText.setAttribute('x', '50');
  centerText.setAttribute('y', '53');
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('fill', '#f3f4f6');
  centerText.setAttribute('font-size', '6');
  centerText.setAttribute('font-weight', '600');
  
  let totalTextVal = totalTokens;
  if (totalTokens >= 1000000) {
    totalTextVal = (totalTokens / 1000000).toFixed(2) + 'M';
  } else if (totalTokens >= 1000) {
    totalTextVal = (totalTokens / 1000).toFixed(1) + 'k';
  }
  centerText.textContent = `${totalTextVal} tkn`;
  svg.appendChild(centerText);
}

// Render and filter logs table
function renderLogs() {
  const tbody = document.getElementById('logs-tbody');
  tbody.innerHTML = '';

  const filtered = allLogs.filter(log => {
    const matchesAgent = agentFilter === 'all' || log.agentId === agentFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesAgent && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No execution logs match the selected filters.</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(log => {
    const tr = document.createElement('tr');
    
    // Parse time
    const dateObj = new Date(log.timestamp);
    const timeStr = dateObj.toLocaleTimeString();

    // Escape user-controlled properties
    const escapedAgentId = escapeHtml(log.agentId);
    const escapedRole = escapeHtml(log.role || '-');
    const escapedAction = escapeHtml(log.action);
    const escapedDetails = escapeHtml(log.details);
    const escapedStatus = escapeHtml(log.status);

    // Tooltip for log details
    const detailsHtml = log.details 
      ? `<span class="details-tooltip" title="${escapedDetails}">${escapedAction}</span>`
      : escapedAction;

    tr.innerHTML = `
      <td class="time-col">${timeStr}</td>
      <td class="agent-col">${escapedAgentId}</td>
      <td class="role-col">${escapedRole}</td>
      <td>${detailsHtml}</td>
      <td><span class="badge ${escapedStatus}">${escapedStatus}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Setup Server-Sent Events (SSE) Listener
function setupSSE() {
  const statusBadge = document.getElementById('conn-status');
  const source = new EventSource('/api/events');

  source.onopen = () => {
    statusBadge.innerHTML = '<span class="status-dot green"></span> Connected (Live)';
    statusBadge.className = 'status-badge';
  };

  source.onerror = () => {
    statusBadge.innerHTML = '<span class="status-dot red"></span> Disconnected (Reconnecting)';
    statusBadge.className = 'status-badge disconnected';
  };

  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'report') {
        // Full report update
        updateMetrics(data.report.summary);
        renderDonutChart(data.report.tokenUsageByModel);
        populateAgentFilter(data.report.actionsByAgent);
      } else if (data.type === 'action' || data.type === 'tokens') {
        // Prepend new logs locally to keep dynamic feedback snappy
        if (data.type === 'action') {
          allLogs.unshift(data.log);
          renderLogs();
        }
        // Trigger a fresh stats fetch to sync state
        fetchStats();
      }
    } catch (e) {
      console.error('Error parsing SSE event:', e);
    }
  };
}

// Fetch stats helper
async function fetchStats() {
  const statsRes = await fetch('/api/stats');
  if (statsRes.ok) {
    const stats = await statsRes.json();
    updateMetrics(stats.summary);
    renderDonutChart(stats.tokenUsageByModel);
  }
}

// Event Listeners for Filters
document.getElementById('filter-agent').addEventListener('change', (e) => {
  agentFilter = e.target.value;
  renderLogs();
});

document.getElementById('filter-status').addEventListener('change', (e) => {
  statusFilter = e.target.value;
  renderLogs();
});

// Main Inits
initDashboard();
setupSSE();
