import React, { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { InboxMessage, AppNotification, MessageActionRecord } from '../../types';
import {
  Inbox,
  Bell,
  Search,
  CheckCircle2,
  Trash2,
  Mail,
  MailOpen,
  MessageSquare,
  Clock,
  RefreshCw,
  Phone,
  PhoneCall,
  Users,
  Check,
  Calendar,
  AlertCircle,
  FileText,
  User as UserIcon,
  Send,
  HelpCircle,
  ExternalLink,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved' | 'archived'>('all');
  const [loading, setLoading] = useState(true);

  // Data state
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  // Selection & Search
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Log Action Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionTitle, setActionTitle] = useState('');
  const [replyMethod, setReplyMethod] = useState<'mail' | 'call' | 'message' | 'meeting' | 'other'>('mail');
  const [replyDetails, setReplyDetails] = useState('');
  const [actionStatusUpdate, setActionStatusUpdate] = useState<'resolved' | 'in_progress' | 'pending'>('resolved');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [msgRes, notifRes] = await Promise.all([
        api.getMessages(),
        api.getNotifications()
      ]);

      const fetchedMsgs: InboxMessage[] = msgRes.inbox || msgRes.messages || [];
      setMessages(fetchedMsgs);
      setUnreadCount(msgRes.unreadCount || 0);

      setNotifications(notifRes.notifications || []);
      setNotifUnreadCount(notifRes.unreadCount || 0);

      // Auto-select first message if available
      if (fetchedMsgs.length > 0) {
        setSelectedMessage(prev => {
          if (!prev) return fetchedMsgs[0];
          const found = fetchedMsgs.find(m => m.id === prev.id);
          return found || fetchedMsgs[0];
        });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load public contact messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time table sync for inbox messages, contact messages, and app notifications
  useTableSync(['inboxMessages', 'contactMessages', 'appNotifications', 'contacts'], () => {
    fetchData();
  });

  const handleSelectMessage = async (msg: InboxMessage) => {
    setSelectedMessage(msg);
    // Mark read if unread by current user
    if (user && !msg.readBy?.includes(user.id)) {
      try {
        await api.markMessageRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, readBy: [...(m.readBy || []), user.id] } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
  };

  const handleUpdateStatus = async (msgId: string, newStatus: 'pending' | 'in_progress' | 'resolved' | 'archived') => {
    try {
      const updated = await api.updateMessageStatus(msgId, newStatus);
      showToast('success', `Message status updated to ${newStatus.replace('_', ' ')}.`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: newStatus } : m));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update message status.');
    }
  };

  const handleOpenActionModal = (msg: InboxMessage) => {
    setSelectedMessage(msg);
    setActionTitle(`Replied to ${msg.senderName}`);
    setReplyMethod(msg.contactInfo?.includes('@') ? 'mail' : 'call');
    setReplyDetails('');
    setActionStatusUpdate('resolved');
    setActionModalOpen(true);
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;
    if (!replyDetails.trim()) {
      showToast('error', 'Please enter action details or reply text.');
      return;
    }

    try {
      setActionLoading(true);
      const updatedMsg = await api.recordMessageAction(selectedMessage.id, {
        actionTaken: actionTitle || `Action via ${replyMethod}`,
        replyMethod,
        replyDetails: replyDetails.trim(),
        status: actionStatusUpdate
      });

      showToast('success', 'Action record saved successfully!');
      setActionModalOpen(false);

      // Update state
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? updatedMsg : m));
      setSelectedMessage(updatedMsg);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to record action.');
    } finally {
      setActionLoading(false);
    }
  };

  const isAdmin = user && (user.roleName === 'Admin' || user.roleId === 'role_admin' || user.roleName?.toLowerCase().includes('admin'));

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message from inbox?')) return;
    try {
      await api.deleteMessage(msgId);
      showToast('success', 'Message deleted successfully.');
      setMessages(prev => prev.filter(m => m.id !== msgId));
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(null);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete message.');
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      showToast('success', 'All notifications marked as read.');
      setNotifications(prev => prev.map(n => ({ ...n, readBy: user ? [...(n.readBy || []), user.id] : n.readBy })));
      setNotifUnreadCount(0);
    } catch (err: any) {
      showToast('error', 'Failed to update notifications.');
    }
  };

  // Helper filters
  const filteredMessages = messages.filter(m => {
    const matchesSearch =
      searchQuery === '' ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.contactInfo && m.contactInfo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = messages.filter(m => m.status === 'pending' || !m.status).length;
  const inProgressCount = messages.filter(m => m.status === 'in_progress').length;
  const resolvedCount = messages.filter(m => m.status === 'resolved').length;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>ނިމިފައި (Resolved)</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800 text-[10px] font-bold inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>އެކްޝަން ނެގެނީ (In Progress)</span>
          </span>
        );
      case 'archived':
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
            އާކައިވް (Archived)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>ނުބަލާ / އާ (Pending)</span>
          </span>
        );
    }
  };

  const getReplyMethodIcon = (method: string) => {
    switch (method) {
      case 'mail':
        return <Mail className="w-4 h-4 text-sky-400" />;
      case 'call':
        return <Phone className="w-4 h-4 text-emerald-400" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'meeting':
        return <Users className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getReplyMethodLabel = (method: string) => {
    switch (method) {
      case 'mail':
        return 'އީމެއިލް (Email)';
      case 'call':
        return 'ފޯނު ކޯލް (Phone Call)';
      case 'message':
        return 'ވައިބަރ / މެސެޖު (Viber / SMS)';
      case 'meeting':
        return 'ބައްދަލުވުން (Direct Meeting)';
      default:
        return 'އެހެނިހެން (Other Action)';
    }
  };

  return (
    <PortalLayout currentModule="messages" title="Public Contact Messages & Action Records / އާންމު މެސެޖުތަކާއި އެކްޝަން ރެކޯޑު">
      <div className="space-y-6">
        
        {/* Top Header Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Contact Messages</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-white">{messages.length}</span>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Inbox className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-slate-400">Pending Action / ނުބަލާ</p>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-slate-400">In Progress / އެކްޝަން ނެގެނީ</p>
              <p className="text-2xl font-bold font-mono text-sky-400 mt-1">{inProgressCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-slate-400">Action Resolved / ނިމިފައި</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{resolvedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Action Controls & Navigation Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'messages'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Public Contact Records (އާންމު މެސެޖުތައް)</span>
              {messages.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-orange-400 text-[10px] font-bold flex items-center justify-center">
                  {messages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'notifications'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>System Notifications (ނޯޓިފިކޭޝަން)</span>
              {notifUnreadCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                  {notifUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Action Refresh Button */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={fetchData}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
              <span>އާކޮށްލައްވާ (Refresh)</span>
            </button>
          </div>

        </div>

        {/* Filter Bar for Public Contact Messages */}
        {activeTab === 'messages' && (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search visitor name, contact info, subject, message..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Status
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <span>Pending ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  statusFilter === 'in_progress'
                    ? 'bg-sky-950/80 text-sky-300 border border-sky-800'
                    : 'text-slate-400 hover:text-sky-300'
                }`}
              >
                <span>In Progress ({inProgressCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('resolved')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  statusFilter === 'resolved'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <span>Resolved ({resolvedCount})</span>
              </button>
            </div>

          </div>
        )}

        {/* Main Content Area */}
        {activeTab === 'notifications' ? (
          
          /* Notifications Tab Content */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white font-heading">System Notifications History</h3>
                <p className="text-xs text-slate-400">Automated platform notifications & contact alerts</p>
              </div>
              {notifUnreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllNotifsRead}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-orange-400 font-semibold border border-slate-700 transition-colors"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <span>No notifications found.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map(notif => {
                  const isRead = user && (notif.readBy || []).includes(user.id);
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                        isRead
                          ? 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                          : 'bg-slate-800/80 border-purple-500/40 text-white shadow-md shadow-purple-500/5'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                        {notif.type === 'quiz' ? <HelpCircle className="w-5 h-5 text-orange-400" /> : <Bell className="w-5 h-5 text-purple-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white truncate">{notif.title}</h4>
                          <span className="text-[10px] text-slate-500 shrink-0">{formatDate(notif.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>

                        {notif.link && (
                          <a
                            href={notif.link}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:underline mt-2"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {!isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 mt-2 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : (

          /* Public Messages Split View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[540px]">
            
            {/* Left Column: Message List */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col h-full">
              
              <div className="px-3 py-2 border-b border-slate-800 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Contact Submissions ({filteredMessages.length})
                </span>
                <span className="text-[10px] text-slate-500">
                  Select to view & record action
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <span>No contact messages match your filter criteria.</span>
                  </div>
                ) : (
                  filteredMessages.map(msg => {
                    const isUnread = user && !(msg.readBy || []).includes(user.id);
                    const isSelected = selectedMessage?.id === msg.id;
                    const actionCount = msg.actions?.length || 0;

                    return (
                      <div
                        key={msg.id}
                        onClick={() => handleSelectMessage(msg)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-500/15 border-orange-500/50 shadow-md shadow-orange-500/10'
                            : isUnread
                            ? 'bg-slate-800/90 border-slate-700 text-white font-medium'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-orange-400 font-bold text-xs shrink-0">
                              {(msg.senderName || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-white block truncate">
                                {msg.senderName}
                              </span>
                              {msg.contactInfo && (
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  {msg.contactInfo}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {getStatusBadge(msg.status)}
                            {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                          </div>
                        </div>

                        <h4 className={`text-xs ${isUnread ? 'font-bold text-white' : 'font-semibold text-slate-200'} truncate mt-1`}>
                          {msg.subject}
                        </h4>

                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-sans leading-relaxed">
                          {msg.body}
                        </p>

                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 gap-2">
                          <span className="flex items-center gap-1 font-semibold text-slate-400">
                            <ShieldCheck className="w-3 h-3 text-orange-400" />
                            <span>{actionCount} Actions</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenActionModal(msg);
                              }}
                              className="px-2 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Record Action / Log Reply"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Action</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMessage(msg.id);
                                }}
                                className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-[10px] transition-all"
                                title="Delete Message from Inbox"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Right Column: Message Detail & Action History */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              {selectedMessage ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  
                  {/* Visitor Contact Card Header */}
                  <div className="pb-4 border-b border-slate-800 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block mb-1">
                          Public Web Contact Message
                        </span>
                        <h2 className="text-lg font-bold font-heading text-white leading-tight">
                          {selectedMessage.subject}
                        </h2>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(selectedMessage.status)}
                        <button
                          type="button"
                          onClick={() => setSelectedMessage(null)}
                          className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
                          title="Close / Hide Details"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Visitor Meta & Quick Dial Options */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-slate-300">
                          <UserIcon className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="text-slate-500 font-medium">Visitor Name: </span>
                          <strong className="text-white font-bold">{selectedMessage.senderName}</strong>
                        </p>

                        {selectedMessage.contactInfo && (
                          <p className="flex items-center gap-2 text-slate-300 font-mono">
                            <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="text-slate-500 font-sans font-medium">Contact: </span>
                            <span className="text-sky-300 font-bold">{selectedMessage.contactInfo}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Quick Mail or Phone Buttons */}
                        {selectedMessage.contactInfo?.includes('@') && (
                          <a
                            href={`mailto:${selectedMessage.contactInfo.split('/')[0].trim()}`}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email Visitor</span>
                          </a>
                        )}

                        {selectedMessage.contactInfo && (
                          <a
                            href={`tel:${selectedMessage.contactInfo.replace(/[^\d+]/g, '')}`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call Phone</span>
                          </a>
                        )}

                        {/* Quick Status Picker */}
                        <select
                          value={selectedMessage.status || 'pending'}
                          onChange={e => handleUpdateStatus(selectedMessage.id, e.target.value as any)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          <option value="pending">Pending (ނުބަލާ)</option>
                          <option value="in_progress">In Progress (އެކްޝަން ނެގެނީ)</option>
                          <option value="resolved">Resolved (ނިމިފައި)</option>
                          <option value="archived">Archived (އާކައިވް)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Message Body Display */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Submitted Message Content (މެސެޖުގެ ތަފްޞީލު)
                    </span>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-[180px] overflow-y-auto custom-scrollbar">
                      {selectedMessage.body}
                    </div>
                  </div>

                  {/* ACTION RECORDS & REPLY HISTORY SECTION */}
                  <div className="flex-1 space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Action Records & Reply History (ވިދާޅުވި އެކްޝަންތައް)
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(selectedMessage)}
                        className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-orange-500/20"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Record Action / Log Reply</span>
                      </button>
                    </div>

                    {/* Action History List */}
                    {(!selectedMessage.actions || selectedMessage.actions.length === 0) ? (
                      <div className="bg-slate-950/30 rounded-xl border border-dashed border-slate-800 p-6 text-center space-y-2">
                        <Clock className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-xs font-semibold text-slate-400">No action records logged yet for this message.</p>
                        <p className="text-[11px] text-slate-500">
                          Click "Record Action / Log Reply" above to record phone call notes, email replies, or status updates.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                        {selectedMessage.actions.map(act => (
                          <div
                            key={act.id}
                            className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 transition-all hover:border-slate-700"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                                  {getReplyMethodIcon(act.replyMethod)}
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-white block">
                                    {act.actionTaken || 'Action Taken'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    Method: {getReplyMethodLabel(act.replyMethod)}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[11px] font-bold text-orange-400 block">
                                  {act.actionByName}
                                </span>
                                <span className="text-[10px] text-slate-500 block font-mono">
                                  {formatDate(act.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="bg-slate-900/90 p-2.5 rounded-lg text-xs text-slate-300 leading-relaxed font-sans border border-slate-800/80">
                              {act.replyDetails}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700/80 text-slate-400 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>Delete Message</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(selectedMessage)}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-md shadow-orange-500/20"
                    >
                      <Send className="w-4 h-4" />
                      <span>Record New Action</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
                  <MailOpen className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-semibold text-slate-400">No contact message selected</p>
                  <p className="text-xs text-slate-500 mt-1">Select a message from the list on the left to review visitor details and record actions.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* RECORD ACTION / LOG REPLY MODAL */}
      <Modal
        id="record_action_modal"
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title="Record Action & Reply Details / އެކްޝަން ރެކޯޑުކުރެއްވުން"
        description="Log details of reply sent to visitor via email, call, message, or meeting."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveAction} className="space-y-4 font-sans">
          
          {selectedMessage && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">
                <span className="font-semibold text-slate-300">Visitor: </span>
                <strong className="text-white">{selectedMessage.senderName}</strong> ({selectedMessage.contactInfo || 'No Contact Info'})
              </p>
              <p className="text-slate-400 truncate">
                <span className="font-semibold text-slate-300">Subject: </span>
                <span className="text-slate-200">{selectedMessage.subject}</span>
              </p>
            </div>
          )}

          {/* Action Method Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Reply / Action Method (ޖަވާބު ދެވުނު ގޮތް)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setReplyMethod('mail')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  replyMethod === 'mail'
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email (އީމެއިލް)</span>
              </button>

              <button
                type="button"
                onClick={() => setReplyMethod('call')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  replyMethod === 'call'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call (ފޯނު)</span>
              </button>

              <button
                type="button"
                onClick={() => setReplyMethod('message')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  replyMethod === 'message'
                    ? 'bg-purple-600 text-white border-purple-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message/Viber</span>
              </button>

              <button
                type="button"
                onClick={() => setReplyMethod('meeting')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  replyMethod === 'meeting'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Meeting</span>
              </button>

              <button
                type="button"
                onClick={() => setReplyMethod('other')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 sm:col-span-2 ${
                  replyMethod === 'other'
                    ? 'bg-orange-600 text-white border-orange-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Other Action (އެހެނިހެން)</span>
              </button>
            </div>
          </div>

          {/* Action Title Summary */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Action Title / Summary (އެކްޝަން ސުރުޚީ)</label>
            <input
              type="text"
              value={actionTitle}
              onChange={e => setActionTitle(e.target.value)}
              placeholder="e.g. Replied via Email with details"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* New Status Selection */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Update Message Status (ހާލަތު)</label>
            <select
              value={actionStatusUpdate}
              onChange={e => setActionStatusUpdate(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-bold"
            >
              <option value="resolved">Mark as Resolved / ނިމިފައި (Resolved)</option>
              <option value="in_progress">Keep In Progress / އެކްޝަން ނެގެނީ (In Progress)</option>
            </select>
          </div>

          {/* Action Reply Details Textarea */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Action & Reply Details (ތަފްޞީލު) <span className="text-orange-400">*</span></label>
            <textarea
              rows={4}
              value={replyDetails}
              onChange={e => setReplyDetails(e.target.value)}
              placeholder="Enter details of reply sent, answers provided, or phone conversation notes..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* Action By User Badge */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Action By User:</span>
            <strong className="text-orange-400 font-bold">{user?.fullName} ({user?.designation || user?.roleName})</strong>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActionModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{actionLoading ? 'Saving...' : 'Save Action Record'}</span>
            </button>
          </div>

        </form>
      </Modal>

    </PortalLayout>
  );
};

export default MessagesPage;
