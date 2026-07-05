/**
 * Report Exporter Utility
 * 
 * Export monitoring reports to various formats
 * Part of Phase 7.1 Enhancement
 */

import fs from 'fs';
import path from 'path';

export class ReportExporter {
  constructor(monitoringEngine) {
    this.monitoringEngine = monitoringEngine;
  }

  /**
   * Generate complete analytics report
   */
  generateReport() {
    return this.monitoringEngine.generateAnalyticsReport();
  }

  /**
   * Export to JSON file
   */
  exportToJSON(filepath = 'aether-report.json') {
    const report = this.generateReport();
    const content = JSON.stringify(report, null, 2);
    
    fs.writeFileSync(filepath, content, 'utf-8');
    return { success: true, filepath, size: content.length };
  }

  /**
   * Export to CSV file
   */
  exportToCSV(filepath = 'aether-report.csv') {
    const report = this.generateReport();
    const lines = [];

    // Summary Section
    lines.push('AETHER Monitoring Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    lines.push('=== SUMMARY ===');
    lines.push('Metric,Value');
    lines.push(`Total Cost,$${report.summary.totalCost}`);
    lines.push(`Total Tokens,${report.summary.totalTokens}`);
    lines.push(`Total Prompt Tokens,${report.summary.totalPromptTokens}`);
    lines.push(`Total Completion Tokens,${report.summary.totalCompletionTokens}`);
    lines.push(`Total Actions,${report.summary.totalActions}`);
    lines.push(`Successful Actions,${report.summary.successfulActions}`);
    lines.push(`Failed Actions,${report.summary.failedActions}`);
    lines.push(`Success Rate,${report.summary.successRate}%`);
    lines.push('');

    // Token Usage by Model
    lines.push('=== TOKEN USAGE BY MODEL ===');
    lines.push('Model,Prompt Tokens,Completion Tokens,Total Tokens,Cost');
    Object.entries(report.tokenUsageByModel || {}).forEach(([model, data]) => {
      lines.push(`"${model}",${data.prompt},${data.completion},${data.total},$${data.cost}`);
    });
    lines.push('');

    // Token Usage by Agent
    lines.push('=== TOKEN USAGE BY AGENT ===');
    lines.push('Agent,Prompt Tokens,Completion Tokens,Total Tokens,Cost');
    Object.entries(report.tokenUsageByAgent || {}).forEach(([agentId, data]) => {
      lines.push(`"${agentId}",${data.prompt},${data.completion},${data.total},$${data.cost}`);
    });
    lines.push('');

    // Actions by Agent
    lines.push('=== ACTIONS BY AGENT ===');
    lines.push('Agent,Total,Success,Failed,Pending');
    Object.entries(report.actionsByAgent || {}).forEach(([agentId, stats]) => {
      lines.push(`"${agentId}",${stats.total},${stats.success},${stats.failed},${stats.pending}`);
    });
    lines.push('');

    // Recent Actions
    lines.push('=== RECENT ACTIONS ===');
    lines.push('Timestamp,Agent,Role,Action,Status,Details');
    (report.recentActions || []).forEach(action => {
      const details = (action.details || '').replace(/"/g, '""');
      lines.push(`"${action.timestamp}","${action.agentId}","${action.role}","${action.action}","${action.status}","${details}"`);
    });

    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    return { success: true, filepath, size: content.length };
  }

  /**
   * Export to Markdown file
   */
  exportToMarkdown(filepath = 'aether-report.md') {
    const report = this.generateReport();
    const lines = [];

    lines.push('# AETHER Monitoring Report');
    lines.push('');
    lines.push(`**Generated**: ${new Date().toLocaleString()}`);
    lines.push('');

    // Summary Table
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Cost | $${report.summary.totalCost} |`);
    lines.push(`| Total Tokens | ${report.summary.totalTokens.toLocaleString()} |`);
    lines.push(`| Total Actions | ${report.summary.totalActions} |`);
    lines.push(`| Success Rate | ${report.summary.successRate}% |`);
    lines.push('');

    // Token Usage by Model
    lines.push('## Token Usage by Model');
    lines.push('');
    if (Object.keys(report.tokenUsageByModel || {}).length > 0) {
      lines.push('| Model | Total Tokens | Cost |');
      lines.push('|------|-------------|------|');
      Object.entries(report.tokenUsageByModel).forEach(([model, data]) => {
        lines.push(`| ${model} | ${data.total.toLocaleString()} | $${data.cost.toFixed(6)} |`);
      });
    } else {
      lines.push('_No data available_');
    }
    lines.push('');

    // Actions by Agent
    lines.push('## Actions by Agent');
    lines.push('');
    if (Object.keys(report.actionsByAgent || {}).length > 0) {
      lines.push('| Agent | Total | Success | Failed | Rate |');
      lines.push('|-------|-------|---------|--------|------|');
      Object.entries(report.actionsByAgent).forEach(([agentId, stats]) => {
        const rate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;
        lines.push(`| ${agentId} | ${stats.total} | ${stats.success} | ${stats.failed} | ${rate}% |`);
      });
    } else {
      lines.push('_No data available_');
    }
    lines.push('');

    // Recent Actions
    lines.push('## Recent Actions');
    lines.push('');
    lines.push('| Time | Agent | Action | Status |');
    lines.push('|------|-------|--------|--------|');
    (report.recentActions || []).slice(0, 20).forEach(action => {
      const time = new Date(action.timestamp).toLocaleTimeString();
      lines.push(`| ${time} | ${action.agentId} | ${action.action} | ${action.status} |`);
    });
    lines.push('');

    const content = lines.join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
    return { success: true, filepath, size: content.length };
  }

  /**
   * Export compliance score report
   */
  exportComplianceReport(filepath = 'compliance-report.json', complianceData) {
    const report = {
      generated: new Date().toISOString(),
      compliance: complianceData
    };
    
    const content = JSON.stringify(report, null, 2);
    fs.writeFileSync(filepath, content, 'utf-8');
    return { success: true, filepath, size: content.length };
  }

  /**
   * Get report as HTML (for embedding)
   */
  exportToHTML() {
    const report = this.generateReport();
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>AETHER Report</title>
  <style>
    body { font-family: system-ui; padding: 2rem; background: #0b0f19; color: #f3f4f6; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #374151; padding: 0.5rem; text-align: left; }
    th { background: #1f2937; }
    .metric { font-size: 2rem; font-weight: bold; color: #3b82f6; }
  </style>
</head>
<body>
  <h1>AETHER Monitoring Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Summary</h2>
  <div class="metric">$${report.summary.totalCost.toFixed(6)}</div>
  <p>Total Cost</p>
  
  <div class="metric">${report.summary.totalTokens.toLocaleString()}</div>
  <p>Total Tokens</p>
  
  <h2>Token Usage by Model</h2>
  <table>
    <tr><th>Model</th><th>Tokens</th><th>Cost</th></tr>
    ${Object.entries(report.tokenUsageByModel || {}).map(([m, d]) => 
      `<tr><td>${m}</td><td>${d.total.toLocaleString()}</td><td>$${d.cost.toFixed(6)}</td></tr>`
    ).join('')}
  </table>
  
  <h2>Recent Actions</h2>
  <table>
    <tr><th>Time</th><th>Agent</th><th>Action</th><th>Status</th></tr>
    ${(report.recentActions || []).slice(0, 10).map(a => 
      `<tr><td>${new Date(a.timestamp).toLocaleTimeString()}</td><td>${a.agentId}</td><td>${a.action}</td><td>${a.status}</td></tr>`
    ).join('')}
  </table>
</body>
</html>`;
  }
}

export default ReportExporter;
