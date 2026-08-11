import React, { useEffect, useState, useMemo } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { Shield, Eye, Save, Plus, CheckCircle2, Sliders, Zap, RotateCcw } from 'lucide-react';
import { ModulePermissionsGrid, ALL_SYSTEM_MODULES } from '../../components/portal/ModulePermissionsGrid';
import { ModulePermission, ModuleKey } from '../../types';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';

export const RolesPermissionsPage: React.FC = () => {
  const { showToast } = useToast();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  
  // Editable state for the selected role's permissions
  const [rolePermissions, setRolePermissions] = useState<Record<string, ModulePermission>>({});

  // New Custom Role Modal state
  const [newRoleModalOpen, setNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.getRoles();
      const fetchedRoles = res.roles || res || [];
      setRoles(fetchedRoles);
      if (fetchedRoles.length > 0) {
        if (!selectedRole) {
          selectRoleAndLoadPermissions(fetchedRoles[0]);
        } else {
          const matching = fetchedRoles.find((r: any) => r.id === selectedRole.id) || fetchedRoles[0];
          selectRoleAndLoadPermissions(matching);
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const selectRoleAndLoadPermissions = (role: any) => {
    setSelectedRole(role);
    const map: Record<string, ModulePermission> = {};
    ALL_SYSTEM_MODULES.forEach(m => {
      const existing = role.defaultPermissions?.find((p: any) => p.moduleKey === m.key);
      if (existing) {
        map[m.key] = { ...existing };
      } else {
        const isAdmin = role.name === 'Admin';
        map[m.key] = {
          id: `role_perm_${m.key}`,
          userId: 'role_template',
          moduleKey: m.key,
          canView: isAdmin,
          canCreate: isAdmin,
          canEdit: isAdmin,
          canDelete: isAdmin,
          canPublish: isAdmin,
          canApprove: isAdmin,
          canExport: isAdmin,
          canManageSettings: isAdmin
        };
      }
    });
    setRolePermissions(map);
  };

  const handleGrantFullAccess = () => {
    if (!selectedRole) return;
    const fullPerms: Record<string, ModulePermission> = {};
    ALL_SYSTEM_MODULES.forEach(m => {
      fullPerms[m.key] = {
        id: `role_perm_${m.key}`,
        userId: 'role_template',
        moduleKey: m.key,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canPublish: true,
        canApprove: true,
        canExport: true,
        canManageSettings: true
      };
    });
    setRolePermissions(fullPerms);
    showToast('success', `Marked full access permissions for ${selectedRole.name}. Click 'Save Role Permissions' to persist.`);
  };

  const handleResetToDefault = () => {
    if (selectedRole) {
      selectRoleAndLoadPermissions(selectedRole);
      showToast('info', 'Reset permissions matrix to saved template.');
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      setSaving(true);
      const permList = Object.values(rolePermissions);
      const res = await api.updateRole(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
        defaultPermissions: permList
      });

      const updatedRoles = res.roles || roles;
      setRoles(updatedRoles);
      const updatedSelected = updatedRoles.find((r: any) => r.id === selectedRole.id) || selectedRole;
      setSelectedRole(updatedSelected);
      showToast('success', `Successfully updated permission template for role '${selectedRole.name}'.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save role permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      showToast('error', 'Please enter a role name.');
      return;
    }

    try {
      setSaving(true);
      // Default to read-only or empty permissions
      const defPerms = ALL_SYSTEM_MODULES.map(m => ({
        moduleKey: m.key,
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canApprove: false,
        canExport: true,
        canManageSettings: false
      }));

      const res = await api.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || 'Custom system role template',
        defaultPermissions: defPerms
      });

      showToast('success', `Created custom role '${newRoleName}'.`);
      setNewRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');

      const updatedRoles = res.roles || roles;
      setRoles(updatedRoles);
      if (res.role) {
        selectRoleAndLoadPermissions(res.role);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create new role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout currentModule="roles_permissions" title="Roles & Access Templates">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div>
            <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-400" />
              <span>System Role Definitions & Full Permission Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ސިސްޓަމްގެ ކޮންމެ ރޯލަކަށް ކަނޑައެޅިފައިވާ ޑީފޯލްޓް ޕަރމިޝަން ޓެމްޕްލޭޓްތަކާއި ހުއްދަތައް ބަދަލުކޮށް ސޭވްކުރައްވާ.
            </p>
          </div>

          <button
            onClick={() => setNewRoleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Role Template</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading system roles...</div>
        ) : (
          <div className="space-y-6">
            {/* System Role Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {roles.map(r => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => selectRoleAndLoadPermissions(r)}
                    className={`bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-500 shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/50 bg-slate-900/90'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white font-heading truncate">{r.name}</h3>
                          {r.isSystemRole && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">System</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{r.description || 'System role preset'}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Module Permissions</span>
                      <span className={`font-semibold flex items-center gap-1 ${isSelected ? 'text-orange-400' : 'text-slate-500'}`}>
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Editing' : 'Select Role'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Role Grid & Controls */}
            {selectedRole && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                        <span>Editing Role Template:</span>
                        <span className="text-orange-400 underline decoration-orange-500/50">{selectedRole.name}</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedRole.description} — Click checkboxes or quick presets below to pick/mark access for all modules & sub-tabs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={handleGrantFullAccess}
                      className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                      title="Mark Full Access for all 18 modules"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Full Access</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-all"
                      title="Reset changes to saved template"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveRolePermissions}
                      disabled={saving}
                      className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save Role Permissions'}</span>
                    </button>
                  </div>
                </div>

                {/* Module Permissions Grid */}
                <ModulePermissionsGrid
                  permissions={rolePermissions}
                  onChange={setRolePermissions}
                  readOnly={false}
                  title={`Full Access & Module Permissions Grid for ${selectedRole.name}`}
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveRolePermissions}
                    disabled={saving}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-xl shadow-orange-500/20 transition-all disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving Role Permissions...' : 'Save Role Permissions (ރޯލް ޕަރމިޝަން ސޭވްކުރައްވާ)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Custom Role Modal */}
      <Modal
        isOpen={newRoleModalOpen}
        onClose={() => setNewRoleModalOpen(false)}
        title="Add New Custom Role Template"
        maxWidth="md"
      >
        <form onSubmit={handleCreateNewRole} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Role Name *</label>
            <input
              type="text"
              required
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              placeholder="e.g. Ramazan Quiz Manager, Financial Auditor"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Role Description</label>
            <textarea
              rows={3}
              value={newRoleDesc}
              onChange={e => setNewRoleDesc(e.target.value)}
              placeholder="Describe the scope and responsibilities of this role..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
            <p className="font-semibold text-orange-400 mb-1">Initial Permissions:</p>
            <p>The new role will be initialized with standard Read-Only permissions across modules. You can then mark Full Access or pick individual permissions in the grid.</p>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setNewRoleModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400 shadow-lg shadow-orange-500/20"
            >
              {saving ? 'Creating...' : 'Create Role Template'}
            </button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  );
};
