import React, { useState, useMemo } from 'react';
import { ModuleKey, ModulePermission } from '../../types';
import {
  CheckSquare,
  Square,
  Shield,
  ShieldCheck,
  Zap,
  Eye,
  PlusCircle,
  Edit3,
  Trash2,
  UploadCloud,
  CheckCircle2,
  Download,
  Settings,
  Search,
  RotateCcw,
  Sparkles,
  Sliders
} from 'lucide-react';

export interface ModuleInfo {
  key: ModuleKey;
  labelDhivehi: string;
  labelEnglish: string;
  category: 'core' | 'quiz' | 'content' | 'admin';
  description: string;
}

export const ALL_SYSTEM_MODULES: ModuleInfo[] = [
  // Core Operations
  { key: 'dashboard', labelDhivehi: 'ޑޭޝްބޯޑް އޯވަރވިއު', labelEnglish: 'Dashboard Overview', category: 'core', description: 'Overall system metrics, activity overview, and analytics' },
  { key: 'members', labelDhivehi: 'ކްލަބް މެންބަރުންގެ ދަފްތަރު', labelEnglish: 'Club Members Register', category: 'core', description: 'Official members registry, registration forms, and details' },
  { key: 'events_meetings', labelDhivehi: 'ޙަރަކާތްތަކާއި ބައްދަލުވުންތައް', labelEnglish: 'Events & Meetings', category: 'core', description: 'Event scheduling, EXCO meeting minutes, attendance, and votings' },
  { key: 'messages', labelDhivehi: 'އިންބޮކްސް އަދި މެސެޖުތައް', labelEnglish: 'Inbox & Direct Messages', category: 'core', description: 'Public contact inquiries, action tracking, and internal alerts' },

  // Ramazan Quiz
  { key: 'ramazan_quiz', labelDhivehi: 'ރޯދަމަހުގެ ސުވާލުތައް', labelEnglish: 'Ramazan Quiz Questions', category: 'quiz', description: 'Daily Ramazan quiz questions, answers, prizes, and status' },
  { key: 'quiz_participants', labelDhivehi: 'ބައިވެރިންގެ ޖަވާބުތައް', labelEnglish: 'Quiz Submissions & Checking', category: 'quiz', description: 'Participant answer verification, qualification, and CSV export' },
  { key: 'quiz_winners', labelDhivehi: 'ނަޞީބުވެރިން އަދި ގުރުއަތު', labelEnglish: 'Quiz Winners & Lucky Draws', category: 'quiz', description: 'Random draw execution, winner announcements, and prize status' },

  // Public Site Content
  { key: 'content', labelDhivehi: 'ޕަބްލިކް ޚަބަރާއި ލިޔުންތައް', labelEnglish: 'Public Content & Announcements', category: 'content', description: 'Website news posts, announcements, and homepage articles' },
  { key: 'slideshow', labelDhivehi: 'ސްލައިޑްޝޯ ފޮޓޯތައް', labelEnglish: 'Hero Photo Slideshow', category: 'content', description: 'Homepage banner photo carousel management' },
  { key: 'vision_mission', labelDhivehi: 'ވިޜަން އަދި މިޝަން', labelEnglish: 'Vision & Mission Statements', category: 'content', description: 'Club core goals, values, and vision statements' },
  { key: 'exco_team', labelDhivehi: 'ހިންގާ ކޮމިޓީ (EXCO)', labelEnglish: 'EXCO Leadership Team', category: 'content', description: 'Executive committee leadership directory and profiles' },
  { key: 'social_media', labelDhivehi: 'ސޯޝަލް މީޑިއާ ލިންކުތައް', labelEnglish: 'Social Media Links', category: 'content', description: 'Official Facebook, Instagram, YouTube, X channel links' },
  { key: 'contact', labelDhivehi: 'ގުޅޭނެ މަޢުލޫމާތު', labelEnglish: 'Contact Information', category: 'content', description: 'Club phone numbers, email addresses, and headquarters location' },

  // Administration & Security
  { key: 'users', labelDhivehi: 'ޔޫޒަރ އެކައުންޓްތައް', labelEnglish: 'User Accounts & Passwords', category: 'admin', description: 'Portal admin accounts, PIN reset, and lockout controls' },
  { key: 'roles_permissions', labelDhivehi: 'ރޯލްތަކާއި ޕަރމިޝަން', labelEnglish: 'Roles & Access Templates', category: 'admin', description: 'System role definitions and access template presets' },
  { key: 'audit_logs', labelDhivehi: 'ސިސްޓަމް އޮޑިޓް ލޮގް', labelEnglish: 'System Audit Trail', category: 'admin', description: 'Comprehensive system activity, changes, and security logs' },
  { key: 'club_rules', labelDhivehi: 'ކްލަބް ޤަވާޢިދު', labelEnglish: 'Club Rules & Regulations', category: 'admin', description: ' Manage club rules, chapters, and article bylaws' },
  { key: 'settings', labelDhivehi: 'ޕޯޓަލް ސެޓިންގްސް', labelEnglish: 'Portal System Settings', category: 'admin', description: 'Security lockout limits, background images, and database sync' },
];

