import React, { useEffect, useState } from 'react';
import {
  User,
  ClubMember,
  UserPerformanceData,
  ContributionPaymentRequest,
  MemberContributionSetting,
  MemberContributionRecord
} from '../../types';
import { api } from '../../services/api';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { useToast } from '../common/Toast';
import {
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  AlertCircle,
  Copy,
  Check,
  Link,
  Loader2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { PayContributionModal } from './budget/PayContributionModal';
import { MemberPerformanceStatusCard } from './MemberPerformanceStatusCard';

interface ExcoMemberProfileCardProps {
  user: User;
  onRefreshUser?: () => void;
  accentColor?: 'amber' | 'emerald' | 'sky' | 'indigo' | 'rose';
}

export const ExcoMemberProfileCard: React.FC<ExcoMemberProfileCardProps> = ({
  user,
  onRefreshUser,
  accentColor = 'amber'
}) => {
  const { lang } = usePortalLanguage();
  const isDh = lang === 'dhivehi';
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [perfData, setPerfData] = useState<UserPerformanceData | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<ContributionPaymentRequest[]>([]);
  const [settingsData, setSettingsData] = useState<MemberContributionSetting | null>(null);
  const [depositAccountData, setDepositAccountData] = useState<any>(null);
  const [myContributions, setMyContributions] = useState<MemberContributionRecord[]>([]);

  // Modal & connect states
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedMemberNum, setCopiedMemberNum] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [connecting, setConnecting] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        api.getUserPerformance('me').catch(() => null),
        api.getMyContributions().catch(() => null)
      ]);

      setPerfData(pRes);
      if (cRes) {
        setPaymentRequests(cRes.paymentRequests || []);
        if (cRes.settings) setSettingsData(cRes.settings);
        if (cRes.depositAccount) setDepositAccountData(cRes.depositAccount);
        if (cRes.contributions) setMyContributions(cRes.contributions);
      }
    } catch (err: any) {
      console.warn('Failed to load member profile on EXCO desk:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user.id, user.memberId, (user as any).linkedMemberId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  const handleCopyAccount = (accNum: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedAcc(true);
    showToast('success', isDh ? 'އެކައުންޓް ނަންބަރު ކޮޕީ ކުރެވިއްޖެ!' : 'Bank account number copied!');
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleCopyMemberNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedMemberNum(true);
    showToast('success', isDh ? 'މެންބަރު ނަންބަރު ކޮޕީ ކުރެވިއްޖެ!' : 'Member number copied!');
    setTimeout(() => setCopiedMemberNum(false), 2000);
  };

  const handleConnectMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      showToast('error', isDh ? 'މެންބަރު ނަންބަރު ނުވަތަ ފޯނު ނަންބަރު ޖައްސަވާ.' : 'Enter Member Number or Phone Number.');
      return;
    }

    try {
      setConnecting(true);
      const res = await api.connectMember({ query: searchQuery.trim() });
      showToast('success', res.message || (isDh ? 'މެންބަރު އެކައުންޓް ގުޅުވާލެވިއްޖެ!' : 'Member profile linked successfully!'));
      setSearchQuery('');
      if (onRefreshUser) onRefreshUser();
      fetchProfileData();
    } catch (err: any) {
      showToast('error', err.message || (isDh ? 'ގުޅުވާލުމުގައި މައްސަލައެއް ދިމާވެއްޖެ.' : 'Failed to connect member account.'));
    } finally {
      setConnecting(false);
    }
  };

  const handlePaymentSuccess = (newRequest: ContributionPaymentRequest) => {
    setPaymentRequests(prev => [newRequest, ...prev]);
    showToast('success', isDh
      ? `ޕޭމަންޓް ރިކުއެސްޓް ${newRequest.requestNumber} ފޮނުވިއްޖެ! ވެރިފައިވުމުން ފީ އަޕްޑޭޓްވާނެ.`
      : `Payment request ${newRequest.requestNumber} submitted successfully!`);
    setPayModalOpen(false);
    fetchProfileData();
  };

  const linkedMember: ClubMember | undefined = perfData?.member;
  const budgetSummary = perfData?.budget?.summary;
  const attendanceCount = perfData?.attendance?.totalPresent ?? 
    ((perfData?.attendance?.eventsAttended ?? 0) + (perfData?.attendance?.meetingsAttended ?? 0));

  // Pending review slips count
  const pendingSlipsCount = paymentRequests.filter(p => p.status === 'pending').length;

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex items-center justify-center gap-3 text-slate-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        <span>{isDh ? 'މެންބަރުގެ މަޢުލޫމާތު ލޯޑުވަނީ...' : 'Loading linked club member profile...'}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-750 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden transition-all" dir={isDh ? 'rtl' : 'ltr'}>
      {/* Background soft ambient highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {isDh ? 'ރަސްމީ ކްލަބް މެންބަރޝިޕް' : 'Official Club Membership'}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400 font-mono">
                {user.roleName || 'EXCO'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-heading">
              {isDh ? 'މެންބަރުގެ މަޢުލޫމާތާއި ފީގެ ޙާލަތު' : 'Member Profile & Membership Standing'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={isDh ? 'އާކޮށްލާ' : 'Refresh Member Data'}
          >
            <RefreshCw className={`w-4 h-4 text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {linkedMember ? (
        <div className="space-y-6 relative z-10">
          {/* Top Profile Summary Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-start sm:items-center gap-4">
              {/* Member Number Badge Monogram */}
              <button
                type="button"
                onClick={() => handleCopyMemberNumber(linkedMember.memberNumber)}
                className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40 text-amber-300 flex flex-col items-center justify-center shrink-0 font-mono shadow-inner hover:border-amber-400 transition cursor-pointer group"
                title={isDh ? 'މެންބަރު ނަންބަރު ކޮޕީކުރައްވާ' : 'Click to copy member number'}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">ID</span>
                <span className="text-sm font-black tracking-tight">{linkedMember.memberNumber}</span>
              </button>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base sm:text-lg font-black text-white font-heading">
                    {linkedMember.fullName}
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    linkedMember.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${linkedMember.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{linkedMember.status === 'active' ? (isDh ? 'އެކްޓިވް މެންބަރު' : 'Active Member') : (isDh ? 'އިންއެކްޓިވް' : 'Inactive')}</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                    {linkedMember.memberType === 'exco'
                      ? (isDh ? 'ހިންގާ ކޮމިޓީ' : 'Executive (EXCO)')
                      : linkedMember.memberType === 'standard'
                      ? (isDh ? 'ޢާންމު މެންބަރު' : 'Standard Member')
                      : linkedMember.memberType}
                  </span>

                  {user.designation && (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono">
                      {user.designation}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  {linkedMember.phoneNumber && (
                    <a
                      href={`tel:${linkedMember.phoneNumber}`}
                      className="flex items-center gap-1.5 hover:text-amber-400 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono">{linkedMember.phoneNumber}</span>
                    </a>
                  )}
                  {linkedMember.email && (
                    <a
                      href={`mailto:${linkedMember.email}`}
                      className="flex items-center gap-1.5 hover:text-amber-400 transition"
                    >
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>{linkedMember.email}</span>
                    </a>
                  )}
                  {linkedMember.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{linkedMember.address}</span>
                    </span>
                  )}
                  {linkedMember.joinedDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isDh ? 'ގުޅުނު:' : 'Joined:'} {linkedMember.joinedDate}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance badge */}
            <div className="flex items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800 shrink-0">
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {isDh ? 'ޙާޟިރީ ރެކޯޑު' : 'Attendance Sessions'}
                </span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {attendanceCount}
                </span>
              </div>
            </div>
          </div>

          {/* Member Individual Performance Status */}
          {perfData && (
            <MemberPerformanceStatusCard
              data={perfData}
              accentColor={accentColor}
            />
          )}

          {/* Dues & Financial Standing Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isDh ? 'މެންބަރޝިޕް ފީގެ ޙާލަތު (Personal Dues Standing)' : 'Personal Membership Dues Standing'}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {pendingSlipsCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{pendingSlipsCount} {isDh ? 'ސްލިޕް ވެރިފައިކުރުމުގައި' : 'slip(s) under review'}</span>
                  </span>
                )}
                {budgetSummary && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    budgetSummary.totalPending > 0
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {budgetSummary.totalPending > 0
                      ? (isDh ? 'ދައްކަންޖެހޭ ފީ އެބައޮތް' : 'Pending Dues Outstanding')
                      : (isDh ? 'ފީ ދައްކާ އަދާކުރެވިފައި' : 'All Dues Paid Up-to-Date')}
                  </span>
                )}
              </div>
            </div>

            {/* Dues Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isDh ? 'މަހު ފީ' : 'Monthly Rate'}
                </span>
                <p className="text-base sm:text-lg font-black text-white font-mono">
                  {settingsData?.currency || 'MVR'} {settingsData?.monthlyFee || budgetSummary?.monthlyFee || 50}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isDh ? 'ދެއްކި ޖުމްލަ ފީ' : 'Total Paid Dues'}
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                  {settingsData?.currency || 'MVR'} {budgetSummary?.totalPaid ?? 0}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isDh ? 'ދައްކަންޖެހޭ ބާކީ' : 'Pending Dues'}
                </span>
                <p className={`text-base sm:text-lg font-black font-mono ${
                  (budgetSummary?.totalPending || 0) > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {settingsData?.currency || 'MVR'} {budgetSummary?.totalPending ?? 0}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {isDh ? 'ޖޫރިމަނާ' : 'Fines / Penalties'}
                </span>
                <p className="text-base sm:text-lg font-black text-slate-400 font-mono">
                  {settingsData?.currency || 'MVR'} {budgetSummary?.totalFines ?? 0}
                </p>
              </div>
            </div>

            {/* Quick Actions & Bank Details */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {depositAccountData ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span className="font-semibold text-slate-300">{depositAccountData.bankName || 'BML'}:</span>
                  <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {depositAccountData.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAccount(depositAccountData.accountNumber)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                    title={isDh ? 'އެކައުންޓް ނަންބަރު ކޮޕީކުރައްވާ' : 'Copy account number'}
                  >
                    {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[11px] text-slate-500">({depositAccountData.accountName})</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  {isDh ? 'ކްލަބް މެންބަރޝިޕް ފީގެ ޓްރާންސްފަރ' : 'Official ARC Dues Payment'}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isDh ? 'ފީ ދައްކާ / ސްލިޕް އަޕްލޯޑްކުރައްވާ' : 'Pay Dues / Upload Slip'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Not Connected State */
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-amber-500/20 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white font-heading">
                {isDh ? 'ކްލަބް މެންބަރޝިޕް ޕްރޮފައިލް ގުޅުވާލެވިފައެއް ނެތް' : 'No Club Member Profile Connected'}
              </h4>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed font-dhivehi">
                {isDh
                  ? 'ހިންގާ ކޮމިޓީގެ މެންބަރުންގެ ރަސްމީ ކްލަބް މެންބަރޝިޕް ދަފްތަރާ ތިޔަބޭފުޅާގެ އެކައުންޓް ގުޅުވުމަށް މެންބަރު ނަންބަރު (މިސާލަކަށް: ARC-0012) ނުވަތަ ފޯނު ނަންބަރު ޖައްސަވާ.'
                  : 'Link your user account with your official club membership record to view your membership details, attendance, and dues standing.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleConnectMember} className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isDh ? 'މެންބަރު ނަންބަރު (ARC-0001) ނުވަތަ ފޯނު ނަންބަރު...' : 'Enter Member Number (e.g. ARC-0001) or Phone...'}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={connecting || !searchQuery.trim()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow cursor-pointer"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
              <span>{isDh ? 'ގުޅުވާލާ' : 'Connect Profile'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Dues Payment & Slip Upload Modal */}
      {payModalOpen && linkedMember && (
        <PayContributionModal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          member={linkedMember}
          settings={settingsData}
          depositAccount={depositAccountData}
          contributions={myContributions}
          existingRequests={paymentRequests}
        />
      )}
    </div>
  );
};
