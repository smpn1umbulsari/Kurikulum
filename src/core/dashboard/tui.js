/**
 * AETHER TUI Dashboard
 * 
 * Terminal User Interface for real-time monitoring
 * Part of Phase 7.1 Enhancement
 */

import readline from 'readline';
import chalk from 'chalk';
import { MonitoringEngine } from '../MonitoringEngine.js';

export class TUIDashboard {
  constructor(projectManager, options = {}) {
    this.monitoringEngine = new MonitoringEngine(projectManager);
    this.refreshInterval = options.refreshInterval || 2000;
    this.isRunning = false;
    this.intervalId = null;
    this.width = options.width || 100;
    
    // ANSI escape codes for terminal control
    this.CLEAR_SCREEN = '\x1b[2J';
    this.CURSOR_HOME = '\x1b[H';
    this.HIDE_CURSOR = '\x1b[?25l';
    this.SHOW_CURSOR = '\x1b[?25h';
    this.BOLD = '\x1b[1m';
    this.RESET = '\x1b[0m';
    this.BRIGHT = '\x1b[97m';
    this.GREEN = '\x1b[32m';
    this.YELLOW = '\x1b[33m';
    this.RED = '\x1b[31m';
    this.CYAN = '\x1b[36m';
    this.MAGENTA = '\x1b[35m';
    this.BG_BLUE = '\x1b[44m';
  }

  /**
   * Start the TUI dashboard
   */
  start() {
    if (this.isRunning) {
      console.log('TUI Dashboard already running');
      return;
    }

    this.isRunning = true;
    process.stdout.write(this.CLEAR_SCREEN + this.CURSOR_HOME + this.HIDE_CURSOR);
    
    // Handle graceful exit
    process.on('SIGINT', () => this.stop());
    process.on('exit', () => this.stop());
    
    this.intervalId = setInterval(() => this.render(), this.refreshInterval);
    this.render(); // Initial render
  }

  /**
   * Stop the TUI dashboard
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    process.stdout.write(this.CLEAR_SCREEN + this.CURSOR_HOME + this.SHOW_CURSOR + this.RESET);
    console.log(chalk.green('\n✓ TUI Dashboard stopped'));
  }

  /**
   * Render the dashboard
   */
  render() {
    const report = this.monitoringEngine.generateAnalyticsReport();
    const summary = report.summary;
    
    let output = '';
    
    // Header
    output += this.renderHeader();
    
    // Metrics Grid
    output += this.renderMetrics(summary);
    
    // Model Breakdown
    output += this.renderModelBreakdown(report.tokenUsageByModel);
    
    // Recent Actions
    output += this.renderRecentActions(report.recentActions);
    
    // Footer
    output += this.renderFooter();
    
    // Move cursor to home and write
    process.stdout.write(this.CURSOR_HOME + output);
  }

  /**
   * Render header with title and status
   */
  renderHeader() {
    const title = ' AETHER Monitoring Dashboard ';
    const padding = Math.max(0, Math.floor((this.width - title.length) / 2));
    
    return [
      `${this.BG_BLUE}${this.BOLD}${' '.repeat(padding)}${title}${' '.repeat(this.width - padding - title.length)}${this.RESET}`,
      `${this.CYAN}${'═'.repeat(this.width)}${this.RESET}`,
      ''
    ].join('\n');
  }

  /**
   * Render metrics cards
   */
  renderMetrics(summary) {
    const cost = `$${summary.totalCost.toFixed(6)}`;
    const tokens = this.formatNumber(summary.totalTokens);
    const actions = summary.totalActions.toString();
    const rate = `${summary.successRate.toFixed(1)}%`;
    
    const metrics = [
      { label: 'Total Cost', value: cost, color: this.YELLOW },
      { label: 'Total Tokens', value: tokens, color: this.CYAN },
      { label: 'Total Actions', value: actions, color: this.MAGENTA },
      { label: 'Success Rate', value: rate, color: this.GREEN }
    ];

    let output = '';
    const colWidth = Math.floor(this.width / 4);
    
    metrics.forEach((metric, i) => {
      const x = i * colWidth;
      output += this.moveCursor(2, x);
      output += `${this.BOLD}${metric.color}${metric.label}${this.RESET}`;
      output += this.moveCursor(3, x);
      output += `${this.BRIGHT}${metric.value}${this.RESET}`;
    });
    
    output += '\n' + this.renderProgressBar(summary.successRate) + '\n';
    
    return output;
  }