export const ACTION_COLUMNS: Array<{
  field: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'>;
  labelShort: string;
  labelDhivehi: string;
  labelEnglish: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}> = [
  { field: 'canView', labelShort: 'V', labelDhivehi: 'ބެލުން', labelEnglish: 'View', icon: Eye, colorClass: 'text-sky-400', bgClass: 'bg-sky-500/10 border-sky-500/20' },
  { field: 'canCreate', labelShort: 'C', labelDhivehi: 'އިތުރުކުރުން', labelEnglish: 'Create', icon: PlusCircle, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/20' },
  { field: 'canEdit', labelShort: 'E', labelDhivehi: 'ބަދަލުކުރުން', labelEnglish: 'Edit', icon: Edit3, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10 border-amber-500/20' },
  { field: 'canDelete', labelShort: 'D', labelDhivehi: 'ޑިލީޓްކުރުން', labelEnglish: 'Delete', icon: Trash2, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10 border-rose-500/20' },
  { field: 'canPublish', labelShort: 'P', labelDhivehi: 'ޝާއިޢުކުރުން', labelEnglish: 'Publish', icon: UploadCloud, colorClass: 'text-purple-400', bgClass: 'bg-purple-500/10 border-purple-500/20' },
  { field: 'canApprove', labelShort: 'A', labelDhivehi: 'ފާސްކުރުން', labelEnglish: 'Approve', icon: CheckCircle2, colorClass: 'text-teal-400', bgClass: 'bg-teal-500/10 border-teal-500/20' },
  { field: 'canExport', labelShort: 'X', labelDhivehi: 'އެކްސްޕޯޓް', labelEnglish: 'Export', icon: Download, colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10 border-indigo-500/20' },
  { field: 'canManageSettings', labelShort: 'S', labelDhivehi: 'ސެޓިންގްސް', labelEnglish: 'Settings', icon: Settings, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/10 border-orange-500/20' },
];

interface ModulePermissionsGridProps {
  permissions: Record<string, ModulePermission>;
  onChange: (updatedPermissions: Record<string, ModulePermission>) => void;
  readOnly?: boolean;
  title?: string;
}

export const ModulePermissionsGrid: React.FC<ModulePermissionsGridProps> = ({
  permissions,
  onChange,
  readOnly = false,
  title = 'Module Access Permissions Grid'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'quiz' | 'content' | 'admin'>('all');

  // Filter modules based on search and category
  const filteredModules = useMemo(() => {
    return ALL_SYSTEM_MODULES.filter(m => {
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        m.labelDhivehi.toLowerCase().includes(q) ||
        m.labelEnglish.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  // Handle single permission toggle
  const handleToggleSingle = (moduleKey: string, field: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'>) => {
    if (readOnly) return;
    const currentPerm = permissions[moduleKey] || {
      id: `perm_${moduleKey}`,
      userId: 'user',
      moduleKey: moduleKey as ModuleKey,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canApprove: false,
      canExport: false,
      canManageSettings: false
    };

    const nextPerm = {
      ...currentPerm,
      [field]: !currentPerm[field]
    };

    onChange({
      ...permissions,
      [moduleKey]: nextPerm
    });
  };

  // Preset 1: Full Access (All TRUE)
  const applyFullAccessPreset = () => {
    if (readOnly) return;
    const nextPerms: Record<string, ModulePermission> = { ...permissions };
    ALL_SYSTEM_MODULES.forEach(m => {
      nextPerms[m.key] = {
        id: `perm_${m.key}`,
        userId: permissions[m.key]?.userId || 'user',
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
    onChange(nextPerms);
  };

  // Preset 2: Read Only (View + Export TRUE, others FALSE)
  const applyReadOnlyPreset = () => {
    if (readOnly) return;
    const nextPerms: Record<string, ModulePermission> = { ...permissions };
    ALL_SYSTEM_MODULES.forEach(m => {
      nextPerms[m.key] = {
        id: `perm_${m.key}`,
        userId: permissions[m.key]?.userId || 'user',
        moduleKey: m.key,
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canApprove: false,
        canExport: true,
        canManageSettings: false
      };
    });
    onChange(nextPerms);
  };

  // Preset 3: Content Editor Preset
  const applyEditorPreset = () => {
    if (readOnly) return;
    const nextPerms: Record<string, ModulePermission> = { ...permissions };
    ALL_SYSTEM_MODULES.forEach(m => {
      const isContentOrQuiz = m.category === 'content' || m.category === 'quiz' || m.category === 'core';
      const isAdminModule = m.category === 'admin';

      nextPerms[m.key] = {
        id: `perm_${m.key}`,
        userId: permissions[m.key]?.userId || 'user',
        moduleKey: m.key,
        canView: true,
        canCreate: isContentOrQuiz,
        canEdit: isContentOrQuiz,
        canDelete: false,
        canPublish: isContentOrQuiz,
        canApprove: isContentOrQuiz,
        canExport: true,
        canManageSettings: false
      };
    });
    onChange(nextPerms);
  };

  // Preset 4: Clear All (All FALSE)
  const applyClearAllPreset = () => {
    if (readOnly) return;
    const nextPerms: Record<string, ModulePermission> = { ...permissions };
    ALL_SYSTEM_MODULES.forEach(m => {
      nextPerms[m.key] = {
        id: `perm_${m.key}`,
        userId: permissions[m.key]?.userId || 'user',
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
    onChange(nextPerms);
  };

  // Column master toggle (toggle all for a specific action column)
  const handleToggleColumnMaster = (field: keyof Omit<ModulePermission, 'id' | 'userId' | 'moduleKey'>) => {
    if (readOnly) return;
    // Check if all filtered modules currently have this field true
    const allTrue = filteredModules.every(m => Boolean(permissions[m.key]?.[field]));
    const newValue = !allTrue;

    const nextPerms = { ...permissions };
    filteredModules.forEach(m => {
      const curr = nextPerms[m.key] || {
        id: `perm_${m.key}`,
        userId: 'user',
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
      nextPerms[m.key] = {
        ...curr,
        [field]: newValue
      };
    });

    onChange(nextPerms);
  };

  // Row master toggle (toggle all permissions for a specific module row)
  const handleToggleRowMaster = (moduleKey: ModuleKey) => {
    if (readOnly) return;
    const curr = permissions[moduleKey];
    const allActionsTrue = ACTION_COLUMNS.every(col => Boolean(curr?.[col.field]));
    const newValue = !allActionsTrue;

    const nextPerm: ModulePermission = {
      id: `perm_${moduleKey}`,
      userId: curr?.userId || 'user',
      moduleKey,
      canView: newValue,
      canCreate: newValue,
      canEdit: newValue,
      canDelete: newValue,
      canPublish: newValue,
      canApprove: newValue,
      canExport: newValue,
      canManageSettings: newValue
    };

    onChange({
      ...permissions,
      [moduleKey]: nextPerm
    });
  };

  // Count active permissions summary
  const totalActivePerms = useMemo(() => {
    let count = 0;
    Object.values(permissions).forEach(p => {
      ACTION_COLUMNS.forEach(col => {
        if (p?.[col.field]) count++;
      });
    });
    return count;
  }, [permissions]);

  return (
    <div className="space-y-4">
      {/* Grid Header & Quick Presets Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                {title}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ޖުމްލަ 17 މޮޑިއުލްގެ 8 ބާވަތުގެ ޕަރމިޝަންތައް ކޮންޓްރޯލް ކުރައްވާ (Total Active: {totalActivePerms} Permissions)
            </p>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyFullAccessPreset}
                className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                <span>Full Access</span>
              </button>

              <button
                type="button"
                onClick={applyEditorPreset}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Editor Preset</span>
              </button>

              <button
                type="button"
                onClick={applyReadOnlyPreset}
                className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>Read Only</span>
              </button>

              <button
                type="button"
                onClick={applyClearAllPreset}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All (17)' },
              { id: 'core', label: 'Core Ops' },
              { id: 'quiz', label: 'Ramazan Quiz' },
              { id: 'content', label: 'Public Content' },
              { id: 'admin', label: 'Admin & Security' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative shrink-0 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search module or permission..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-orange-500/50"
            />
          </div>
        </div>
      </div>

      {/* Permissions Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead className="bg-slate-950/90 text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-20 backdrop-blur-md border-b border-slate-800">
              <tr>
                <th className="p-3.5 w-64">
                  <span className="text-[11px] font-bold text-slate-200">System Module</span>
                </th>

                {/* Column Action Headers */}
                {ACTION_COLUMNS.map(col => {
                  const IconComp = col.icon;
                  const isAllChecked = filteredModules.length > 0 && filteredModules.every(m => Boolean(permissions[m.key]?.[col.field]));

                  return (
                    <th key={col.field} className="p-2.5 text-center w-16">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => handleToggleColumnMaster(col.field)}
                            className="flex items-center justify-center gap-1 text-[10px] font-bold hover:text-white transition group"
                            title={`Toggle All ${col.labelEnglish} (${col.labelDhivehi})`}
                          >
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                              isAllChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-700 bg-slate-900 text-transparent group-hover:border-slate-500'
                            }`}>
                              ✓
                            </span>
                            <span className={col.colorClass}>{col.labelShort}</span>
                          </button>
                        ) : (
                          <span className={`text-[10px] font-bold ${col.colorClass}`}>{col.labelShort}</span>
                        )}
                        <span className="text-[9px] font-normal text-slate-400 capitalize truncate max-w-[50px]">
                          {col.labelEnglish}
                        </span>
                      </div>
                    </th>
                  );
                })}

                <th className="p-3 text-right w-20">Row</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 text-slate-200 bg-slate-950/40">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                    އެއްވެސް މޮޑިއުލެއް ނުފެނުނު (No matching system modules found).
                  </td>
                </tr>
              ) : (
                filteredModules.map(m => {
                  const perm = permissions[m.key] || {
                    id: `perm_${m.key}`,
                    userId: 'user',
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

                  // Active action count for this row
                  const activeCount = ACTION_COLUMNS.filter(c => Boolean(perm[c.field])).length;
                  const isFull = activeCount === ACTION_COLUMNS.length;

                  return (
                    <tr key={m.key} className="hover:bg-slate-800/40 transition-colors group">
                      {/* Module Title & Description */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs font-heading">
                              {m.labelDhivehi}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate">
                              ({m.labelEnglish})
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {m.description}
                          </p>
                        </div>
                      </td>

                      {/* Permission Action Cells */}
                      {ACTION_COLUMNS.map(col => {
                        const isChecked = Boolean(perm[col.field]);

                        return (
                          <td key={col.field} className="p-2 text-center align-middle">
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => handleToggleSingle(m.key, col.field)}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                                readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-105'
                              } ${
                                isChecked
                                  ? `${col.bgClass} ${col.colorClass} shadow-sm shadow-orange-500/10 font-bold`
                                  : 'bg-slate-950/60 border-slate-800/80 text-slate-700 hover:border-slate-700 hover:text-slate-500'
                              }`}
                              title={`${col.labelEnglish} (${col.labelDhivehi}) - ${m.labelEnglish}`}
                            >
                              {isChecked ? (
                                <span className="text-xs font-extrabold">{col.labelShort}</span>
                              ) : (
                                <span className="text-[10px] font-mono opacity-30">•</span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      {/* Row Quick Control */}
                      <td className="p-3 text-right align-middle">
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => handleToggleRowMaster(m.key)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition whitespace-nowrap border ${
                              isFull
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500 hover:text-white'
                                : activeCount > 0
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                            title="Toggle all actions for this module"
                          >
                            {activeCount}/{ACTION_COLUMNS.length}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            {activeCount}/{ACTION_COLUMNS.length}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sky-400"><strong>V:</strong> View</span>
            <span className="flex items-center gap-1 text-emerald-400"><strong>C:</strong> Create</span>
            <span className="flex items-center gap-1 text-amber-400"><strong>E:</strong> Edit</span>
            <span className="flex items-center gap-1 text-rose-400"><strong>D:</strong> Delete</span>
            <span className="flex items-center gap-1 text-purple-400"><strong>P:</strong> Publish</span>
            <span className="flex items-center gap-1 text-teal-400"><strong>A:</strong> Approve</span>
            <span className="flex items-center gap-1 text-indigo-400"><strong>X:</strong> Export</span>
            <span className="flex items-center gap-1 text-orange-400"><strong>S:</strong> Settings</span>
          </div>

          <div>
            Showing {filteredModules.length} of {ALL_SYSTEM_MODULES.length} modules
          </div>
        </div>
      </div>
    </div>
  );
};
