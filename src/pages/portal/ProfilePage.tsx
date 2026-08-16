import React, { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { api } from '../../services/api';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import { UserPerformanceModal } from '../../components/portal/UserPerformanceModal';
import {
  User as UserIcon,
  Shield,
  Save,
  Phone,
  Sliders,
  BookOpen,
  Activity
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [isRulesModalOpen, setRulesModalOpen] = useState(false);
  const [isPerformanceModalOpen, setPerformanceModalOpen] = useState(false);

  // Check if current user is Admin
  const isAdmin = Boolean(
    user && (
      user.roleName === 'Admin' ||
      user.roleId === 'role_admin' ||
      user.roleName?.toLowerCase().includes('admin')
    )
  );

  // If Admin user enters profile, redirect to Admin Controller Settings
  useEffect(() => {
    if (isAdmin) {
      window.location.replace('/portal/settings');
    }
  }, [isAdmin]);

  // URL query parameter tab handling (e.g. /portal/profile?tab=performance)
  const queryParams = new URLSearchParams(window.location.search);
  const initialTab = queryParams.get('tab') === 'performance' ? 'performance' : (queryParams.get('tab') === 'preferences' ? 'preferences' : 'info');

  const [activeTab, setActiveTab] = useState<'info' | 'preferences' | 'permissions' | 'performance'>(initialTab as any);

  // Profile Info Form
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [notes, setNotes] = useState(user?.notes || '');
  const [infoLoading, setInfoLoading] = useState(false);

  // Preferences Form
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [msgAlerts, setMsgAlerts] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setDesignation(user.designation || '');
      setContactNumber(user.contactNumber || '');
      setProfileImage(user.profileImage || '');
      setNotes(user.notes || '');
    }
  }, [user]);

  if (!user || isAdmin) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('error', 'Full Name is required.');
      return;
    }

    try {
      setInfoLoading(true);
      await api.updateProfile({
        fullName: fullName.trim(),
        designation: designation.trim(),
        contactNumber: contactNumber.trim(),
        profileImage: profileImage.trim(),
        notes: notes.trim()
      });
      showToast('success', 'Profile information updated successfully.');
      refreshUser();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update profile info.');
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefLoading(true);
    setTimeout(() => {
      setPrefLoading(false);
      showToast('success', 'User preferences updated.');
    }, 400);
  };

  return (
    <PortalLayout currentModule="profile" title="ޕްރޯފައިލް ސެޓިންގްސް (Profile Settings)">
      <div className="space-y-6 max-w-4xl" dir="rtl">
        
        {/* Profile Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user.fullName}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-500/40 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-3xl flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                  {user.fullName.charAt(0)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white font-heading">{user.fullName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    Active
                  </span>
                </div>
                <p className="text-xs text-orange-400 font-semibold font-mono mt-1">
                  @{user.username}{user.designation ? ` • ${user.designation}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400">
                    {user.roleName}
                  </span>
                  {user.contactNumber && (
                    <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {user.contactNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 md:border-r border-slate-800 pt-4 md:pt-0 md:pr-6 text-xs text-slate-400 space-y-2 font-mono">
              <p><strong className="text-slate-300">އެންމެ ފަހުން ލޮގިންވި:</strong> {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'ނޭނގެ'}</p>
              <p><strong className="text-slate-300">އެކައުންޓް ހެދި ތާރީޚު:</strong> {user.createdAt ? formatDate(user.createdAt) : 'ނޭނގެ'}</p>
              <div className="pt-1">
                <button
                  onClick={() => setRulesModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition w-full md:w-auto"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>ކްލަބް ޤަވާޢިދު ބައްލަވާ (View Rules)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2 flex items-center justify-between gap-2 overflow-x-auto shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'info'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>ޕްރޯފައިލް މަޢުލޫމާތު (Profile Details)</span>
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'preferences'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>އިޚްތިޔާރުތައް (Preferences)</span>
            </button>

            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 text-orange-400" />
              <span>މަގޭ ޕަރފޯމަންސް (My Performance)</span>
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'permissions'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>ޙައްޤުތައް (Permissions)</span>
            </button>
          </div>

          <button
            onClick={() => setRulesModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/30 shrink-0"
          >
            <BookOpen className="w-4 h-4 text-orange-400" />
            <span>ކްލަބް ޤަވާޢިދު (View Rules)</span>
          </button>
        </div>

        {/* TAB 1: PROFILE INFO EDIT FORM */}
        {activeTab === 'info' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-orange-400" />
                <span>އަމިއްލަ މަޢުލޫމާތު ބަދަލުކުރުން</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ޕޯޓަލްގައި ދައްކާނެ ނަމާއި މަޤާމު އަދި ގުޅޭނެ މަޢުލޫމާތު އަޕްޑޭޓް ކުރައްވާ.
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  ފުރިހަމަ ނަން (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(user.roleName === 'EXCO Member' || user.roleId === 'role_exco' || ['role_president', 'role_vp', 'role_treasurer', 'role_secretary'].includes(user.roleId)) && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                      މަޤާމު / ޑެސިގްނޭޝަން (Designation)
                    </label>
                    <input
                      type="text"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    ގުޅޭނެ ނަންބަރު (Contact Phone)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <ImageUploadInput
                label="ޕްރޯފައިލް ފޮޓޯ (Profile Photo Image File)"
                value={profileImage}
                onChange={setProfileImage}
                placeholder="Select or drop your profile image..."
              />

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  އިތުރު ނޯޓްސް / ބަޔޯ (Notes)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={infoLoading}
                  className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{infoLoading ? 'ރައްކާކުރެވެނީ...' : 'މަޢުލޫމާތު ރައްކާކުރައްވާ'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: PREFERENCES & NOTIFICATIONS */}
        {activeTab === 'preferences' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-400" />
                <span>ނޯޓިފިކޭޝަން އަދި އިޚްތިޔާރުތައް</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                ނޯޓިފިކޭޝަންތަކާއި ޕޯޓަލް ބޭނުންކުރާ ގޮތުގެ އިޚްތިޔާރުތައް.
              </p>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-6 max-w-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">އީމެއިލް އެލާޓްތައް (Email Notifications)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">މުހިންމު ޙަރަކާތްތަކާއި އެނައުންސްމަންޓްތަކުގެ އީމެއިލް ލިބުން.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={e => setEmailAlerts(e.target.checked)}
                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white">މެސެޖު އަދި އިންބޮކްސް އެލާޓް (Direct Message Notifications)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">އައު މެސެޖެއް ނުވަތަ ނޯޓިފިކޭޝަނެއް ލިބުމުން ހެޑަރގައި އެލާޓް ދެއްކުން.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={msgAlerts}
                    onChange={e => setMsgAlerts(e.target.checked)}
                    className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={prefLoading}
                  className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{prefLoading ? 'ރައްކާކުރެވެނީ...' : 'ސެޓިންގްސް ރައްކާކުރައްވާ'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: PERMISSIONS OVERVIEW */}
        {activeTab === 'permissions' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-400" />
                <span>އެކައުންޓް ޙައްޤުތަކާއި ހުއްދަތައް (Role & Permissions)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                މި އެކައުންޓަށް ލިބިފައިވާ މޮޑިއުލްތަކުގެ ހުއްދަތަކުގެ ތަފްސީލު.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(user.permissions || user.modulePermissions || []).map(perm => (
                <div key={perm.moduleKey} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="font-bold text-white text-sm uppercase font-mono">{perm.moduleKey}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      perm.canView ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {perm.canView ? 'ހުއްދަ އޮތް' : 'މަނާ'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                    <span className={perm.canCreate ? 'text-emerald-400' : 'text-slate-600'}>
                      • އިތުރުކުރުން: {perm.canCreate ? '✓' : '✗'}
                    </span>
                    <span className={perm.canEdit ? 'text-emerald-400' : 'text-slate-600'}>
                      • ބަދަލުކުރުން: {perm.canEdit ? '✓' : '✗'}
                    </span>
                    <span className={perm.canDelete ? 'text-emerald-400' : 'text-slate-600'}>
                      • ކެންސަލް/ޑިލީޓް: {perm.canDelete ? '✓' : '✗'}
                    </span>
                    <span className={perm.canExport ? 'text-emerald-400' : 'text-slate-600'}>
                      • އެކްސްޕޯޓް: {perm.canExport ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MY PERFORMANCE DASHBOARD */}
        {activeTab === 'performance' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  <span>މަގޭ ޕަރފޯމަންސް ޑޭޝްބޯޑު (My Performance Dashboard)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ކްލަބްގެ ހަރަކާތްތަކާއި ބައްދަލުވުންތަކަށް ހާޟިރުވި މިންވަރާއި، ރަމަޟާން ކުއިޒް އަދި ޙަރަކާތްތަކުގެ ނަތީޖާ.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPerformanceModalOpen(true)}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                <span>Open Detailed Performance View</span>
              </button>
            </div>

            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                <Activity className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-base font-bold text-white font-heading">
                  {user.fullName} ގެ ޕަރފޯމަންސް ރިޕޯޓު
                </h4>
                <p className="text-xs text-slate-400">
                  ތިބާގެ ހާޟިރީ ރެކޯޑުތަކާއި ކުއިޒް ޖަވާބުތަކުގެ ތަފްސީލީ ރިޕޯޓު ބެއްލެވުމަށް ތިރީގައިވާ ފިތަށް އޮބާލައްވާ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPerformanceModalOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-xl shadow-orange-500/20 transition hover:scale-105 inline-flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                <span>ޙާޟިރީ އާއި ނަތީޖާ ބައްލަވާ</span>
              </button>
            </div>
          </div>
        )}

      </div>

      <ClubRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />

      <UserPerformanceModal
        isOpen={isPerformanceModalOpen || activeTab === 'performance'}
        onClose={() => {
          setPerformanceModalOpen(false);
          if (activeTab === 'performance') setActiveTab('info');
        }}
        userId={user.id}
        userName={user.fullName}
      />
    </PortalLayout>
  );
};