  /**
   * Render progress bar for success rate
   */
  renderProgressBar(percentage) {
    const barWidth = this.width - 10;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    
    const bar = `${this.GREEN}${'█'.repeat(filledWidth)}${'░'.repeat(emptyWidth)}${this.RESET}`;
    const label = ` Success Rate: ${percentage.toFixed(1)}% `;
    const padding = Math.max(0, barWidth - label.length - 2);
    
    return ` ${bar} ${label}`;
  }

  /**
   * Render model breakdown bar chart
   */
  renderModelBreakdown(tokenUsageByModel) {
    let output = `${this.BOLD}${this.CYAN}LLM Model Usage:${this.RESET}\n`;
    
    const models = Object.entries(tokenUsageByModel || {});
    
    if (models.length === 0) {
      output += chalk.gray('  No data available\n');
      return output;
    }

    const totalTokens = models.reduce((sum, [, data]) => sum + data.total, 0);
    const maxBarWidth = 50;

    models.forEach(([model, data]) => {
      const percentage = totalTokens > 0 ? (data.total / totalTokens) * 100 : 0;
      const barWidth = Math.round((percentage / 100) * maxBarWidth);
      const bar = `${this.MAGENTA}${'▓'.repeat(barWidth)}${'░'.repeat(maxBarWidth - barWidth)}${this.RESET}`;
      const cost = `$${data.cost.toFixed(6)}`;
      
      output += `  ${model.padEnd(25)} ${bar} ${percentage.toFixed(1).padStart(5)}% ${cost.padStart(12)}\n`;
    });

    return output;
  }

  /**
   * Render recent actions list
   */
  renderRecentActions(recentActions) {
    let output = `${this.BOLD}${this.CYAN}Recent Agent Actions:${this.RESET}\n`;
    output += `${'─'.repeat(this.width)}\n`;
    
    const maxRows = 8;
    const actions = (recentActions || []).slice(0, maxRows);

    if (actions.length === 0) {
      output += chalk.gray('  No recent actions\n');
      return output;
    }

    // Header
    output += chalk.gray('  TIME       AGENT        ACTION                    STATUS\n');
    output += chalk.gray('  ' + '─'.repeat(this.width - 2) + '\n');

    actions.forEach(action => {
      const time = new Date(action.timestamp).toLocaleTimeString();
      const agentId = (action.agentId || 'unknown').substring(0, 12).padEnd(12);
      const actionName = (action.action || '-').substring(0, 25).padEnd(25);
      
      let statusColor = this.GREEN;
      let statusText = 'SUCCESS';
      if (action.status === 'failed') {
        statusColor = this.RED;
        statusText = 'FAILED';
      } else if (action.status === 'pending') {
        statusColor = this.YELLOW;
        statusText = 'PENDING';
      }

      output += `  ${chalk.gray(time)} ${agentId} ${actionName} ${statusColor}${statusText}${this.RESET}\n`;
    });

    return output;
  }

  /**
   * Render footer with controls
   */
  renderFooter() {
    const controls = [
      { key: 'Ctrl+C', action: 'Exit' },
      { key: 'R', action: 'Refresh' },
      { key: 'E', action: 'Export' }
    ];
    
    let output = '\n' + '─'.repeat(this.width) + '\n';
    output += '  Controls: ';
    
    controls.forEach((ctrl, i) => {
      if (i > 0) output += '  |  ';
      output += `${this.YELLOW}${ctrl.key}${this.RESET} ${ctrl.action}`;
    });
    
    output += '\n';
    return output;
  }

  /**
   * Move cursor to position
   */
  moveCursor(row, col) {
    return `\x1b[${row};${col}H`;
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Export current report to JSON
   */
  exportJSON() {
    const report = this.monitoringEngine.generateAnalyticsReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export current report to CSV
   */
  exportCSV() {
    const report = this.monitoringEngine.generateAnalyticsReport();
    const lines = [];
    
    // Summary section
    lines.push('Summary');
    lines.push('Metric,Value');
    lines.push(`Total Cost,$${report.summary.totalCost}`);
    lines.push(`Total Tokens,${report.summary.totalTokens}`);
    lines.push(`Total Actions,${report.summary.totalActions}`);
    lines.push(`Success Rate,${report.summary.successRate}%`);
    lines.push('');
    
    // Actions section
    lines.push('Actions');
    lines.push('Timestamp,Agent,Role,Action,Status,Details');
    
    (report.recentActions || []).forEach(action => {
      lines.push([
        action.timestamp,
        action.agentId,
        action.role,
        action.action,
        action.status,
        `"${(action.details || '').replace(/"/g, '""')}"`
      ].join(','));
    });
    
    return lines.join('\n');
  }
}

export default TUIDashboard;
