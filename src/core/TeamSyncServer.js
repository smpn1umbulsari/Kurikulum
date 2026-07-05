/**
 * TeamSyncServer - Real-time Team Context Synchronization
 * 
 * Enterprise-grade multi-user collaboration with
 * real-time context sharing, conflict resolution, and presence indicators.
 */

import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class TeamSyncServer extends EventEmitter {
  constructor(projectManager, options = {}) {
    super();
    this.projectManager = projectManager;
    this.port = options.port || 3020;
    this.host = options.host || 'localhost';
    
    this.teams = new Map(); // teamId -> team data
    this.sessions = new Map(); // sessionId -> session data
    this.contexts = new Map(); // projectId -> context data
    this.presence = new Map(); // userId -> presence data
    
    this.server = null;
    this.sseClients = new Map(); // userId -> response
    
    this.syncInterval = options.syncInterval || 5000;
    this.conflictStrategy = options.conflictStrategy || 'last-write-wins';
    
    this._initialize();
  }

  _initialize() {
    const configDir = path.join(this.projectManager.configDir || '.aether', 'teamsync');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    this._loadConfig(configDir);
  }

  _loadConfig(configDir) {
    const configPath = path.join(configDir, 'teams.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this.teams = new Map(Object.entries(data.teams || {}));
    }
  }

  _saveConfig() {
    const configDir = path.join(this.projectManager.configDir || '.aether', 'teamsync');
    const configPath = path.join(configDir, 'teams.json');
    fs.writeFileSync(configPath, JSON.stringify({
      teams: Object.fromEntries(this.teams),
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  }

  /**
   * Start the team sync server
   */
  start() {
    this.server = http.createServer((req, res) => this._handleRequest(req, res));
    
    this.server.listen(this.port, this.host, () => {
      console.log(`[TeamSync] Server running at http://${this.host}:${this.port}`);
    });

    // Start presence broadcast interval
    this.presenceInterval = setInterval(() => {
      this._broadcastPresence();
    }, this.syncInterval);

    return this.server;
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
    }
    
    // Close all SSE connections
    for (const [userId, client] of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();
    
    if (this.server) {
      this.server.close();
    }
  }

  /**
   * Handle HTTP requests
   */
  _handleRequest(req, res) {
    const url = new URL(req.url, `http://${this.host}:${this.port}`);
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Team-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Routes
    if (url.pathname === '/api/presence' && req.method === 'GET') {
      this._handleGetPresence(req, res);
    } else if (url.pathname === '/api/presence' && req.method === 'POST') {
      this._handleUpdatePresence(req, res);
    } else if (url.pathname === '/api/teams' && req.method === 'GET') {
      this._handleGetTeams(req, res);
    } else if (url.pathname === '/api/teams' && req.method === 'POST') {
      this._handleCreateTeam(req, res);
    } else if (url.pathname.startsWith('/api/teams/') && req.method === 'GET') {
      this._handleGetTeam(req, res, url);
    } else if (url.pathname.startsWith('/api/teams/') && req.method === 'DELETE') {
      this._handleDeleteTeam(req, res, url);
    } else if (url.pathname === '/api/context' && req.method === 'GET') {
      this._handleGetContext(req, res, url);
    } else if (url.pathname === '/api/context' && req.method === 'PUT') {
      this._handleUpdateContext(req, res);
    } else if (url.pathname === '/api/sync' && req.method === 'GET') {
      this._handleSSE(req, res);
    } else if (url.pathname === '/api/sync' && req.method === 'POST') {
      this._handleSync(req, res);
    } else if (url.pathname === '/api/members' && req.method === 'POST') {
      this._handleAddMember(req, res);
    } else if (url.pathname === '/api/members' && req.method === 'DELETE') {
      this._handleRemoveMember(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  /**
   * Get all presence data
   */
  _handleGetPresence(req, res) {
    const presences = Array.from(this.presence.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ presences }));
  }

  /**
   * Update presence (heartbeat)
   */
  async _handleUpdatePresence(req, res) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User ID required' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());

    const presence = {
      userId,
      status: data.status || 'online',
      teamId: data.teamId,
      lastSeen: new Date().toISOString(),
      cursor: data.cursor,
      selection: data.selection
    };

    this.presence.set(userId, presence);
    this._broadcastToTeam(data.teamId, { type: 'presence', data: presence });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }

  /**
   * Get all teams
   */
  _handleGetTeams(req, res) {
    const teams = Array.from(this.teams.values()).map(team => ({
      ...team,
      memberCount: team.members?.length || 0
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ teams }));
  }

  /**
   * Create a new team
   */
  async _handleCreateTeam(req, res) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());

    const teamId = data.teamId || crypto.randomBytes(8).toString('hex');
    const team = {
      id: teamId,
      name: data.name || teamId,
      description: data.description || '',
      createdBy: data.userId,
      createdAt: new Date().toISOString(),
      members: data.members || [],
      settings: {
        syncEnabled: true,
        conflictStrategy: this.conflictStrategy,
        ...data.settings
      }
    };

    this.teams.set(teamId, team);
    this._saveConfig();

    this.emit('team:created', team);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ team }));
  }

  /**
   * Get team by ID
   */
  _handleGetTeam(req, res, url) {
    const teamId = url.pathname.split('/')[3];
    const team = this.teams.get(teamId);

    if (!team) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Team not found' }));
      return;
    }

    // Get online members
    const onlineMembers = team.members?.filter(m => this.presence.has(m)) || [];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      team,
      onlineMembers,
      context: this.contexts.get(teamId)
    }));
  }

  /**
   * Delete team
   */
  _handleDeleteTeam(req, res, url) {
    const teamId = url.pathname.split('/')[3];
    
    if (!this.teams.has(teamId)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Team not found' }));
      return;
    }

    this.teams.delete(teamId);
    this.contexts.delete(teamId);
    this._saveConfig();

    this.emit('team:deleted', { teamId });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }

  /**
   * Get team context
   */
  _handleGetContext(req, res, url) {
    const teamId = req.headers['x-team-id'];
    const context = this.contexts.get(teamId) || {
      teamId,
      lastSync: null,
      data: {}
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ context }));
  }

  /**
   * Update team context
   */
  async _handleUpdateContext(req, res) {
    const teamId = req.headers['x-team-id'];
    const userId = req.headers['x-user-id'];

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());

    const context = this.contexts.get(teamId) || { teamId, data: {} };
    const update = {
      ...data,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
      version: (context.version || 0) + 1
    };

    // Handle conflicts
    const resolved = this._resolveConflict(context, update);

    this.contexts.set(teamId, resolved);
    
    // Broadcast to team
    this._broadcastToTeam(teamId, {
      type: 'context:update',
      data: resolved
    });

    this.emit('context:updated', { teamId, context: resolved });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ context: resolved }));
  }

  /**
   * Handle SSE connection for real-time updates
   */
  _handleSSE(req, res) {
    const userId = req.headers['x-user-id'];
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    this.sseClients.set(userId, res);

    // Send initial presence
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    // Keep alive
    const keepAlive = setInterval(() => {
      res.write(`: keepalive\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients.delete(userId);
      this.presence.delete(userId);
    });
  }

  /**
   * Handle sync request
   */
  async _handleSync(req, res) {
    const teamId = req.headers['x-team-id'];
    const userId = req.headers['x-user-id'];

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());

    const context = this.contexts.get(teamId);
    const hasChanges = context?.version !== data.lastVersion;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      context,
      hasChanges,
      teamMembers: this._getTeamMembers(teamId),
      onlineCount: this._getOnlineCount(teamId)
    }));
  }

  /**
   * Add member to team
   */
  async _handleAddMember(req, res) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());

    const team = this.teams.get(data.teamId);
    if (!team) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Team not found' }));
      return;
    }

    if (!team.members) team.members = [];
    if (!team.members.includes(data.userId)) {
      team.members.push(data.userId);
      this._saveConfig();
      
      this._broadcastToTeam(data.teamId, {
        type: 'member:added',
        data: { userId: data.userId }
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, team }));
  }

  /**
   * Remove member from team
   */
  async _handleRemoveMember(req, res) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString());

    const team = this.teams.get(data.teamId);
    if (!team) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Team not found' }));
      return;
    }

    team.members = (team.members || []).filter(m => m !== data.userId);
    this._saveConfig();
    
    this._broadcastToTeam(data.teamId, {
      type: 'member:removed',
      data: { userId: data.userId }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, team }));
  }

  /**
   * Resolve conflict between contexts
   */
  _resolveConflict(local, remote) {
    switch (this.conflictStrategy) {
      case 'last-write-wins':
        return remote.updatedAt > local.updatedAt ? remote : local;
      
      case 'merge':
        // Deep merge with conflict markers
        return this._deepMerge(local, remote);
      
      case 'remote-wins':
        return remote;
      
      case 'local-wins':
        return local;
      
      default:
        return remote;
    }
  }

  /**
   * Deep merge with conflict markers
   */
  _deepMerge(local, remote) {
    const result = { ...local, ...remote };
    
    for (const key of Object.keys(result)) {
      if (typeof result[key] === 'object' && 
          local[key] && remote[key] &&
          typeof local[key] === 'object' && 
          typeof remote[key] === 'object') {
        if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
          result[key] = {
            _conflict: true,
            local: local[key],
            remote: remote[key],
            resolved: remote[key]
          };
        }
      }
    }
    
    return result;
  }

  /**
   * Broadcast to team members
   */
  _broadcastToTeam(teamId, message) {
    const team = this.teams.get(teamId);
    if (!team) return;

    for (const memberId of team.members) {
      const client = this.sseClients.get(memberId);
      if (client) {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      }
    }
  }

  /**
   * Broadcast presence updates
   */
  _broadcastPresence() {
    const presences = Array.from(this.presence.values());
    
    for (const [userId, client] of this.sseClients) {
      client.write(`data: ${JSON.stringify({ type: 'presence:update', presences })}\n\n`);
    }
  }

  /**
   * Get team members
   */
  _getTeamMembers(teamId) {
    const team = this.teams.get(teamId);
    return team?.members || [];
  }

  /**
   * Get online member count
   */
  _getOnlineCount(teamId) {
    const team = this.teams.get(teamId);
    if (!team) return 0;
    return team.members?.filter(m => this.presence.has(m)).length || 0;
  }

  /**
   * Get server stats
   */
  getStats() {
    let totalMembers = 0;
    let onlineMembers = 0;
    
    for (const team of this.teams.values()) {
      totalMembers += team.members?.length || 0;
      onlineMembers += team.members?.filter(m => this.presence.has(m)).length || 0;
    }

    return {
      teams: this.teams.size,
      totalMembers,
      onlineMembers,
      sseConnections: this.sseClients.size,
      contexts: this.contexts.size
    };
  }

  /**
   * Create team (programmatic)
   */
  createTeam(teamData) {
    const teamId = teamData.id || crypto.randomBytes(8).toString('hex');
    const team = {
      id: teamId,
      name: teamData.name || teamId,
      description: teamData.description || '',
      createdBy: teamData.userId,
      createdAt: new Date().toISOString(),
      members: teamData.members || [],
      settings: {
        syncEnabled: true,
        conflictStrategy: this.conflictStrategy,
        ...teamData.settings
      }
    };

    this.teams.set(teamId, team);
    this._saveConfig();
    this.emit('team:created', team);
    
    return team;
  }

  /**
   * Join team (programmatic)
   */
  joinTeam(teamId, userId) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (!team.members.includes(userId)) {
      team.members.push(userId);
      this._saveConfig();
      
      this._broadcastToTeam(teamId, {
        type: 'member:added',
        data: { userId }
      });
    }

    return team;
  }

  /**
   * Leave team (programmatic)
   */
  leaveTeam(teamId, userId) {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    team.members = team.members.filter(m => m !== userId);
    this.presence.delete(userId);
    this._saveConfig();
    
    this._broadcastToTeam(teamId, {
      type: 'member:removed',
      data: { userId }
    });

    return team;
  }

  /**
   * Update context (programmatic)
   */
  updateContext(teamId, data, userId) {
    const context = this.contexts.get(teamId) || { teamId, data: {} };
    const update = {
      ...data,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
      version: (context.version || 0) + 1
    };

    const resolved = this._resolveConflict(context, update);
    this.contexts.set(teamId, resolved);

    this._broadcastToTeam(teamId, {
      type: 'context:update',
      data: resolved
    });

    return resolved;
  }
}

export default TeamSyncServer;
