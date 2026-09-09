import React, { useState, useEffect, useCallback } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { ClubMember } from '../../types';
import { formatDate } from '../../utils/formatters';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  UserCheck,
  Shield,
  Download,
  X,
  Filter,
  Coins,
  CalendarClock,
  AlertCircle
} from 'lucide-react';

export const MembersMgmtPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<ClubMember | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    memberNumber: '',
    fullName: '',
    idCardNumber: '',
    address: '',
    phoneNumber: '',
    email: '',
    memberType: 'standard' as ClubMember['memberType'],
    excoDesignation: '',
    status: 'active' as ClubMember['status'],
    joinedDate: new Date().toISOString().split('T')[0],
    membershipFeeStartDate: new Date().toISOString().split('T')[0],
    deactivationDate: '',
    deactivationReason: '',
    creditBalance: 0,
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canCreate = hasPermission('members', 'canCreate');
  const canEdit = hasPermission('members', 'canEdit');
  const canDelete = hasPermission('members', 'canDelete');

  const fetchMembers = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await api.getMembers({
        search: searchTerm,
        memberType: typeFilter,
        status: statusFilter
      });
      setMembers(data);
    } catch (err: any) {
      if (!isBackground) {
        showToast('error', err.message || 'Failed to fetch members');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [searchTerm, typeFilter, statusFilter]);

  // Real-time table sync: auto-refetch when clubMembers or users are mutated
  useTableSync(['clubMembers', 'members', 'users'], () => {
    fetchMembers(true);
  });

  const handleOpenAddModal = () => {
    setEditingMember(null);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      memberNumber: `ARC-M-${String(members.length + 1).padStart(3, '0')}`,
      fullName: '',
      idCardNumber: '',
      address: '',
      phoneNumber: '',
      email: '',
      memberType: 'standard',
      excoDesignation: '',
      status: 'active',
      joinedDate: today,
      membershipFeeStartDate: today,
      deactivationDate: '',
      deactivationReason: '',
      creditBalance: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: ClubMember) => {
    setEditingMember(member);
    setFormData({
      memberNumber: member.memberNumber,
      fullName: member.fullName,
      idCardNumber: member.idCardNumber || '',
      address: member.address,
      phoneNumber: member.phoneNumber,
      email: member.email || '',
      memberType: member.memberType,
      excoDesignation: member.excoDesignation || '',
      status: member.status,
      joinedDate: member.joinedDate || new Date().toISOString().split('T')[0],
      membershipFeeStartDate: member.membershipFeeStartDate || member.joinedDate || new Date().toISOString().split('T')[0],
      deactivationDate: member.deactivationDate || '',
      deactivationReason: member.deactivationReason || '',
      creditBalance: Number(member.creditBalance || 0),
      notes: member.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.address.trim() || !formData.phoneNumber.trim()) {
      showToast('error', 'Name, address, and phone number are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMember) {
        await api.updateMember(editingMember.id, formData);
        showToast('success', 'Member updated successfully.');
      } else {
        await api.createMember(formData);
        showToast('success', 'Member created successfully.');
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (member: ClubMember) => {
    setMemberToDelete(member);
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeletingId(memberToDelete.id);
    try {
      await api.deleteMember(memberToDelete.id);
      showToast('success', 'Member deleted successfully.');
      fetchMembers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete member.');
    } finally {
      setDeletingId(null);
      setMemberToDelete(null);
    }
  };

  const handleExportCSV = () => {
    if (members.length === 0) return;
    const headers = ['Member Number', 'Full Name', 'Address', 'Phone Number', 'Email', 'Type', 'EXCO Designation', 'Status', 'Joined Date'];
    const rows = members.map(m => [
      m.memberNumber,
      `"${m.fullName}"`,
      `"${m.address}"`,
      m.phoneNumber,
      m.email || '',
      m.memberType,
      m.excoDesignation || '',
      m.status,
      m.joinedDate || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arc_members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PortalLayout currentModule="members" title="މެންބަރުންގެ ލިސްޓް (Members Management)">
      <div className="space-y-6" dir="rtl">
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-orange-500" />
              މެންބަރުންގެ މޮޑިއުލް (Members Module)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              ކްލަބްގެ އެންމެހައި މެންބަރުންގެ މަޢުލޫމާތާއި، އެކްސްކޯ މެންބަރުން ބެލެހެއްޓުން.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              CSV އެކްސްޕޯޓް
            </button>
            {canCreate && (
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-orange-600/20"
              >
                <Plus className="w-4 h-4" />
                އައު މެންބަރަކު އިތުރުކުރައްވާ
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            <input
              type="text"
              placeholder="ނަމުން، މެންބަރު ނަންބަރާއި ފޯނު ނަންބަރުން ހޯއްދަވާ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="all">ހުރިހާ މެންބަރުންގެ ބާވަތް (All Types)</option>
              <option value="standard">އާންމު މެންބަރުން (Standard)</option>
              <option value="exco">އެކްސްކޯ މެންބަރުން (EXCO)</option>
            </select>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="all">ހުރިހާ ސްޓޭޓަސްއެއް (All Statuses)</option>
              <option value="active">އެކްޓިވް (Active)</option>
              <option value="inactive">އިންއެކްޓިވް (Inactive)</option>
            </select>
          </div>
        </div>

        {/* Member Cards / Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-slate-800">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">އެކަށީގެންވާ މެންބަރަކު ނުފެނުނު.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div
                key={member.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition group shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">
                        {member.memberNumber}
                      </span>
                      <h3 className="text-lg font-bold text-white mt-2 group-hover:text-orange-400 transition">
                        {member.fullName}
                      </h3>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          member.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {member.status === 'active' ? 'އެކްޓިވް' : 'އިންއެކްޓިވް'}
                      </span>
                      {member.memberType === 'exco' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-semibold mt-1">
                          {member.excoDesignation || 'EXCO'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-300 border-t border-slate-800/80 pt-3 mt-2">
                    {member.idCardNumber && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="font-mono text-xs font-bold text-orange-400">އައިޑީ ކާޑު: {member.idCardNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{member.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span dir="ltr">{member.phoneNumber}</span>
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span dir="ltr" className="truncate text-slate-400">{member.email}</span>
                      </div>
                    )}
                    {member.joinedDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>ގުޅުނު ތާރީޚު: {formatDate(member.joinedDate || member.createdAt)}</span>
                      </div>
                    )}
                    {member.membershipFeeStartDate && (
                      <div className="flex items-center gap-2 text-xs text-orange-400/90 font-medium">
                        <CalendarClock className="w-3.5 h-3.5 text-orange-500" />
                        <span>ފީ ފެށޭ ތާރީޚު: {formatDate(member.membershipFeeStartDate)}</span>
                      </div>
                    )}
                    {member.status === 'inactive' && member.deactivationDate && (
                      <div className="flex items-center gap-2 text-xs text-rose-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>ބާތިލުކުރި ތާރީޚު: {formatDate(member.deactivationDate)}</span>
                      </div>
                    )}
                    {(Number(member.creditBalance) > 0) && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md text-xs font-semibold text-emerald-400">
                        <Coins className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ކެރީ ފޯވާޑް ބާކީ: {member.creditBalance} MVR</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-3 mt-4">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEditModal(member)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition text-xs flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      އުނިއިތުރު
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(member)}
                      disabled={deletingId === member.id}
                      className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ފޮހެލާ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add/Edit Member */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-orange-500" />
                  {editingMember ? 'މެންބަރުގެ މަޢުލޫމާތު ބަދަލުކުރުން' : 'އައު މެންބަރަކު އިތުރުކުރުން'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      މެންބަރު ނަންބަރު (Member Number)
                    </label>
                    <input
                      type="text"
                      value={formData.memberNumber}
                      onChange={e => setFormData({ ...formData, memberNumber: e.target.value })}
                      placeholder="ARC-M-001"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      މެންބަރުގެ ބާވަތް (Member Type)
                    </label>
                    <select
                      value={formData.memberType}
                      onChange={e => setFormData({ ...formData, memberType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="standard">އާންމު މެންބަރު (Standard)</option>
                      <option value="exco">އެކްސްކޯ މެންބަރު (EXCO)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ފުރިހަމަ ނަން (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="މުޙައްމަދު އިބްރާހީމް"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ޤައުމީ އައިޑީ ކާޑު ނަންބަރު (ID Card Number / NIN)
                  </label>
                  <input
                    type="text"
                    value={formData.idCardNumber}
                    onChange={e => setFormData({ ...formData, idCardNumber: e.target.value.toUpperCase() })}
                    placeholder="A123456"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500 font-mono uppercase"
                  />
                </div>

                {formData.memberType === 'exco' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      އެކްސްކޯ މަޤާމު (EXCO Designation)
                    </label>
                    <input
                      type="text"
                      value={formData.excoDesignation}
                      onChange={e => setFormData({ ...formData, excoDesignation: e.target.value })}
                      placeholder="ރައީސް / ނައިބު ރައީސް / ސެކްރެޓަރީ"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    އެޑްރެސް (Address) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="ހ. ސަންރައިޒް، މާލެ"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ފޯނު ނަންބަރު (Phone Number) *
                    </label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={formData.phoneNumber}
                      onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+960 7771001"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      އީމެއިލް (Email)
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@arc.mv"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ސްޓޭޓަސް (Status)
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => {
                        const nextStatus = e.target.value as any;
                        setFormData({
                          ...formData,
                          status: nextStatus,
                          deactivationDate: nextStatus === 'inactive' ? (formData.deactivationDate || new Date().toISOString().split('T')[0]) : ''
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    >
                      <option value="active">އެކްޓިވް (Active)</option>
                      <option value="inactive">އިންއެކްޓިވް (Inactive)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ގުޅުނު ތާރީޚު (Joined Date)
                    </label>
                    <input
                      type="date"
                      value={formData.joinedDate}
                      onChange={e => setFormData({ ...formData, joinedDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Membership Fee & Auto-Billing Settings */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-orange-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                    <CalendarClock className="w-4 h-4 text-orange-500" />
                    <span>މެންބަރޝިޕް ފީ އަދި ޖޫރިމަނާ ބެލެހެއްޓުން (Fee & Auto-Fine Schedule)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ފީ ދައްކަން ފަށާ ތާރީޚު (Fee Start Date) *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.membershipFeeStartDate}
                        onChange={e => setFormData({ ...formData, membershipFeeStartDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        މި ތާރީޚުން ފެށިގެން މި މެންބަރަށް މަހީ ފީ އަދި ޖޫރިމަނާ އޮޓޯއިން ހިސާބުކުރެވޭނެ.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                        <span>ކެރީ ފޯވާޑް ބާކީ (Credit Balance)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">MVR</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.creditBalance}
                        onChange={e => setFormData({ ...formData, creditBalance: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        އިތުރަށް ދައްކާފައިވާ ބާކީ، ކުރިއަށް އޮތް މަސްތަކަށް އޮޓޯއިން ކެނޑޭނެ.
                      </p>
                    </div>
                  </div>

                  {formData.status === 'inactive' && (
                    <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>މެންބަރުކަން ބާތިލުކުރާ ތާރީޚު ކަނޑައެޅުން (Deactivation Period)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            ބާތިލުކުރި ތާރީޚު (Deactivation Date)
                          </label>
                          <input
                            type="date"
                            value={formData.deactivationDate}
                            onChange={e => setFormData({ ...formData, deactivationDate: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-rose-900/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            މި ތާރީޚުން ފެށިގެން މި މެންބަރަށް އިތުރު ފީއެއް އަދި ޖޫރިމަނާއެއް ނުހިނގާނެ.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            ބާތިލުކުރި ސަބަބު (Reason)
                          </label>
                          <input
                            type="text"
                            value={formData.deactivationReason}
                            onChange={e => setFormData({ ...formData, deactivationReason: e.target.value })}
                            placeholder="މެންބަރު އެދިގެން / ރަށުން ބޭރަށް ބަދަލުވުން"
                            className="w-full px-3 py-2 bg-slate-900 border border-rose-900/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition"
                  >
                    ކެންސަލް
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {editingMember ? 'ރައްކާކުރައްވާ' : 'މެންބަރު އިތުރުކުރައްވާ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Member Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          onConfirm={handleConfirmDeleteMember}
          title="މެންބަރު ޑިލީޓް ކުރުން (Delete Club Member)"
          message={`މެންބަރު ${memberToDelete?.fullName || ''} (ނަންބަރު: ${memberToDelete?.memberNumber || ''}) ގެ މަޢުލޫމާތު ފޮހެލަން ކަށަވަރު ކުރައްވާ. މި މެންބަރު ފޮހެލުމުން ހާޟިރީ އާއި ރެކޯޑުތަކަށް އަސަރުކުރާނެއެވެ.`}
          confirmText="މެންބަރު ފޮހެލާ (Delete Member)"
          cancelText="ކެންސަލް (Cancel)"
          isDanger={true}
        />
      </div>
    </PortalLayout>
  );
};
