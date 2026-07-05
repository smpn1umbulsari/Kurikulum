/**
 * RBACEngine - Role-Based Access Control
 * 
 * Enterprise-grade role and permission management with
 * hierarchical roles, resource-based permissions, and audit logging.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class RBACEngine {
  constructor(projectManager, auditLedger = null) {
    this.projectManager = projectManager;
    this.auditLedger = auditLedger;
    this.roles = new Map();
    this.users = new Map();
    this.resources = new Map();
    this.configDir = path.join(projectManager.configDir || '.aether', 'rbac');
    this._initialize();
  }

  _initialize() {
    // Create config directory
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Load existing config or create default
    const configPath = path.join(this.configDir, 'config.json');
    if (fs.existsSync(configPath)) {
      this._loadConfig();
      this._ensureDefaultRoles();
    } else {
      this._createDefaultConfig();
    }
  }

  /**
   * Get the structure of all default system roles
   */
  _getDefaultRoles() {
    return {
      admin: {
        id: 'admin',
        name: 'admin',
        description: 'Full system access',
        permissions: {
          read: ['**'],
          write: ['**'],
          deny: []
        },
        inherits: null
      },
      developer: {
        id: 'developer',
        name: 'developer',
        description: 'Code and project management',
        permissions: {
          read: ['**'],
          write: ['src/**', 'tests/**'],
          deny: ['.env', 'supabase/migrations/**']
        },
        inherits: null
      },
      reviewer: {
        id: 'reviewer',
        name: 'reviewer',
        description: 'Review and approve code',
        permissions: {
          read: ['**'],
          write: [],
          deny: ['.env']
        },
        inherits: 'developer'
      },
      viewer: {
        id: 'viewer',
        name: 'viewer',
        description: 'Read-only access',
        permissions: {
          read: ['**'],
          write: [],
          deny: ['.env']
        },
        inherits: null
      },
      architect: {
        id: 'architect',
        name: 'architect',
        description: 'System Architect',
        permissions: {
          read: ['**'],
          write: ['src/**', 'docs/**', 'tests/**'],
          deny: ['.env', 'secrets/**']
        },
        inherits: null
      },
      'database-admin': {
        id: 'database-admin',
        name: 'database-admin',
        description: 'Database Administrator',
        permissions: {
          read: ['**'],
          write: ['supabase/migrations/**', 'src/db/**'],
          deny: ['.env']
        },
        inherits: null
      },
      'qa-engineer': {
        id: 'qa-engineer',
        name: 'qa-engineer',
        description: 'QA Engineer',
        permissions: {
          read: ['**'],
          write: ['tests/**'],
          deny: ['.env']
        },
        inherits: null
      },
      'security-auditor': {
        id: 'security-auditor',
        name: 'security-auditor',
        description: 'Security Auditor',
        permissions: {
          read: ['**'],
          write: [],
          deny: []
        },
        inherits: null
      }
    };
  }

  /**
   * Ensure default roles exist in the roles configuration map
   */
  _ensureDefaultRoles() {
    const defaultRoles = this._getDefaultRoles();
    let updated = false;
    for (const [id, role] of Object.entries(defaultRoles)) {
      if (!this.roles.has(id)) {
        this.roles.set(id, role);
        updated = true;
      }
    }
    if (updated) {
      this._saveConfig();
    }
  }

  /**
   * Create default RBAC configuration
   */
  _createDefaultConfig() {
    const defaultRoles = this._getDefaultRoles();

    // Define resources
    const defaultResources = {
      project: { actions: ['read', 'write', 'delete', 'admin'] },
      file: { actions: ['read', 'write', 'delete', 'review'] },
      agent: { actions: ['execute', 'manage', 'read'] },
      settings: { actions: ['read', 'write'] },
      users: { actions: ['read', 'write', 'admin'] },
      audit: { actions: ['read', 'admin'] }
    };

    this.roles = new Map(Object.entries(defaultRoles));
    this.resources = new Map(Object.entries(defaultResources));
    this.users = new Map();

    this._saveConfig();
  }

  /**
   * Load configuration from file
   */
  _loadConfig() {
    const configPath = path.join(this.configDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    this.roles = new Map(Object.entries(config.roles || {}));
    this.resources = new Map(Object.entries(config.resources || {}));
    this.users = new Map(Object.entries(config.users || {}));
  }

  /**
   * Save configuration to file
   */
  _saveConfig() {
    const configPath = path.join(this.configDir, 'config.json');
    const config = {
      roles: Object.fromEntries(this.roles),
      resources: Object.fromEntries(this.resources),
      users: Object.fromEntries(this.users),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Create a new role
   */
  createRole(roleIdOrData, roleData = null) {
    let roleId;
    let data;

    if (roleData === null && typeof roleIdOrData === 'object') {
      data = roleIdOrData;
      roleId = data.id || data.name;
    } else {
      roleId = roleIdOrData;
      data = roleData || {};
    }

    if (!roleId) {
      throw new Error('Role ID is required');
    }

    if (this.roles.has(roleId)) {
      throw new Error(`Role "${roleId}" already exists`);
    }

    const role = {
      id: roleId,
      name: data.name || roleId,
      description: data.description || '',
      permissions: data.permissions || [],
      inherits: data.inherits || null,
      createdAt: new Date().toISOString()
    };

    // Validate inheritance
    if (role.inherits && !this.roles.has(role.inherits)) {
      throw new Error(`Parent role "${role.inherits}" does not exist`);
    }

    this.roles.set(roleId, role);
    this._saveConfig();
    
    this._logAction('role:created', { roleId, role });
    
    return role;
  }

  /**
   * Update a role
   */
  updateRole(roleId, updates) {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role "${roleId}" not found`);
    }

    if (role.isSystem) {
      throw new Error('Cannot modify system role');
    }

    const updated = { ...role, ...updates, updatedAt: new Date().toISOString() };
    this.roles.set(roleId, updated);
    this._saveConfig();
    
    this._logAction('role:updated', { roleId, updates });
    
    return updated;
  }

  /**
   * Delete a role
   */
  deleteRole(roleId) {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Role "${roleId}" not found`);
    }

    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    // Check if any users have this role
    for (const [userId, user] of this.users) {
      if (user.role === roleId) {
        throw new Error(`Role is assigned to user "${userId}"`);
      }
    }

    // Check if any roles inherit from this role
    for (const [id, r] of this.roles) {
      if (r.inherits === roleId) {
        throw new Error(`Role "${id}" inherits from this role`);
      }
    }

    this.roles.delete(roleId);
    this._saveConfig();
    
    this._logAction('role:deleted', { roleId });
  }

  /**
   * Create or update a user
   */
  setUser(userId, userData) {
    const user = {
      id: userId,
      name: userData.name || userId,
      email: userData.email,
      role: userData.role || 'viewer',
      permissions: userData.permissions || [],
      attributes: userData.attributes || {},
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate role exists
    if (!this.roles.has(user.role)) {
      throw new Error(`Role "${user.role}" does not exist`);
    }

    this.users.set(userId, user);
    this._saveConfig();
    
    this._logAction('user:created', { userId, role: user.role });
    
    return user;
  }

  /**
   * Get user by ID
   */
  getUser(userId) {
    return this.users.get(userId) || null;
  }

  /**
   * Delete a user
   */
  deleteUser(userId) {
    if (!this.users.has(userId)) {
      throw new Error(`User "${userId}" not found`);
    }

    this.users.delete(userId);
    this._saveConfig();
    
    this._logAction('user:deleted', { userId });
  }

  /**
   * Assign a role to a user/agent
   */
  assignRole(userId, roleId) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role "${roleId}" does not exist`);
    }
    const user = this.users.get(userId) || { id: userId };
    return this.setUser(userId, { ...user, role: roleId });
  }

  /**
   * Check permission for a user/agent against a specific file path using globs
   */
  checkPermission(userId, action, filePath) {
    const user = this.users.get(userId);
    if (!user) {
      this._logAction('access:denied', { userId, action, resource: filePath, reason: 'User not found' });
      return { allowed: false, reason: 'User not found' };
    }

    const role = this.roles.get(user.role);
    if (!role) {
      this._logAction('access:denied', { userId, action, resource: filePath, reason: `Role "${user.role}" not found` });
      return { allowed: false, reason: `Role "${user.role}" not found` };
    }

    // Convert glob pattern to RegExp
    const globToRegex = (pattern) => {
      let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      escaped = escaped.replace(/\*\*/g, '___DOUBLE_STAR___');
      escaped = escaped.replace(/\*/g, '___SINGLE_STAR___');
      escaped = escaped.replace(/\?/g, '___QUESTION___');
      
      escaped = escaped.replace(/___DOUBLE_STAR___/g, '.*');
      escaped = escaped.replace(/___SINGLE_STAR___/g, '[^/]*');
      escaped = escaped.replace(/___QUESTION___/g, '[^/]');
      
      return new RegExp(`^${escaped}$`);
    };

    const matchAny = (patterns, path) => {
      if (!Array.isArray(patterns)) return false;
      return patterns.some(pattern => globToRegex(pattern).test(path));
    };

    // If permissions is an array, map to object style for glob matching compatibility
    let perms = role.permissions;
    if (Array.isArray(perms)) {
      const hasWildcard = perms.includes('*');
      perms = {
        read: hasWildcard ? ['**'] : perms.filter(p => p.endsWith(':read') || p.startsWith('file:read')).map(() => '**'),
        write: hasWildcard ? ['**'] : perms.filter(p => p.endsWith(':write') || p.startsWith('file:write')).map(() => '**'),
        deny: []
      };
    }

    const readPatterns = perms?.read || [];
    const writePatterns = perms?.write || [];
    const denyPatterns = perms?.deny || [];

    // Check deny patterns first
    if (matchAny(denyPatterns, filePath)) {
      this._logAction('access:denied', { userId, action, resource: filePath, reason: 'Explicitly denied by pattern' });
      return { allowed: false, reason: `Access to "${filePath}" is denied` };
    }

    // Check action
    if (action === 'read') {
      if (matchAny(readPatterns, filePath)) {
        this._logAction('access:granted', { userId, action, resource: filePath });
        return { allowed: true };
      }
    } else if (action === 'write') {
      if (matchAny(writePatterns, filePath)) {
        this._logAction('access:granted', { userId, action, resource: filePath });
        return { allowed: true };
      }
    }

    this._logAction('access:denied', { userId, action, resource: filePath, reason: 'No matching pattern' });
    return { allowed: false, reason: `No permission to ${action} "${filePath}"` };
  }

  /**
   * Check if a user has permission
   */
  hasPermission(userId, permission, resource = null, action = null) {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    // Determine action and resource if not provided but permission is in format "resource:action"
    let checkResource = resource;
    let checkAction = action;
    if ((!checkResource || !checkAction) && typeof permission === 'string' && permission.includes(':')) {
      const parts = permission.split(':');
      checkResource = parts[0];
      checkAction = parts[1];
    }

    const checkRolePermissions = (roleId) => {
      const role = this.roles.get(roleId);
      if (!role) return false;

      const perms = role.permissions;

      // Handle old array style
      if (Array.isArray(perms)) {
        if (perms.includes('*') || perms.includes(permission)) {
          return true;
        }
        if (checkResource && checkAction && perms.includes(`${checkResource}:${checkAction}`)) {
          return true;
        }
        // Handle inheritance
        if (role.inherits && checkRolePermissions(role.inherits)) {
          return true;
        }
        return false;
      }

      // Handle new object style (with glob matching)
      if (perms && typeof perms === 'object') {
        const readPatterns = perms.read || [];
        const writePatterns = perms.write || [];
        const denyPatterns = perms.deny || [];

        const isDeny = denyPatterns.includes('*') || (checkResource && denyPatterns.includes(checkResource));
        if (isDeny) return false;

        if (checkAction === 'read') {
          return readPatterns.includes('*') || readPatterns.includes('**') || (checkResource && readPatterns.includes(checkResource));
        } else if (checkAction === 'write') {
          return writePatterns.includes('*') || writePatterns.includes('**') || (checkResource && writePatterns.includes(checkResource));
        }
      }

      // Handle inheritance
      if (role.inherits && checkRolePermissions(role.inherits)) {
        return true;
      }

      return false;
    };

    // Check user direct permissions (if any)
    if (Array.isArray(user.permissions)) {
      if (user.permissions.includes('*') || user.permissions.includes(permission)) {
        return true;
      }
      if (checkResource && checkAction && user.permissions.includes(`${checkResource}:${checkAction}`)) {
        return true;
      }
    }

    // Check role permissions recursively
    return checkRolePermissions(user.role);
  }

  /**
   * Check if action is allowed (high-level check)
   */
  can(userId, action, resource) {
    return this.hasPermission(userId, `${resource}:${action}`, resource, action);
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(userId) {
    const user = this.users.get(userId);
    if (!user) {
      return [];
    }

    const permissions = new Set(user.permissions || []);
    
    const addRolePerms = (roleId) => {
      const role = this.roles.get(roleId);
      if (!role) return;

      const perms = role.permissions;
      if (Array.isArray(perms)) {
        perms.forEach(p => permissions.add(p));
      } else if (perms && typeof perms === 'object') {
        const readPatterns = perms.read || [];
        const writePatterns = perms.write || [];
        const denyPatterns = perms.deny || [];

        readPatterns.forEach(p => permissions.add(`read:${p}`));
        writePatterns.forEach(p => permissions.add(`write:${p}`));
        denyPatterns.forEach(p => permissions.add(`deny:${p}`));
      }

      if (role.inherits) {
        addRolePerms(role.inherits);
      }
    };

    addRolePerms(user.role);
    return Array.from(permissions);
  }

  /**
   * Validate an action against permissions
   */
  validateAction(userId, action, resource, payload = {}) {
    const user = this.users.get(userId);
    
    const result = {
      allowed: false,
      reason: '',
      requiredPermission: `${resource}:${action}`,
      userRole: user?.role || 'unknown'
    };

    if (!user) {
      result.reason = 'User not found';
      return result;
    }

    const hasAccess = this.can(userId, action, resource);
    
    if (hasAccess) {
      result.allowed = true;
      result.reason = 'Access granted';
      
      this._logAction('access:granted', {
        userId,
        action,
        resource,
        payload: this._sanitizePayload(payload)
      });
    } else {
      result.reason = 'Permission denied';
      
      this._logAction('access:denied', {
        userId,
        action,
        resource,
        payload: this._sanitizePayload(payload)
      });
    }

    return result;
  }

  /**
   * Get role by ID
   */
  getRole(roleId) {
    return this.roles.get(roleId) || null;
  }

  /**
   * List all roles
   */
  listRoles() {
    return Array.from(this.roles.values());
  }

  /**
   * List all users
   */
  listUsers() {
    return Array.from(this.users.values()).map(u => ({
      ...u,
      permissions: undefined // Don't expose in list
    }));
  }

  /**
   * Get all resources
   */
  listResources() {
    return Array.from(this.resources.entries()).map(([name, config]) => ({
      name,
      actions: config.actions
    }));
  }

  /**
   * Get RBAC statistics
   */
  getStats() {
    return {
      totalRoles: this.roles.size,
      totalUsers: this.users.size,
      totalResources: this.resources.size,
      roles: this.listRoles().map(r => ({
        id: r.id,
        name: r.name,
        userCount: Array.from(this.users.values()).filter(u => u.role === r.id).length
      }))
    };
  }

  /**
   * Export RBAC configuration
   */
  exportConfig() {
    return {
      roles: this.listRoles(),
      users: this.listUsers(),
      resources: this.listResources(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import RBAC configuration
   */
  importConfig(config) {
    if (config.roles) {
      config.roles.forEach(role => {
        this.roles.set(role.id, role);
      });
    }
    
    if (config.users) {
      config.users.forEach(user => {
        this.users.set(user.id, user);
      });
    }

    this._saveConfig();
    this._logAction('config:imported', { timestamp: new Date().toISOString() });
  }

  /**
   * Log action to audit ledger
   */
  _logAction(action, details) {
    if (this.auditLedger) {
      this.auditLedger.log({
        type: 'rbac',
        action,
        details,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Sanitize payload for logging
   */
  _sanitizePayload(payload) {
    const sensitive = ['password', 'token', 'secret', 'key', 'credential'];
    const sanitized = { ...payload };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

export default RBACEngine;
