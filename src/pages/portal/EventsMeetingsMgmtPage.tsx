import React, { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { ClubMember, EventItem, MeetingItem, AttendanceRecord, MeetingVotingItem } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  Award,
  Calendar,
  Users,
  CheckSquare,
  Vote,
  BarChart2,
  Plus,
  Search,
  Clock,
  MapPin,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Printer,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  Layers,
  UserCheck,
  Upload
} from 'lucide-react';

export const EventsMeetingsMgmtPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'events' | 'meetings' | 'reports'>('dashboard');
  const [reportsSubTab, setReportsSubTab] = useState<'members' | 'meetings' | 'events'>('members');

  // Core Data States
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');

  // Event Modal & Attendance Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    heldDate: new Date().toISOString().split('T')[0],
    startTime: '16:00',
    endTime: '18:00',
    venue: '',
    summary: '',
    description: '',
    eventType: 'community' as EventItem['eventType'],
    status: 'upcoming' as EventItem['status'],
    photoGalleryUrl: ''
  });

  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<EventItem | null>(null);
  const [eventAttendanceList, setEventAttendanceList] = useState<AttendanceRecord[]>([]);

  // Meeting Modal & Attendance Modal & Voting Modal
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [meetingFormData, setMeetingFormData] = useState({
    title: '',
    meetingType: 'general_members' as MeetingItem['meetingType'],
    heldDate: new Date().toISOString().split('T')[0],
    startTime: '20:00',
    endTime: '21:30',
    venue: '',
    summary: '',
    status: 'scheduled' as MeetingItem['status']
  });

  const [selectedMeetingForAttendance, setSelectedMeetingForAttendance] = useState<MeetingItem | null>(null);
  const [meetingAttendanceList, setMeetingAttendanceList] = useState<AttendanceRecord[]>([]);

  const [selectedMeetingForVoting, setSelectedMeetingForVoting] = useState<MeetingItem | null>(null);
  const [votingFormData, setVotingFormData] = useState({
    topic: '',
    description: '',
    status: 'open' as MeetingVotingItem['status'],
    inFavor: 0,
    against: 0,
    abstain: 0,
    finalizedAction: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasPermission('events_meetings', 'canCreate');
  const canEdit = hasPermission('events_meetings', 'canEdit');
  const canDelete = hasPermission('events_meetings', 'canDelete');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersData, eventsData, meetingsData, statsData] = await Promise.all([
        api.getMembers(),
        api.getEventItems(),
        api.getMeetingItems(),
        api.getEventsMeetingsStats()
      ]);
      setMembers(membersData);
      setEvents(eventsData);
      setMeetings(meetingsData);
      setStats(statsData);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch events & meetings data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time table sync for events, meetings, attendance, and voting tables
  useTableSync(['events', 'eventItems', 'meetingItems', 'members', 'clubMembers'], () => {
    fetchData();
  });

  // --- EVENT HANDLERS ---
  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setEventFormData({
      title: '',
      heldDate: new Date().toISOString().split('T')[0],
      startTime: '16:00',
      endTime: '18:00',
      venue: '',
      summary: '',
      description: '',
      eventType: 'community',
      status: 'upcoming',
      photoGalleryUrl: ''
    });
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt: EventItem) => {
    setEditingEvent(evt);
    setEventFormData({
      title: evt.title,
      heldDate: evt.heldDate,
      startTime: evt.startTime,
      endTime: evt.endTime,
      venue: evt.venue,
      summary: evt.summary || '',
      description: evt.description || '',
      eventType: evt.eventType,
      status: evt.status,
      photoGalleryUrl: (evt.photoGallery || []).join('\n')
    });
    setIsEventModalOpen(true);
  };

  const handleGalleryFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUrls: string[] = [];
    let processed = 0;

    (Array.from(files) as File[]).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          newUrls.push(evt.target.result as string);
        }
        processed++;
        if (processed === files.length) {
          setEventFormData(prev => {
            const current = prev.photoGalleryUrl ? prev.photoGalleryUrl.split('\n').filter(Boolean) : [];
            const combined = [...current, ...newUrls].join('\n');
            return { ...prev, photoGalleryUrl: combined };
          });
          showToast('success', `${newUrls.length} photo file(s) added to gallery`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryPhoto = (indexToRemove: number) => {
    setEventFormData(prev => {
      const current = prev.photoGalleryUrl ? prev.photoGalleryUrl.split('\n').filter(Boolean) : [];
      const updated = current.filter((_, idx) => idx !== indexToRemove).join('\n');
      return { ...prev, photoGalleryUrl: updated };
    });
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title.trim() || !eventFormData.heldDate || !eventFormData.venue.trim()) {
      showToast('error', 'Event title, date, and venue are required.');
      return;
    }

    setSubmitting(true);
    try {
      const gallery = eventFormData.photoGalleryUrl
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        ...eventFormData,
        photoGallery: gallery
      };

      if (editingEvent) {
        await api.updateEventItem(editingEvent.id, payload);
        showToast('success', 'Event updated successfully.');
      } else {
        await api.createEventItem(payload);
        showToast('success', 'Event created successfully.');
      }
      setIsEventModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteEventItem(id);
      showToast('success', 'Event deleted.');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete event.');
    }
  };

  // Event Attendance Handler
  const handleOpenEventAttendance = (evt: EventItem) => {
    setSelectedEventForAttendance(evt);
    const existingMap = new Map((evt.attendance || []).map(a => [a.memberId, a]));

    // Build attendance list from all active members
    const activeMembers = members.filter(m => m.status === 'active');
    const initialList: AttendanceRecord[] = activeMembers.map(m => {
      const existing = existingMap.get(m.id);
      return {
        memberId: m.id,
        memberName: m.fullName,
        memberNumber: m.memberNumber,
        status: existing ? existing.status : 'present',
        notes: existing ? existing.notes || '' : ''
      };
    });

    setEventAttendanceList(initialList);
  };

  const handleSaveEventAttendance = async () => {
    if (!selectedEventForAttendance) return;
    const missingReason = eventAttendanceList.find(a => a.status === 'excused' && (!a.notes || !a.notes.trim()));
    if (missingReason) {
      showToast('error', `ސަލާމުގައިވާ މެންބަރު (${missingReason.memberName}) ގެ ސަބަބު (Reason for leave) ލިޔުއްވަންވާނެއެވެ.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.saveEventAttendance(selectedEventForAttendance.id, eventAttendanceList);
      showToast('success', 'Event attendance saved successfully.');
      setSelectedEventForAttendance(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- MEETING HANDLERS ---
  const handleOpenAddMeeting = () => {
    setEditingMeeting(null);
    setMeetingFormData({
      title: '',
      meetingType: 'general_members',
      heldDate: new Date().toISOString().split('T')[0],
      startTime: '20:00',
      endTime: '21:30',
      venue: 'ARC Headquarters Meeting Hall',
      summary: '',
      status: 'scheduled'
    });
    setIsMeetingModalOpen(true);
  };

  const handleOpenEditMeeting = (mtg: MeetingItem) => {
    setEditingMeeting(mtg);
    setMeetingFormData({
      title: mtg.title,
      meetingType: mtg.meetingType,
      heldDate: mtg.heldDate,
      startTime: mtg.startTime,
      endTime: mtg.endTime,
      venue: mtg.venue,
      summary: mtg.summary || '',
      status: mtg.status
    });
    setIsMeetingModalOpen(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingFormData.title.trim() || !meetingFormData.heldDate || !meetingFormData.venue.trim()) {
      showToast('error', 'Meeting title, date, and venue are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMeeting) {
        await api.updateMeetingItem(editingMeeting.id, meetingFormData);
        showToast('success', 'Meeting updated successfully.');
      } else {
        await api.createMeetingItem(meetingFormData);
        showToast('success', 'Meeting created successfully.');
      }
      setIsMeetingModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await api.deleteMeetingItem(id);
      showToast('success', 'Meeting deleted.');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete meeting.');
    }
  };

  // Conditional Meeting Attendance Handler
  const handleOpenMeetingAttendance = (mtg: MeetingItem) => {
    setSelectedMeetingForAttendance(mtg);
    const existingMap = new Map((mtg.attendance || []).map(a => [a.memberId, a]));

    // CONDITIONAL ATTENDANCE FILTER REQUIREMENT:
    // If meetingType === 'exco' -> show ONLY EXCO members!
    // If meetingType === 'general_members' -> show ALL active members!
    const targetMembers = members.filter(m => {
      if (m.status !== 'active') return false;
      if (mtg.meetingType === 'exco') {
        return m.memberType === 'exco';
      }
      return true;
    });

    const initialList: AttendanceRecord[] = targetMembers.map(m => {
      const existing = existingMap.get(m.id);
      return {
        memberId: m.id,
        memberName: m.fullName,
        memberNumber: m.memberNumber,
        status: existing ? existing.status : 'present',
        notes: existing ? existing.notes || '' : ''
      };
    });

    setMeetingAttendanceList(initialList);
  };

  const handleSaveMeetingAttendance = async () => {
    if (!selectedMeetingForAttendance) return;
    const missingReason = meetingAttendanceList.find(a => a.status === 'excused' && (!a.notes || !a.notes.trim()));
    if (missingReason) {
      showToast('error', `ސަލާމުގައިވާ މެންބަރު (${missingReason.memberName}) ގެ ސަބަބު (Reason for leave) ލިޔުއްވަންވާނެއެވެ.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.saveMeetingAttendance(selectedMeetingForAttendance.id, meetingAttendanceList);
      showToast('success', 'Meeting attendance updated.');
      setSelectedMeetingForAttendance(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  // Voting Handlers
  const handleOpenVotingModal = (mtg: MeetingItem) => {
    setSelectedMeetingForVoting(mtg);
    setVotingFormData({
      topic: '',
      description: '',
      status: 'open',
      inFavor: 0,
      against: 0,
      abstain: 0,
      finalizedAction: ''
    });
  };

  const handleSaveVoting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeetingForVoting || !votingFormData.topic.trim()) {
      showToast('error', 'Voting topic is required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.addMeetingVoting(selectedMeetingForVoting.id, {
        topic: votingFormData.topic,
        description: votingFormData.description,
        status: votingFormData.status,
        votes: {
          inFavor: Number(votingFormData.inFavor),
          against: Number(votingFormData.against),
          abstain: Number(votingFormData.abstain)
        },
        finalizedAction: votingFormData.finalizedAction
      });
      showToast('success', 'Voting item added.');
      setSelectedMeetingForVoting(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save voting item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Report Calculation Logic
  const getMemberPerformanceReport = () => {
    return members.map(m => {
      let totalEligibleEvents = 0;
      let totalAttendedEvents = 0;

      events.forEach(e => {
        const record = (e.attendance || []).find(a => a.memberId === m.id);
        if (record) {
          totalEligibleEvents++;
          if (record.status === 'present') totalAttendedEvents++;
        }
      });

      let totalEligibleMeetings = 0;
      let totalAttendedMeetings = 0;

      meetings.forEach(mtg => {
        if (mtg.meetingType === 'exco' && m.memberType !== 'exco') return;
        const record = (mtg.attendance || []).find(a => a.memberId === m.id);
        if (record) {
          totalEligibleMeetings++;
          if (record.status === 'present') totalAttendedMeetings++;
        }
      });

      const totalEligible = totalEligibleEvents + totalEligibleMeetings;
      const totalAttended = totalAttendedEvents + totalAttendedMeetings;
      const rate = totalEligible > 0 ? Math.round((totalAttended / totalEligible) * 100) : 100;

      let grade = 'Excellent';
      if (rate < 50) grade = 'Low';
      else if (rate < 75) grade = 'Regular';
      else if (rate < 90) grade = 'Good';

      return {
        member: m,
        totalEligibleEvents,
        totalAttendedEvents,
        totalEligibleMeetings,
        totalAttendedMeetings,
        totalEligible,
        totalAttended,
        rate,
        grade
      };
    });
  };

  return (
    <PortalLayout currentModule="events_meetings" title="ޙަރަކާތްތަކާއި ބައްދަލުވުން (Events & Meetings)">
      <div className="space-y-6" dir="rtl">
        {/* Module Header & Tab Navigation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Award className="w-7 h-7 text-orange-500" />
                ޙަރަކާތްތަކާއި ބައްދަލުވުންތަކުގެ މޮޑިއުލް
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                މެންބަރުންގެ ޙަރަކާތްތައް، އެކްސްކޯ އަދި އާންމު ބައްދަލުވުންތައް، ވޯޓިންގ ސިސްޓަމް އަދި ޕާފޯމަންސް ރިޕޯޓް.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canCreate && (
                <>
                  <button
                    onClick={handleOpenAddEvent}
                    className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-orange-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    އައު ޙަރަކާތެއް
                  </button>
                  <button
                    onClick={handleOpenAddMeeting}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-amber-600/20"
                  >
                    <Calendar className="w-4 h-4" />
                    އައު ބައްދަލުވުމެއް
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              ޑޭޝްބޯޑު (Dashboard)
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'events'
                  ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Award className="w-4 h-4" />
              މެންބަރުންގެ ޙަރަކާތްތައް ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'meetings'
                  ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Vote className="w-4 h-4" />
              ބައްދަލުވުންތައް ({meetings.length})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              ރިޕޯޓް އަދި އެނަލިސިސް
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD IN FIRST TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">ޖުމްލަ ޙަރަކާތްތައް</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats?.totalEvents || events.length}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">ނިމުނު އަދި ކުރިއަށްހުރި</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">ޖުމްލަ ބައްދަލުވުންތައް</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats?.totalMeetings || meetings.length}</h3>
                  <p className="text-xs text-amber-400/80 mt-0.5">އެކްސްކޯ: {stats?.excoMeetings || 0}</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">މެންބަރުންގެ ޙާޟިރީ ރޭޓް</p>
                  <h3 className="text-2xl font-bold text-emerald-400 mt-1">{stats?.overallAttendanceRate || 95}%</h3>
                  <p className="text-xs text-emerald-500/80 mt-0.5">އާންމު އެވަރެޖް</p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">ކްލަބް މެންބަރުން</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats?.totalMembers || members.length}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">އެކްސްކޯ: {stats?.activeExcoMembers || 0}</p>
                </div>
              </div>
            </div>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Upcoming Events & Meetings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent / Upcoming Events Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-orange-500" />
                      އެންމެ ފަހުގެ ޙަރަކާތްތައް
                    </h3>
                    <button
                      onClick={() => setActiveTab('events')}
                      className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
                    >
                      ހުރިހާ ޙަރަކާތެއް ބައްލަވާ
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {events.slice(0, 3).map(evt => (
                      <div key={evt.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                        <div>
                          <span className="text-xs text-orange-400 font-mono">{formatDate(evt.heldDate)} ({evt.startTime} - {evt.endTime})</span>
                          <h4 className="text-base font-bold text-white mt-1">{evt.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{evt.summary}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.venue}</span>
                            <span>•</span>
                            <span className="text-emerald-400">ޙާޟިރީ: {evt.attendance?.length || 0} މެންބަރުން</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg whitespace-nowrap">
                          {evt.status === 'completed' ? 'ނިމިފައި' : 'ކުރިއަށްއޮތީ'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Meetings Card */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Vote className="w-5 h-5 text-amber-500" />
                      އެންމެ ފަހުގެ ބައްދަލުވުންތައް
                    </h3>
                    <button
                      onClick={() => setActiveTab('meetings')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                    >
                      ހުރިހާ ބައްދަލުވުމެއް
                      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {meetings.slice(0, 3).map(mtg => (
                      <div key={mtg.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              mtg.meetingType === 'exco'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {mtg.meetingType === 'exco' ? 'އެކްސްކޯ ބައްދަލުވުން' : 'އާންމު މެންބަރުންގެ ބައްދަލުވުން'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{formatDate(mtg.heldDate)}</span>
                          </div>
                          <h4 className="text-base font-bold text-white mt-1.5">{mtg.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{mtg.summary}</p>
                        </div>
                        <button
                          onClick={() => handleOpenMeetingAttendance(mtg)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition shrink-0"
                        >
                          ޙާޟިރީ ފާހަގަކުރައްވާ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Finalized Decisions & Resolutions Feed */}
              <div className="space-y-6">
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ނިންމާފައިވާ ނިންމުންތައް (Finalized Actions)
                  </h3>

                  <div className="space-y-3">
                    {stats?.recentFinalizedActions && stats.recentFinalizedActions.length > 0 ? (
                      stats.recentFinalizedActions.map((act: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-xs space-y-1">
                          <p className="text-slate-400 font-semibold">{act.meetingTitle} ({act.date})</p>
                          <p className="text-emerald-300 font-medium">{act.action}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 py-4 text-center">އެއްވެސް ނިންމުމެއް ފާހަގަކުރެވިފައެއް ނެތް.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS EVENTS (މެންބަރުންގެ ޙަރަކާތްތައް) */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(evt => (
                <div key={evt.id} className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col justify-between transition group shadow-xl">
                  <div>
                    {evt.photoGallery && evt.photoGallery.length > 0 ? (
                      <img
                        src={evt.photoGallery[0]}
                        alt={evt.title}
                        className="w-full h-44 object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-36 bg-slate-800 flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full font-medium">
                          {evt.eventType}
                        </span>
                        <span className="text-slate-400 font-mono">{formatDate(evt.heldDate)}</span>
                      </div>

                      <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition">{evt.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{evt.summary}</p>

                      <div className="space-y-1 text-xs text-slate-400 border-t border-slate-800 pt-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{evt.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{evt.startTime} - {evt.endTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between gap-2 border-t border-slate-800/80 mt-2">
                    <button
                      onClick={() => handleOpenEventAttendance(evt)}
                      className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      ޙާޟިރީ ({evt.attendance?.length || 0})
                    </button>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEditEvent(evt)}
                          className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEETINGS & EXCO MEETINGS (ބައްދަލުވުންތައް) */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <div className="space-y-4">
              {meetings.map(mtg => (
                <div key={mtg.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          mtg.meetingType === 'exco'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}>
                          {mtg.meetingType === 'exco' ? 'އެކްސްކޯ ބައްދަލުވުން (EXCO Only)' : 'އާންމު މެންބަރުންގެ ބައްދަލުވުން (All Members)'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{formatDate(mtg.heldDate)} ({mtg.startTime} - {mtg.endTime})</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mt-2">{mtg.title}</h3>
                      <p className="text-sm text-slate-300 mt-1">{mtg.summary}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenMeetingAttendance(mtg)}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        ޙާޟިރީ މާކުކުރައްވާ ({mtg.attendance?.length || 0})
                      </button>
                      <button
                        onClick={() => handleOpenVotingModal(mtg)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-2"
                      >
                        <Vote className="w-4 h-4 text-amber-400" />
                        ވޯޓިންގ އިތުރުކުރައްވާ
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteMeeting(mtg.id)}
                          className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Votings & Resolutions List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <Vote className="w-4 h-4 text-amber-500" />
                      ވޯޓަށް އެހުނު ކަންކަމާއި ނިންމުންތައް (Votings & Finalized Plan)
                    </h4>

                    {mtg.votings && mtg.votings.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {mtg.votings.map(vote => (
                          <div key={vote.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-white text-sm">{vote.topic}</h5>
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                                {vote.status}
                              </span>
                            </div>
                            <p className="text-slate-400">{vote.description}</p>
                            
                            <div className="flex items-center gap-3 pt-2 text-slate-300 font-mono">
                              <span className="text-emerald-400">ފާސްވީ: {vote.votes.inFavor}</span>
                              <span className="text-rose-400">ދެކޮޅު: {vote.votes.against}</span>
                              <span className="text-slate-400">ވަކިކޮޅަކަށް ނުޖެހޭ: {vote.votes.abstain}</span>
                            </div>

                            {vote.finalizedAction && (
                              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 font-medium mt-2">
                                <strong>ނިންމުން/އެކްޝަން ޕްލޭން:</strong> {vote.finalizedAction}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">މި ބައްދަލުވުމުގައި ވޯޓަށް އެހުނު ކަމެއް އަދި ނެތް.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS & PERFORMANCE ANALYSIS (ރިޕޯޓް އަދި އެނަލިސިސް) */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Reports Sub-Tab Navigation */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setReportsSubTab('members')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${
                    reportsSubTab === 'members'
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>މެންބަރުންގެ ޕާފޯމަންސް (Members Performance)</span>
                </button>

                <button
                  onClick={() => setReportsSubTab('meetings')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${
                    reportsSubTab === 'meetings'
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Vote className="w-4 h-4" />
                  <span>ބައްދަލުވުންތަކުގެ ރިޕޯޓް (Meetings Report)</span>
                </button>

                <button
                  onClick={() => setReportsSubTab('events')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition whitespace-nowrap ${
                    reportsSubTab === 'events'
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>ޙަރަކާތްތަކުގެ ރިޕޯޓް (Events Report)</span>
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>ރިޕޯޓް ޕްރިންޓްކުރައްވާ</span>
              </button>
            </div>

            {/* SUB TAB 1: MEMBERS PERFORMANCE RECORDS */}
            {reportsSubTab === 'members' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-orange-500" />
                    މެންބަރުންގެ ޕާފޯމަންސް ރިޕޯޓް (Members Performance Records)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ކްލަބްގެ ކޮންމެ މެންބަރެއްގެ ޙަރަކާތްތަކާއި ބައްދަލުވުންތަކުގައި ބައިވެރިވި މިންވަރުގެ ތަފްސީލު.
                  </p>
                </div>

                {/* Performance Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs font-bold uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-3">މެންބަރު ނަންބަރު</th>
                        <th className="p-3">މެންބަރުގެ ނަން</th>
                        <th className="p-3">ބާވަތް</th>
                        <th className="p-3">ޙަރަކާތްތައް (Attended/Total)</th>
                        <th className="p-3">ބައްދަލުވުންތައް (Attended/Total)</th>
                        <th className="p-3">ޖުމްލަ ޙާޟިރީ %</th>
                        <th className="p-3">ޕާފޯމަންސް</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {getMemberPerformanceReport().map(row => (
                        <tr key={row.member.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-orange-400">{row.member.memberNumber}</td>
                          <td className="p-3 font-bold text-white">{row.member.fullName}</td>
                          <td className="p-3">
                            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-medium">
                              {row.member.memberType}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {row.totalAttendedEvents} / {row.totalEligibleEvents}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {row.totalAttendedMeetings} / {row.totalEligibleMeetings}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {row.rate}%
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              row.grade === 'Excellent'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : row.grade === 'Good'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : row.grade === 'Regular'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {row.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB TAB 2: MEETINGS REPORT */}
            {reportsSubTab === 'meetings' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Vote className="w-6 h-6 text-amber-500" />
                    ބައްދަލުވުންތަކުގެ ރިޕޯޓް (Meetings Report)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ބޭއްވުނު ބައްދަލުވުންތަކުގެ ޙާޟިރީގެ ޚުލާޞާ، ސަލާމް ބުނި މެންބަރުންގެ ސަބަބުތައް އަދި ފާސްވި ނިންމުންތައް.
                  </p>
                </div>

                {/* Meetings Summary Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">ޖުމްލަ ބައްދަލުވުންތައް</span>
                    <h4 className="text-2xl font-bold text-white mt-1">{meetings.length}</h4>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">އެކްސްކޯ ބައްދަލުވުންތައް</span>
                    <h4 className="text-2xl font-bold text-amber-400 mt-1">
                      {meetings.filter(m => m.meetingType === 'exco').length}
                    </h4>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">އާންމު ބައްދަލުވުންތައް</span>
                    <h4 className="text-2xl font-bold text-sky-400 mt-1">
                      {meetings.filter(m => m.meetingType === 'general_members').length}
                    </h4>
                  </div>
                </div>

                {/* Meetings Detailed List */}
                <div className="space-y-4">
                  {meetings.map(mtg => {
                    const att = mtg.attendance || [];
                    const present = att.filter(a => a.status === 'present');
                    const absent = att.filter(a => a.status === 'absent');
                    const excused = att.filter(a => a.status === 'excused');
                    const totalRecorded = att.length;
                    const attRate = totalRecorded > 0 ? Math.round((present.length / totalRecorded) * 100) : 0;

                    return (
                      <div key={mtg.id} className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold ${
                                mtg.meetingType === 'exco'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              }`}>
                                {mtg.meetingType === 'exco' ? 'EXCO Only' : 'All Members'}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">{formatDate(mtg.heldDate)}</span>
                            </div>
                            <h4 className="text-lg font-bold text-white mt-1">{mtg.title}</h4>
                            <p className="text-xs text-slate-400">{mtg.summary}</p>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div className="text-center">
                              <span className="block text-emerald-400 font-bold">{present.length}</span>
                              <span className="text-slate-500">ޙާޟިރު</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-rose-400 font-bold">{absent.length}</span>
                              <span className="text-slate-500">ހާޟިރުނުވެ</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-amber-400 font-bold">{excused.length}</span>
                              <span className="text-slate-500">ސަލާމުގައި</span>
                            </div>
                            <div className="text-center pr-3 border-r border-slate-800">
                              <span className="block text-orange-400 font-bold text-sm">{attRate}%</span>
                              <span className="text-slate-500">ޙާޟިރީ</span>
                            </div>
                          </div>
                        </div>

                        {/* Leave / Excused Reasons List */}
                        {excused.length > 0 && (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ސަލާމް ބުނި މެންބަރުންގެ ސަބަބުތައް (Reasons for Leave):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {excused.map(a => (
                                <div key={a.memberId} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                                  <strong className="text-white">{a.memberName}:</strong> {a.notes || 'ސަބަބެއް ލިޔެފައެއް ނެތް'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resolutions Passed */}
                        {mtg.votings && mtg.votings.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                              ފާސްވި ނިންމުންތަކާއި ވޯޓިންގ:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {mtg.votings.map(v => (
                                <div key={v.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 space-y-1">
                                  <div className="flex items-center justify-between font-bold text-white">
                                    <span>{v.topic}</span>
                                    <span className="text-[10px] text-emerald-400">ފާސްވީ ({v.votes.inFavor})</span>
                                  </div>
                                  {v.finalizedAction && (
                                    <p className="text-[11px] text-emerald-300/90 font-medium">
                                      • {v.finalizedAction}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB TAB 3: EVENTS REPORT */}
            {reportsSubTab === 'events' && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award className="w-6 h-6 text-orange-500" />
                    ޙަރަކާތްތަކުގެ ރިޕޯޓް (Events Report)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ހިންގުނު ޙަރަކާތްތަކާއި، ބައިވެރިވި މެންބަރުންގެ އަދަދު އަދި ޙާޟިރީގެ ޚުލާޞާ.
                  </p>
                </div>

                {/* Events Summary Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">ޖުމްލަ ޙަރަކާތްތައް</span>
                    <h4 className="text-2xl font-bold text-white mt-1">{events.length}</h4>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">ކުރިއަށްހުރި ޙަރަކާތްތައް</span>
                    <h4 className="text-2xl font-bold text-orange-400 mt-1">
                      {events.filter(e => e.status === 'upcoming').length}
                    </h4>
                  </div>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 font-medium">ނިމިފައިވާ ޙަރަކާތްތައް</span>
                    <h4 className="text-2xl font-bold text-emerald-400 mt-1">
                      {events.filter(e => e.status === 'completed').length}
                    </h4>
                  </div>
                </div>

                {/* Events Detailed List */}
                <div className="space-y-4">
                  {events.map(evt => {
                    const att = evt.attendance || [];
                    const present = att.filter(a => a.status === 'present');
                    const absent = att.filter(a => a.status === 'absent');
                    const excused = att.filter(a => a.status === 'excused');
                    const totalRecorded = att.length;
                    const attRate = totalRecorded > 0 ? Math.round((present.length / totalRecorded) * 100) : 0;
                    const photoCount = Array.isArray(evt.photoGallery) ? evt.photoGallery.length : 0;

                    return (
                      <div key={evt.id} className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] px-2.5 py-0.5 rounded font-bold ${
                                evt.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              }`}>
                                {evt.status === 'completed' ? 'Completed' : 'Upcoming'}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">{formatDate(evt.heldDate)} • {evt.venue}</span>
                            </div>
                            <h4 className="text-lg font-bold text-white mt-1">{evt.title}</h4>
                            <p className="text-xs text-slate-400">{evt.summary}</p>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div className="text-center">
                              <span className="block text-emerald-400 font-bold">{present.length}</span>
                              <span className="text-slate-500">ޙާޟިރު</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-rose-400 font-bold">{absent.length}</span>
                              <span className="text-slate-500">ހާޟިރުނުވެ</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-amber-400 font-bold">{excused.length}</span>
                              <span className="text-slate-500">ސަލާމުގައި</span>
                            </div>
                            <div className="text-center pr-3 border-r border-slate-800">
                              <span className="block text-orange-400 font-bold text-sm">{attRate}%</span>
                              <span className="text-slate-500">ޙާޟިރީ</span>
                            </div>
                          </div>
                        </div>

                        {/* Leave / Excused Reasons List */}
                        {excused.length > 0 && (
                          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              ސަލާމް ބުނި މެންބަރުންގެ ސަބަބުތައް (Reasons for Leave):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {excused.map(a => (
                                <div key={a.memberId} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                                  <strong className="text-white">{a.memberName}:</strong> {a.notes || 'ސަބަބެއް ލިޔެފައެއް ނެތް'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Photo Gallery count */}
                        {photoCount > 0 && (
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                            <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                            <span>ގެލެރީ ފޮޓޯ: {photoCount} ފޮޓޯ އެޕްލޯޑުކުރެވިފައި</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: ADD / EDIT EVENT */}
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-orange-500" />
                  {editingEvent ? 'ޙަރަކާތުގެ މަޢުލޫމާތު ބަދަލުކުރުން' : 'އައު ޙަރަކާތެއް އިތުރުކުރުން'}
                </h3>
                <button onClick={() => setIsEventModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ޙަރަކާތުގެ ނަން (Event Title) *</label>
                  <input
                    type="text"
                    required
                    value={eventFormData.title}
                    onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ބާއްވާ ތާރީޚު (Held Date) *</label>
                    <input
                      type="date"
                      required
                      value={eventFormData.heldDate}
                      onChange={e => setEventFormData({ ...eventFormData, heldDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ތަން (Venue) *</label>
                    <input
                      type="text"
                      required
                      value={eventFormData.venue}
                      onChange={e => setEventFormData({ ...eventFormData, venue: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ފެށޭ ގަޑި</label>
                    <input
                      type="time"
                      value={eventFormData.startTime}
                      onChange={e => setEventFormData({ ...eventFormData, startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ނިމޭ ގަޑި</label>
                    <input
                      type="time"
                      value={eventFormData.endTime}
                      onChange={e => setEventFormData({ ...eventFormData, endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ޚުލާޞާ (Summary)</label>
                  <textarea
                    rows={2}
                    value={eventFormData.summary}
                    onChange={e => setEventFormData({ ...eventFormData, summary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    ފޮޓޯ ގެލެރީ ފައިލްތައް (Photo Gallery Files Upload)
                  </label>
                  <div className="space-y-3">
                    <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-xl p-4 text-center hover:border-orange-500/50 transition">
                      <Upload className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-300 font-semibold">އިވެންޓުގެ ފޮޓޯ ފައިލްތައް އަޕްލޯޑް ކުރައްވާ (Upload Photo Files)</p>
                      <p className="text-[10px] text-slate-500 mt-1">Select one or multiple image files (PNG, JPG, WEBP, SVG)</p>
                      <label className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold cursor-pointer transition shadow-md">
                        <Upload className="w-3.5 h-3.5" />
                        <span>ފޮޓޯ ފައިލް ނަންގަވާ (Browse Photos)</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGalleryFilesUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Preview list of uploaded gallery photos */}
                    {eventFormData.photoGalleryUrl.split('\n').filter(Boolean).length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                        {eventFormData.photoGalleryUrl.split('\n').filter(Boolean).map((url, idx) => (
                          <div key={idx} className="relative group w-full h-16 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shadow-inner">
                            <img src={url} alt={`Gallery item ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeGalleryPhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition text-[10px]"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                  >
                    ކެންސަލް
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
                  >
                    ރައްކާކުރައްވާ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT MEETING */}
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  {editingMeeting ? 'ބައްދަލުވުމުގެ މަޢުލޫމާތު ބަދަލުކުރުން' : 'އައު ބައްދަލުވުމެއް ތާވަލުކުރުން'}
                </h3>
                <button onClick={() => setIsMeetingModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMeeting} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ބައްދަލުވުމުގެ ބާވަތް (Meeting Type) *</label>
                  <select
                    value={meetingFormData.meetingType}
                    onChange={e => setMeetingFormData({ ...meetingFormData, meetingType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="general_members">އާންމު މެންބަރުންގެ ބައްދަލުވުން (All Members)</option>
                    <option value="exco">އެކްސްކޯ ބައްދަލުވުން (EXCO Members Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ބައްދަލުވުމުގެ ނަން (Title) *</label>
                  <input
                    type="text"
                    required
                    value={meetingFormData.title}
                    onChange={e => setMeetingFormData({ ...meetingFormData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ތާރީޚު *</label>
                    <input
                      type="date"
                      required
                      value={meetingFormData.heldDate}
                      onChange={e => setMeetingFormData({ ...meetingFormData, heldDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ތަން (Venue) *</label>
                    <input
                      type="text"
                      required
                      value={meetingFormData.venue}
                      onChange={e => setMeetingFormData({ ...meetingFormData, venue: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ޚުލާޞާ (Summary)</label>
                  <textarea
                    rows={3}
                    value={meetingFormData.summary}
                    onChange={e => setMeetingFormData({ ...meetingFormData, summary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsMeetingModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                  >
                    ކެންސަލް
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium"
                  >
                    ރައްކާކުރައްވާ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EVENT & MEETING ATTENDANCE MARKING */}
        {(selectedEventForAttendance || selectedMeetingForAttendance) && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
              <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-orange-500" />
                    ޙާޟިރީ މާކުކުރުން ({selectedEventForAttendance ? selectedEventForAttendance.title : selectedMeetingForAttendance?.title})
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedMeetingForAttendance?.meetingType === 'exco'
                      ? '⚠️ އެކްސްކޯ ބައްދަލުވުމެއް: އެކްސްކޯ މެންބަރުން އެކަނި ދައްކައިދެނީ'
                      : 'އާންމު ޙަރަކާތް/ބައްދަލުވުން: ހުރިހާ މެންބަރުން'}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedEventForAttendance(null); setSelectedMeetingForAttendance(null); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="divide-y divide-slate-800">
                  {(selectedEventForAttendance ? eventAttendanceList : meetingAttendanceList).map((rec, idx) => (
                    <div key={rec.memberId} className="py-3.5 space-y-2 border-b border-slate-800/80 last:border-b-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-mono text-orange-400 font-bold">{rec.memberNumber}</span>
                          <h4 className="text-sm font-bold text-white">{rec.memberName}</h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const list = selectedEventForAttendance ? [...eventAttendanceList] : [...meetingAttendanceList];
                              list[idx].status = 'present';
                              selectedEventForAttendance ? setEventAttendanceList(list) : setMeetingAttendanceList(list);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              rec.status === 'present'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            ޙާޟިރު
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = selectedEventForAttendance ? [...eventAttendanceList] : [...meetingAttendanceList];
                              list[idx].status = 'absent';
                              selectedEventForAttendance ? setEventAttendanceList(list) : setMeetingAttendanceList(list);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              rec.status === 'absent'
                                ? 'bg-rose-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            ހާޟިރު ނުވެ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const list = selectedEventForAttendance ? [...eventAttendanceList] : [...meetingAttendanceList];
                              list[idx].status = 'excused';
                              selectedEventForAttendance ? setEventAttendanceList(list) : setMeetingAttendanceList(list);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                              rec.status === 'excused'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            ސަލާމުގައި
                          </button>
                        </div>
                      </div>

                      {rec.status === 'excused' && (
                        <div className="pt-1.5 border-r-2 border-amber-500 pr-3 pl-2 bg-slate-950/80 p-2.5 rounded-xl space-y-1">
                          <label className="block text-[11px] font-bold text-amber-400">
                            ސަލާމުގެ ސަބަބު (Reason for Leave) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ސަލާމުގައި ހުރި ސަބަބު ލިޔުއްވާ (e.g. ބަލިވެ / ރަށުން ބޭރުގައި)..."
                            value={rec.notes || ''}
                            onChange={e => {
                              const list = selectedEventForAttendance ? [...eventAttendanceList] : [...meetingAttendanceList];
                              list[idx].notes = e.target.value;
                              selectedEventForAttendance ? setEventAttendanceList(list) : setMeetingAttendanceList(list);
                            }}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => { setSelectedEventForAttendance(null); setSelectedMeetingForAttendance(null); }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                >
                  ކެންސަލް
                </button>
                <button
                  onClick={selectedEventForAttendance ? handleSaveEventAttendance : handleSaveMeetingAttendance}
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
                >
                  ޙާޟިރީ ރައްކާކުރައްވާ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD VOTING TO MEETING */}
        {selectedMeetingForVoting && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Vote className="w-5 h-5 text-amber-500" />
                  ވޯޓަށް އެހުމާއި ނިންމުން އިތުރުކުރުން
                </h3>
                <button onClick={() => setSelectedMeetingForVoting(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVoting} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ވޯޓަށް އެހުނު މައުޟޫޢު (Topic) *</label>
                  <input
                    type="text"
                    required
                    value={votingFormData.topic}
                    onChange={e => setVotingFormData({ ...votingFormData, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ތަފްސީލު (Description)</label>
                  <textarea
                    rows={2}
                    value={votingFormData.description}
                    onChange={e => setVotingFormData({ ...votingFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-1">ފާސްވީ (In Favor)</label>
                    <input
                      type="number"
                      min={0}
                      value={votingFormData.inFavor}
                      onChange={e => setVotingFormData({ ...votingFormData, inFavor: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-rose-400 mb-1">ދެކޮޅު (Against)</label>
                    <input
                      type="number"
                      min={0}
                      value={votingFormData.against}
                      onChange={e => setVotingFormData({ ...votingFormData, against: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">ނުޖެހޭ (Abstain)</label>
                    <input
                      type="number"
                      min={0}
                      value={votingFormData.abstain}
                      onChange={e => setVotingFormData({ ...votingFormData, abstain: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">ނިންމުން / އެކްޝަން ޕްލޭން (Finalized Action Plan)</label>
                  <textarea
                    rows={2}
                    placeholder="މިސާލު: ބަޖެޓް ފާސްކޮށް ސެކްރެޓަރީއަށް އަމަލީ މަސައްކަތް ހަވާލުކުރެވުނު."
                    value={votingFormData.finalizedAction}
                    onChange={e => setVotingFormData({ ...votingFormData, finalizedAction: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedMeetingForVoting(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
                  >
                    ކެންސަލް
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium"
                  >
                    ވޯޓިންގ އިތުރުކުރައްވާ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};
