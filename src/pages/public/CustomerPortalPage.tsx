import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import {
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Printer,
  ChevronLeft,
  XCircle,
  User,
  ShieldAlert,
  Sparkles,
  Download,
  Info
} from 'lucide-react';
import { RentalRequest, RentalBill, RentalReceipt, PublicSiteData } from '../../types';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { CustomerProfileModal } from '../../components/rental/CustomerProfileModal';
import { CustomerPaymentModal } from '../../components/rental/CustomerPaymentModal';
import { PrintableReceipt } from '../../components/rental/PrintableReceipt';
import { CancelBookingModal } from '../../components/rental/CancelBookingModal';

export const CustomerPortalPage: React.FC = () => {
  const { firebaseUser, customer, idToken, loading: authLoading, signInWithGoogle, signOutCustomer, previewDevLogin, isProfileComplete } = useCustomerAuth();

  const [siteData, setSiteData] = useState<PublicSiteData | null>(null);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending_payment' | 'completed'>('all');

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [payingBill, setPayingBill] = useState<RentalBill | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<RentalReceipt | null>(null);
  const [loadingBillId, setLoadingBillId] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<RentalRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Load site data
  useEffect(() => {
    fetch('/api/public/site-data')
      .then(r => r.json())
      .then(setSiteData)
      .catch(console.error);
  }, []);

  // Fetch customer requests
  const loadRequests = useCallback(async () => {
    if (!idToken) return;
    setLoadingRequests(true);
    try {
      const res = await fetch('/api/customer/rental/requests', {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (idToken) {
      loadRequests();
    }
  }, [idToken, loadRequests]);

  // Open Pay Bill modal
  const handleOpenBill = async (billId: string) => {
    if (!idToken) return;
    setLoadingBillId(billId);
    try {
      const res = await fetch(`/api/customer/rental/bills/${billId}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (res.ok) {
        const bill = await res.json();
        setPayingBill(bill);
      }
    } catch (err) {
      console.error('Failed to load bill:', err);
    } finally {
      setLoadingBillId(null);
    }
  };

  // View receipt
  const handleViewReceipt = async (req: RentalRequest) => {
    if (!idToken || !req.billId) return;
    setLoadingReceiptId(req.id);
    try {
      const bRes = await fetch(`/api/customer/rental/bills/${req.billId}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (bRes.ok) {
        const bill: RentalBill = await bRes.json();
        const rRes = await fetch(`/api/customer/rental/receipts/${bill.id}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (rRes.ok) {
          const rcpt = await rRes.json();
          setViewingReceipt(rcpt);
        } else {
          // Construct fallback receipt from request & bill details
          setViewingReceipt({
            id: `rcpt_${bill.id}`,
            receiptNumber: `ARC-RR-2026-${req.requestNumber.slice(-4)}`,
            billId: bill.id,
            paymentId: 'pay_approved',
            requestId: req.id,
            customerUid: req.customerUid,
            customerName: req.customerName,
            amount: bill.amountPaid || bill.totalAmount,
            paymentMethod: 'Bank Transfer (BML)',
            referenceNumber: req.requestNumber,
            receivedAt: bill.paidAt || bill.updatedAt,
            receivedBy: 'ARC Finance Office',
            paidStatus: 'PAID',
            createdAt: bill.paidAt || bill.updatedAt
          });
        }
      }
    } catch (e) {
      console.error('Error fetching receipt:', e);
    } finally {
      setLoadingReceiptId(null);
    }
  };

  // Cancel request confirmation handler
  const handleConfirmCancel = async (reason: string) => {
    if (!cancellingRequest || !idToken) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/customer/rental/requests/${cancellingRequest.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'ބުކިންގ ކެންސަލްކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ');
      }
      setCancellingRequest(null);
      await loadRequests();
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      throw err;
    } finally {
      setIsCancelling(false);
    }
  };

  // Status badge helper in Dhivehi
  const getStatusBadge = (status: RentalRequest['status']) => {
    switch (status) {
      case 'requested':
        return {
          label: 'އެޑްމިން ރިވިއުއަށް އިންތިޒާރުކުރަނީ',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
          dot: 'bg-amber-500'
        };
      case 'approved_payment_pending':
        return {
          label: 'އެޕްރޫވްވެއްޖެ • ފައިސާ ދައްކަވާ',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900',
          dot: 'bg-blue-500'
        };
      case 'payment_submitted':
        return {
          label: 'ފައިސާ ދެއްކި ސްލިޕް ފޮނުވާފައި • ޗެކްކުރަނީ',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
          dot: 'bg-purple-500'
        };
      case 'payment_verified':
      case 'ready_for_collection':
        return {
          label: 'ފައިސާ ކަށަވަރުވެއްޖެ • ތަކެއްޗާ ހަވާލުވުމަށް ތައްޔާރު',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
          dot: 'bg-emerald-500'
        };
      case 'handed_over':
      case 'active_rental':
        return {
          label: 'މިވަގުތު ކުއްޔަށް ނަގާފައި (ބޭނުންކުރަނީ)',
          className: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-900',
          dot: 'bg-teal-500'
        };
      case 'return_inspection_pending':
        return {
          label: 'އަނބުރާ ގެނެސްފައި • އިންސްޕެކްޝަން ކުރިއަށްދަނީ',
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900',
          dot: 'bg-indigo-500'
        };
      case 'additional_payment_submitted':
        return {
          label: 'އިތުރު ފައިސާ ދެއްކި ސްލިޕް ފޮނުވާފައި',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
          dot: 'bg-purple-500'
        };
      case 'additional_payment_required':
        return {
          label: 'އިތުރު ޖޫރިމަނާ/އަގު ދައްކަންޖެހޭ',
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
          dot: 'bg-rose-500'
        };
      case 'completed':
        return {
          label: 'ފުރިހަމަވެ ނިމިފައި',
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          dot: 'bg-slate-400'
        };
      case 'rejected':
        return {
          label: 'ބަލައިނުގަނެވުނު',
          className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900',
          dot: 'bg-rose-500'
        };
      case 'cancelled':
        return {
          label: 'ކެންސަލްކުރެވިފައި',
          className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-800',
          dot: 'bg-slate-400'
        };
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'active') return req.status === 'active_rental' || req.status === 'ready_for_collection';
    if (activeTab === 'pending_payment') return req.status === 'approved_payment_pending' || req.status === 'additional_payment_required';
    if (activeTab === 'completed') return req.status === 'completed';
    return true;
  });

  const defaultBranding = siteData?.branding || {
    clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް',
    clubAbbreviation: 'ARC',
    useLogo: true
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" dir="rtl">
        <PublicHeader branding={defaultBranding} activePath="/rental" />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-dhivehi">ޕޯޓަލް ލޯޑްވަނީ...</p>
          </div>
        </div>
        <PublicFooter branding={defaultBranding} socialLinks={siteData?.socialLinks || []} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" dir="rtl">
      <PublicHeader branding={defaultBranding} activePath="/rental" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 text-right">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/rental"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-500 flex items-center gap-1.5 transition"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            އަނބުރާ ކުއްޔަށް ދޫކުރާ ސާމާނުގެ ޞަފްޙާއަށް
          </Link>
          {customer && (
            <button
              onClick={signOutCustomer}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ލޮގްއައުޓް
            </button>
          )}
        </div>

        {/* Not Logged In Gate */}
        {!customer && !firebaseUser ? (
          <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl w-fit mx-auto">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                ކަސްޓަމަރުންގެ ރެންޓަލް ޕޯޓަލް
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                ބުކިންގތައް ބެލުމަށާއި، ބިލްތަކަށް ފައިސާ ދެއްކުމަށާއި ރަސްމީ ރަސީދު ޑައުންލޯޑްކުރުމަށް ގޫގުލް އެކައުންޓުން ލޮގިންވެލައްވާ.
              </p>
            </div>

            <button
              onClick={() => signInWithGoogle().catch(() => {})}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2.5 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              ގޫގުލް އެކައުންޓުން ލޮގިންވުން
            </button>

            <button
              onClick={() => previewDevLogin().catch(() => {})}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium block mx-auto"
            >
              (ޓެސްޓް ކަސްޓަމަރެއްގެ ގޮތުގައި ލޮގިންވުން)
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Customer Profile Banner */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {customer?.googlePhotoUrl || firebaseUser?.photoURL ? (
                  <img
                    src={customer?.googlePhotoUrl || firebaseUser?.photoURL || ''}
                    alt="Avatar"
                    className="w-14 h-14 rounded-2xl border-2 border-orange-500/30 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                    {(customer?.fullName || 'C').charAt(0)}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {customer?.fullName || 'ޚިދުމަތް ހޯއްދަވާ ކަސްޓަމަރު'}
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      ކަށަވަރުކުރެވިފައި
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>އީމެއިލް: <span className="font-mono dir-ltr">{customer?.googleEmail || firebaseUser?.email}</span></span>
                    {customer?.phoneNumber && <span>ފޯނު: <span className="font-mono">{customer.phoneNumber}</span></span>}
                    {customer?.idCardNumber && <span>އައިޑީ ކާޑު: <span className="font-mono">{customer.idCardNumber}</span></span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  މަޢުލޫމާތު ބަދަލުކުރުން
                </button>
                <Link
                  to="/rental#catalog"
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  އައު ބުކިންގއަކަށް އެދުން
                </Link>
              </div>
            </div>

            {/* Profile incomplete warning */}
            {!isProfileComplete && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    ތިޔަބޭފުޅާގެ ކަސްޓަމަރު ޕްރޮފައިލްގައި އައިޑީ ކާޑު ނަންބަރު އަދި ފޯނު ނަންބަރު ފުރިހަމަނުވެ އެބައޮތެވެ. ބުކިންގތައް އަވަހަށް އެޕްރޫވްކުރުމަށްޓަކައި މަޢުލޫމާތު ފުރިހަމަކުރައްވާ.
                  </span>
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shrink-0 transition mr-3"
                >
                  މަޢުލޫމާތު ފުރިހަމަކުރައްވާ
                </button>
              </div>
            )}

            {/* Bookings Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  މަގޭ ރެންޓަލް ބުކިންގތަކާއި ރިކުއެސްޓްތައް
                </h3>

                {/* Filter Tabs */}
                <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'all' ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    ހުރިހާ ބުކިންގ ({requests.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('pending_payment')}
                    className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'pending_payment' ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    ފައިސާ ދައްކަންޖެހޭ ({requests.filter(r => r.status === 'approved_payment_pending' || r.status === 'additional_payment_required').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'active' ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    މިހާރު ހިނގަމުންދާ ({requests.filter(r => r.status === 'active_rental' || r.status === 'ready_for_collection').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'completed' ? 'bg-orange-500 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                  >
                    ނިމިފައި ({requests.filter(r => r.status === 'completed').length})
                  </button>
                </div>
              </div>

              {/* Requests List */}
              {loadingRequests ? (
                <div className="py-16 text-center text-slate-400 text-xs">ބުކިންގތައް ލޯޑްވަނީ...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                  <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">އެއްވެސް ރެންޓަލް ބުކިންގއެއް ނުފެނުނު</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    ތިޔަބޭފުޅާ އަދި އެއްވެސް އެއްޗެއް ކުއްޔަށް ނެގުމަށް އެދިވަޑައިގެންފައެއް ނުވެއެވެ. ތަކެތީގެ ކެޓަލޮގް ބައްލަވައިލައްވައިގެން ފުރަތަމަ ބުކިންގ ހައްދަވާ!
                  </p>
                  <Link
                    to="/rental#catalog"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl shadow transition"
                  >
                    ތަކެތީގެ ކެޓަލޮގް ބެއްލެވުން
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <div
                        key={req.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 text-right"
                      >
                        {/* Request Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                                #{req.requestNumber}
                              </span>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                              {req.itemName}
                            </h4>
                          </div>

                          <div className="text-right sm:text-left">
                            <span className="text-[10px] font-bold text-slate-400 block">ޖުމްލަ ކުލީ އަގު</span>
                            <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                              ރ. {req.estimatedRentalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Booking Meta Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">އަދަދު (ޔުނިޓް)</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {req.requestedQuantity} ޔުނިޓް
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">ތަކެއްޗާ ހަވާލުވާ ތާރީޚު</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {new Date(req.approvedStartAt || req.requestedStartAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">އަނބުރާ ގެންނަންޖެހޭ ތާރީޚު</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {new Date(req.approvedEndAt || req.requestedEndAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">ކުލީ މުއްދަތު</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {req.rentalDays} ދުވަސް (24 ގަޑިއިރުގެ ބްލޮކް)
                            </span>
                          </div>
                        </div>

                        {/* Special Notification / Warning based on status */}
                        {req.status === 'approved_payment_pending' && req.billId && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-amber-900 dark:text-amber-200">
                              <p className="font-bold">ބުކިންގ އެޕްރޫވްވެއްޖެ! ކުލީ ބިލަށް ފައިސާ ދައްކަވާ.</p>
                              <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                                އޭއާރްސީގެ ރަސްމީ ބީއެމްއެލް އެކައުންޓަށް ޓްރާންސްފަރ ކުރައްވައި ސްލިޕް އަޕްލޯޑް ކުރައްވާ.
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenBill(req.billId!)}
                              disabled={loadingBillId === req.billId}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition shrink-0"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              ފައިސާ ދެއްކުން
                            </button>
                          </div>
                        )}

                        {req.status === 'additional_payment_required' && req.billId && (
                          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs text-rose-900 dark:text-rose-200">
                              <p className="font-bold">ލަސްވުމުގެ ޖޫރިމަނާ ނުވަތަ ގެއްލުމުގެ އަގު ދައްކަންޖެހޭ</p>
                              <p className="text-rose-700 dark:text-rose-300 mt-0.5">
                                ތަކެތި ޗެކްކުރުމަށްފަހު އިތުރު ޗާޖެއް ވަނީ ހިމެނިފައެވެ. ޚިދުމަތް ފައިނަލްކުރުމަށް ފައިސާ ދައްކަވާ.
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenBill(req.billId!)}
                              disabled={loadingBillId === req.billId}
                              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition shrink-0"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              ޖޫރިމަނާ / ޗާޖު ދެއްކުން
                            </button>
                          </div>
                        )}

                        {req.status === 'ready_for_collection' && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ފައިސާ ކަށަވަރުވެއްޖެ! އޭއާރްސީ މަރުކަޒުން ސާމާނާ ހަވާލުވެވަޑައިގަންނަވާ.
                            </p>
                            <p className="text-emerald-700 dark:text-emerald-300 leading-relaxed">
                              ތަކެއްޗާ ހަވާލުވުމަށް ވަޑައިގަންނަވާއިރު އައިޑީ ކާޑު ގެންނަވާ. އޭއާރްސީ ޓީމާއެކު ޑިޖިޓަލް ހޭންޑްއޯވަރ ފުރިހަމަކުރެވޭނެއެވެ.
                            </p>
                          </div>
                        )}

                        {/* Rejection / Cancellation note */}
                        {req.status === 'rejected' && req.rejectionReason && (
                          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                            <span className="font-semibold">ބަލައިނުގަތް ސަބަބު:</span> {req.rejectionReason}
                          </div>
                        )}

                        {/* Actions Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="text-[11px] text-slate-400">
                            އެދުނު ތާރީޚު: {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Printable Receipt */}
                            {(req.paymentStatus === 'paid' || req.status === 'ready_for_collection' || req.status === 'active_rental' || req.status === 'completed') && (
                              <button
                                onClick={() => handleViewReceipt(req)}
                                disabled={loadingReceiptId === req.id}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                ރަސްމީ ރަސީދު
                              </button>
                            )}

                            {/* Cancel Option with Confirmation */}
                            {(
                              req.status === 'requested' ||
                              req.status === 'approved_payment_pending' ||
                              req.status === 'payment_submitted' ||
                              req.status === 'payment_verified' ||
                              req.status === 'ready_for_collection'
                            ) && (
                              <button
                                onClick={() => setCancellingRequest(req)}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                ބުކިންގ ކެންސަލްކުރައްވާ
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PublicFooter branding={defaultBranding} socialLinks={siteData?.socialLinks || []} />

      {/* Profile Modal */}
      {showProfileModal && (
        <CustomerProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Pay Bill Modal */}
      {payingBill && (
        <CustomerPaymentModal
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onSuccess={() => {
            setPayingBill(null);
            loadRequests();
          }}
        />
      )}

      {/* Printable Receipt Modal */}
      {viewingReceipt && (
        <PrintableReceipt
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Cancel Booking Confirmation Modal */}
      {cancellingRequest && (
        <CancelBookingModal
          request={cancellingRequest}
          onClose={() => setCancellingRequest(null)}
          onConfirm={handleConfirmCancel}
          loading={isCancelling}
        />
      )}
    </div>
  );
};
