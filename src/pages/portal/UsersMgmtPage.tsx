import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { User, ModuleKey, ModulePermission, ClubMember } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { PinInput } from '../../components/common/PinInput';
import { useToast } from '../../components/common/Toast';
import { ModulePermissionsGrid, ALL_SYSTEM_MODULES } from '../../components/portal/ModulePermissionsGrid';
import { UserPerformanceModal } from '../../components/portal/UserPerformanceModal';
import { 
  Plus, Edit, Lock, Unlock, UserX, UserCheck, Shield, Key, Users, Sliders, Trash2, Activity, Award 
} from 'lucide-react';

export const UsersMgmtPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // User Accounts State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'exco' | 'member'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Performance Dashboard Modal State
  const [performanceUserId, setPerformanceUserId] = useState<string | null>(null);

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Admin Reset PIN State
  const [resetPinUser, setResetPinUser] = useState<User | null>(null);
  const [newResetPin, setNewResetPin] = useState('');
  const [confirmResetPin, setConfirmResetPin] = useState('');
  const [resetPinLoading, setResetPinLoading] = useState(false);

  // User Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pin, setPin] = useState('2613');
  const [roleId, setRoleId] = useState('role_member');
  const [isActive, setIsActive] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const [permissions, setPermissions] = useState<Record<string, ModulePermission>>({});

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const [uRes, rRes, mRes] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getMembers().catch(() => [])
      ]);
      setUsers(uRes.users || uRes || []);
      setRoles(rRes.roles || rRes || []);
      setMembers(mRes || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load user management data.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Define subtabs & permission checks
  const allSubTabs = [
    { key: 'users', label: `ޔޫޒަރ ސެޓިންގްސް & އެކައުންޓްތައް (${users.length})`, icon: Users, canView: hasPermission('users', 'canView') },
    { key: 'roles', label: 'ރޯލް & ޕަރމިޝަން ސެޓިންގްސް', icon: Shield, canView: hasPermission('roles_permissions', 'canView') }
  ];

  const allowedSubTabs = allSubTabs.filter(t => t.canView);
  const requestedTab = searchParams.get('tab');
  const currentTab = allowedSubTabs.some(t => t.key === requestedTab)
    ? (requestedTab as string)
    : (allowedSubTabs[0]?.key || 'users');

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    fetchUsers();
  }, [currentTab]);

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setDesignation('');
    setContactNumber('');
    setSelectedMemberId('');
    setPin('2613');
    setRoleId('role_member');
    setIsActive(true);
    setIsLocked(false);

    // Standard members don't require admin module permissions
    setPermissions({});
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setDesignation(u.designation || '');
    setContactNumber(u.contactNumber || '');
    setSelectedMemberId(u.memberId || '');
    setPin('');
    setRoleId(u.roleId);
    setIsActive(u.status === 'active');
    setIsLocked(u.status === 'locked');

    const permMap: Record<string, ModulePermission> = {};
    ALL_SYSTEM_MODULES.forEach(m => {
      const existing = (u.permissions || u.modulePermissions)?.find(p => p.moduleKey === m.key);
      permMap[m.key] = existing || {
        id: `perm_${m.key}`,
        userId: u.id,
        moduleKey: m.key,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canApprove: false,
        canExport: false,
        canManageSettings: false
      };
    });
    setPermissions(permMap);
    setUserModalOpen(true);
  };

  const handleTogglePerm = (modKey: string, field: keyof ModulePermission) => {
    setPermissions(prev => {
      const curr = prev[modKey] || {
        id: `perm_${modKey}`,
        userId: editingUser?.id || '',
        moduleKey: modKey as any,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canApprove: false,
        canExport: false,
        canManageSettings: false
      };
      return {
        ...prev,
        [modKey]: {
          ...curr,
          [field]: !curr[field]
        }
      };
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || (!editingUser && !pin)) {
      showToast('error', 'Please fill in all required username and PIN fields.');
      return;
    }

    if (!selectedMemberId) {
      showToast('error', 'To create or link a user, you MUST select an existing club member (އެގްޒިސްޓިންގ މެންބަރަކާ ގުޅުވަންޖެހޭނެ).');
      return;
    }

    const selectedRole = roles.find(r => r.id === roleId);
    const roleName = selectedRole?.name || '';
    const isMemberRole = roleId === 'role_member' || roleName === 'Club Member';
    const isExcoRole = roleName === 'EXCO Member' || roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(roleId);

    // For standard members, no administrative modules are assigned
    const permissionList = isMemberRole ? [] : Object.values(permissions);

    const payload = {
      username,
      fullName: fullName || members.find(m => m.id === selectedMemberId)?.fullName || username,
      designation: isExcoRole ? designation : '',
      contactNumber,
      memberId: selectedMemberId,
      pin: pin || undefined,
      confirmPin: pin || undefined,
      roleId,
      roleName: selectedRole?.name || (isMemberRole ? 'Club Member' : 'System User'),
      isActive,
      isLocked,
      permissions: permissionList
    };

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, payload);
        showToast('success', 'User updated successfully.');
      } else {
        await api.createUser(payload);
        showToast('success', 'User account created successfully.');
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save user account.');
    }
  };

  const handleDeleteUser = (u: User) => {
    setUserToDelete(u);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteUser(userToDelete.id);
      showToast('success', `User @${userToDelete.username} deleted.`);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete user.');
    } finally {
      setUserToDelete(null);
    }
  };

  const handleToggleLock = async (u: User) => {
    const isCurrentlyLocked = u.status === 'locked';
    try {
      await api.updateUserStatus(u.id, { isLocked: !isCurrentlyLocked });
      showToast('success', isCurrentlyLocked ? 'User unlocked.' : 'User account locked out.');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update lock state.');
    }
  };

  const handleOpenResetPinModal = (u: User) => {
    setResetPinUser(u);
    setNewResetPin('');
    setConfirmResetPin('');
  };

  const handlePerformResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinUser) return;

    const cleanPin = newResetPin.trim();
    if (!cleanPin || !confirmResetPin.trim()) {
      showToast('error', 'Please enter and confirm the new numeric PIN.');
      return;
    }

    if (!/^\d+$/.test(cleanPin)) {
      showToast('error', 'PIN must contain numeric digits only (e.g. 2613).');
      return;
    }

    if (cleanPin.length < 4) {
      showToast('error', 'PIN must be at least 4 numeric digits.');
      return;
    }

    if (cleanPin !== confirmResetPin.trim()) {
      showToast('error', 'New PIN and Confirm PIN do not match.');
      return;
    }

    try {
      setResetPinLoading(true);
      await api.resetUserPin(resetPinUser.id, cleanPin);
      showToast('success', `PIN successfully reset for user @${resetPinUser.username}.`);
      setResetPinUser(null);
      setNewResetPin('');
      setConfirmResetPin('');
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reset PIN.');
    } finally {
      setResetPinLoading(false);
    }
  };

  return (
    <PortalLayout currentModule="users" title="User Management Module">
      <div className="space-y-6">
        
        {/* Module Header & Sub-Nav Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">User Management Module</span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white">ޔޫޒަރ މެނޭޖްމަންޓް މޮޑިއުލް</h2>
              <p className="text-xs text-slate-400 mt-1">
                ޔޫޒަރ އެކައުންޓްތައް، PIN ރެސެޓް، ރޯލްތައް އަދި މޮޑިއުލް ހުއްދަތައް.
              </p>
            </div>

            {currentTab === 'users' && (
              <button
                type="button"
                onClick={handleOpenCreateUser}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>އަލަށް ޔޫޒަރ އެކައުންޓެއް ހައްދަވާ</span>
              </button>
            )}
          </div>

          {/* Sub-Nav Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 overflow-x-auto custom-scrollbar">
            {allowedSubTabs.map(subTab => {
              const Icon = subTab.icon;
              return (
                <button
                  key={subTab.key}
                  type="button"
                  onClick={() => setTab(subTab.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                    currentTab === subTab.key
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{subTab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: USERS SETTING */}
        {currentTab === 'users' && (() => {
          const filteredUsers = users.filter(u => {
            const isAdminRole = u.roleName === 'Admin' || u.roleId === 'role_admin' || u.roleName?.toLowerCase().includes('admin');
            const isExcoRole = u.roleName === 'EXCO Member' || u.roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(u.roleId);
            const isMemberRole = u.roleName === 'Club Member' || u.roleId === 'role_member' || (!isAdminRole && !isExcoRole);

            if (roleFilter === 'admin' && !isAdminRole) return false;
            if (roleFilter === 'exco' && !isExcoRole) return false;
            if (roleFilter === 'member' && !isMemberRole) return false;

            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                u.fullName?.toLowerCase().includes(q) ||
                u.username?.toLowerCase().includes(q) ||
                u.designation?.toLowerCase().includes(q) ||
                u.roleName?.toLowerCase().includes(q)
              );
            }
            return true;
          });

          const adminCount = users.filter(u => u.roleName === 'Admin' || u.roleId === 'role_admin' || u.roleName?.toLowerCase().includes('admin')).length;
          const excoCount = users.filter(u => u.roleName === 'EXCO Member' || u.roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(u.roleId)).length;
          const memberCount = users.length - adminCount - excoCount;

          return (
            <div className="space-y-4">
              {/* Filter & Search Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      roleFilter === 'all'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>ހުރިހާ ޔޫޒަރުން (All: {users.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoleFilter('admin')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      roleFilter === 'admin'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-orange-400" />
                    <span>އެޑްމިން (Admin: {adminCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoleFilter('exco')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      roleFilter === 'exco'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>ހިންގާ ކޮމިޓީ (EXCO: {excoCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoleFilter('member')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                      roleFilter === 'member'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>ކްލަބް މެންބަރުން (Club Member: {Math.max(0, memberCount)})</span>
                  </button>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ޔޫޒަރ ހޯއްދަވާ (Search users)..."
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-orange-500/50"
                  />
                </div>
              </div>

              {loadingUsers ? (
                <div className="py-12 text-center text-slate-400">ޔޫޒަރ އެކައުންޓްތައް ލޯޑުވަނީ...</div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider font-semibold">
                        <tr>
                          <th className="p-3.5">User</th>
                          <th className="p-3.5">Designation</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Lock State</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-200">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                              އެއްވެސް ޔޫޒަރ އެކައުންޓެއް ނެތް.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-800/30">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-orange-400 font-bold flex items-center justify-center">
                                {u.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs">{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium">
                            <div>{u.designation}</div>
                            {u.memberId && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono">
                                  <UserCheck className="w-3 h-3" />
                                  <span>{members.find(m => m.id === u.memberId)?.memberNumber || 'Linked Member'}</span>
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-semibold text-orange-400 text-[10px]">
                              {u.roleName}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'active' ? 'bg-orange-950 text-orange-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {u.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'locked' ? 'bg-rose-950 text-rose-400' : 'bg-orange-950 text-orange-400'
                            }`}>
                              {u.status === 'locked' ? 'Locked' : 'Unlocked'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setPerformanceUserId(u.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/30 flex items-center gap-1 text-[11px] font-bold transition-colors"
                              title="View User Performance Dashboard"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Performance</span>
                            </button>
                            {hasPermission('users', 'canEdit') && (
                              <button
                                type="button"
                                onClick={() => handleOpenResetPinModal(u)}
                                className="p-1.5 rounded-lg bg-slate-800 text-orange-400 hover:text-white hover:bg-slate-700"
                                title="Admin Reset PIN"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission('users', 'canEdit') && (
                              <button
                                type="button"
                                onClick={() => handleToggleLock(u)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                title={u.status === 'locked' ? 'Unlock Account' : 'Lockout Account'}
                              >
                                {u.status === 'locked' ? <Unlock className="w-3.5 h-3.5 text-orange-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                              </button>
                            )}
                            {hasPermission('users', 'canEdit') && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                                title="Edit User & Permissions"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission('users', 'canDelete') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

        {/* TAB 2: ROLES & PERMISSIONS SETTING */}
        {currentTab === 'roles' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white font-heading">ސިސްޓަމް ރޯލްތަކާއި ޕަރމިޝަން ޓެމްޕްލޭޓްތައް</h3>
                <p className="text-xs text-slate-400 mt-0.5">ސިސްޓަމްގެ ކޮންމެ ރޯލަކަށް ކަނޑައެޅިފައިވާ ޑީފޯލްޓް ހުއްދަތަކާއި ލިމިޓްތައް. Pick & mark permissions for all modules and sub-tabs.</p>
              </div>

              <a
                href="/portal/roles-permissions"
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <Sliders className="w-4 h-4" />
                <span>Configure Full Permission Matrix</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map(r => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-heading">{r.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-xs text-slate-300">
                    <span className="font-semibold text-orange-400 block mb-2">Preset Permissions:</span>
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {r.defaultPermissions?.map((p: any) => (
                        <div key={p.moduleKey} className="flex items-center justify-between p-1.5 bg-slate-950 rounded-lg text-[11px]">
                          <span className="capitalize font-mono">{(p?.moduleKey || '').replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-1">
                            {p.canView && <span className="px-1 bg-orange-950 text-orange-400 rounded text-[9px]">V</span>}
                            {p.canCreate && <span className="px-1 bg-red-950 text-red-400 rounded text-[9px]">C</span>}
                            {p.canEdit && <span className="px-1 bg-amber-950 text-amber-400 rounded text-[9px]">E</span>}
                            {p.canDelete && <span className="px-1 bg-rose-950 text-rose-400 rounded text-[9px]">D</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* User Create / Edit Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.fullName}` : 'Create New User Account'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-6">
          {/* Link to Existing Club Member (Mandatory) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold uppercase text-orange-400 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span> Link to Existing Club Member * (އެގްޒިސްޓިންގ މެންބަރަކާ ގުޅުވުން)</span>
            </label>
            <select
              required
              value={selectedMemberId}
              onChange={e => {
                const mId = e.target.value;
                setSelectedMemberId(mId);
                if (mId) {
                  const found = members.find(m => m.id === mId);
                  if (found) {
                    setFullName(found.fullName);
                    if (found.phoneNumber) setContactNumber(found.phoneNumber);
                    if (found.excoDesignation) {
                      setDesignation(found.excoDesignation);
                    }
                  }
                }
              }}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="">-- Select Existing Member (މެންބަރަކު ޚިޔާރުކުރައްވާ) * --</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.memberNumber} - {m.fullName} ({m.memberType}) {m.phoneNumber ? `[${m.phoneNumber}]` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Creating or editing a user account requires linking to an existing club member record to synchronize performance and attendance tracking.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center justify-between">
              <span>System Role (ސިސްޓަމް ރޯލް) *</span>
              <span className="text-[10px] text-orange-400 font-semibold lowercase">Admin / EXCO / Member</span>
            </label>
            <select
              required
              value={roleId}
              onChange={e => {
                const newRoleId = e.target.value;
                setRoleId(newRoleId);
                const selectedRole = roles.find(r => r.id === newRoleId);
                if (selectedRole && selectedRole.defaultPermissions) {
                  const newPermMap: Record<string, ModulePermission> = {};
                  ALL_SYSTEM_MODULES.forEach(m => {
                    const existing = selectedRole.defaultPermissions.find((p: any) => p.moduleKey === m.key);
                    newPermMap[m.key] = existing ? { ...existing, id: `perm_${m.key}`, userId: editingUser ? editingUser.id : 'new' } : {
                      id: `perm_${m.key}`,
                      userId: editingUser ? editingUser.id : 'new',
                      moduleKey: m.key,
                      canView: false, canCreate: false, canEdit: false, canDelete: false, canPublish: false, canApprove: false, canExport: false, canManageSettings: false
                    };
                  });
                  setPermissions(newPermMap);
                }
              }}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 focus:outline-none transition cursor-pointer"
            >
              <option value="role_admin">Admin (އެޑްމިން - Full Access)</option>
              <option value="role_exco">EXCO Member (ހިންގާ ކޮމިޓީ)</option>
              <option value="role_member">Club Member (ކްލަބް މެންބަރު - Member Dashboard)</option>
              {roles.filter(r => !['role_admin', 'role_exco', 'role_member'].includes(r.id)).map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.description || 'Executive Officer'})</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 inline-block"></span>
              <span>Admin & Club Member roles do not require Designation. Designation is required for EXCO Members.</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Username *</label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. john"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Designation field shown ONLY for EXCO Members */}
            {(roles.find(r => r.id === roleId)?.name === 'EXCO Member' || roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(roleId)) ? (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Designation * (EXCO Role)</label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  placeholder="e.g. Quiz Coordinator / Vice President"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-500 italic p-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                Designation not required for {roles.find(r => r.id === roleId)?.name || 'this role'}.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Contact Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={e => setContactNumber(e.target.value)}
                placeholder="e.g. 7771234"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          {!editingUser ? (
            <PinInput
              id="new_user_pin"
              value={pin}
              onChange={setPin}
              label="Initial Numeric PIN *"
              required
            />
          ) : (
            <PinInput
              id="edit_user_pin"
              value={pin}
              onChange={setPin}
              label="Update User PIN (Optional - leave blank to keep unchanged)"
            />
          )}

          {/* Module Permissions Grid or Standard Member Info */}
          {(roleId === 'role_member' || roles.find(r => r.id === roleId)?.name === 'Club Member') ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-300">ސްޓޭންޑަރޑް މެންބަރ އެކައުންޓް (Standard Member Role)</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  ސްޓޭންޑަރޑް މެންބަރުންގެ އެކައުންޓްތަކަށް ވަކި އެޑްމިން މޮޑިއުލްތަކެއް އެސައިން ކުރާކަށް ނުޖެހޭނެއެވެ. މެންބަރުންނަށް އަމިއްލަ މެންބަރޝިޕް ޑޭޝްބޯޑު، އަމިއްލަ ބަޖެޓާއި ފީގެ ތަފްޞީލު، ރަމަޟާން ކުއިޒް، ކްލަބް ޤަވާޢިދުތައް އަދި ޕްރޮފައިލް ސެޓިންގްސް އޮޓޮމެޓިކުން ލިބޭނެއެވެ.
                </p>
                <p className="text-[11px] text-emerald-400 font-mono pt-1">
                  ✓ Standard Member: No administrative module permissions needed. Direct access to self-service dashboard & personal budget statistics.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">User Module Access & Permissions Grid</span>
                <button
                  type="button"
                  onClick={() => {
                    const fullPerms: Record<string, ModulePermission> = {};
                    ALL_SYSTEM_MODULES.forEach(m => {
                      fullPerms[m.key] = {
                        id: `perm_${m.key}`,
                        userId: editingUser ? editingUser.id : 'new',
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
                    setPermissions(fullPerms);
                    showToast('success', 'Marked FULL ACCESS permissions across all modules.');
                  }}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Mark Full Access (ހުރިހާ ހުއްދައެއް)</span>
                </button>
              </div>
              <ModulePermissionsGrid
                permissions={permissions}
                onChange={setPermissions}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400"
            >
              Save User Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Reset User PIN Modal */}
      <Modal
        isOpen={!!resetPinUser}
        onClose={() => {
          setResetPinUser(null);
          setNewResetPin('');
          setConfirmResetPin('');
        }}
        title={`Reset Security PIN: @${resetPinUser?.username}`}
        description="Set a new numeric PIN for this user account. Only administrators have permission to create or change user PINs."
      >
        <form onSubmit={handlePerformResetPin} className="space-y-4">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-white">{resetPinUser?.fullName}</p>
              <p className="text-slate-400">@{resetPinUser?.username} &bull; {resetPinUser?.roleName}</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono text-[11px] font-bold">
              Admin PIN Override
            </span>
          </div>

          <PinInput
            id="admin_reset_new_pin"
            value={newResetPin}
            onChange={setNewResetPin}
            label="New Numeric PIN (at least 4 digits) *"
            required
          />

          <PinInput
            id="admin_reset_confirm_pin"
            value={confirmResetPin}
            onChange={setConfirmResetPin}
            label="Confirm New Numeric PIN *"
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setResetPinUser(null);
                setNewResetPin('');
                setConfirmResetPin('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetPinLoading}
              className="px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-400 disabled:opacity-50"
            >
              {resetPinLoading ? 'Resetting PIN...' : 'Save New PIN'}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Performance Dashboard Modal */}
      <UserPerformanceModal
        isOpen={!!performanceUserId}
        onClose={() => setPerformanceUserId(null)}
        userId={performanceUserId || ''}
        userName={users.find(u => u.id === performanceUserId)?.fullName}
      />

      {/* User Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        title="ޔޫޒަރ އެކައުންޓް ޑިލީޓް ކުރުން (Delete User Account)"
        message={`ޔޫޒަރ @${userToDelete?.username || ''} (${userToDelete?.fullName || ''}) ގެ އެކައުންޓް ސިސްޓަމުން ފޮހެލަން ކަށަވަރު ކުރައްވާ. މި އެކައުންޓް ޑިލީޓް ކުރުމުން ސިސްޓަމަށް ވަނުމުގެ ހުއްދަ ގެއްލޭނެއެވެ.`}
        confirmText="އެކައުންޓް ފޮހެލާ (Delete Account)"
        cancelText="ކެންސަލް (Cancel)"
        isDanger={true}
      />

    </PortalLayout>
  );
};
