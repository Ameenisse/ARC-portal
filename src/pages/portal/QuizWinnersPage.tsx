import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Trophy, PhoneCall, CheckCircle, RefreshCw, Upload, Eye, FileText, User, Building2, AlertCircle, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { MarkNotEligibleModal } from '../../components/portal/MarkNotEligibleModal';

export const QuizWinnersPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useToast();
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = (user?.roleName || user?.roleId || '').toLowerCase().includes('admin') || user?.roleId === 'role_admin' || hasPermission('quiz', 'canDelete');

  // Modals state
  const [activeWinner, setActiveWinner] = useState<any | null>(null);
  const [winnerToDelete, setWinnerToDelete] = useState<any | null>(null);
  
  // Contact Modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [contactStatusSelect, setContactStatusSelect] = useState<'contacted' | 'not_contacted' | 'unreachable'>('contacted');

  // Prize Slip Modal
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [prizeStatusSelect, setPrizeStatusSelect] = useState<'pending' | 'collected' | 'forfeited'>('collected');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [paymentSlipPreview, setPaymentSlipPreview] = useState('');

  // View Payment Slip Modal
  const [viewSlipModalOpen, setViewSlipModalOpen] = useState(false);
  const [selectedSlipUrl, setSelectedSlipUrl] = useState('');

  // Disqualification / Re-select Winner Modal State
  const [notEligibleModalOpen, setNotEligibleModalOpen] = useState(false);
  const [notEligibleTargetIdentifier, setNotEligibleTargetIdentifier] = useState('');
  const [notEligibleCallback, setNotEligibleCallback] = useState<((reason: string) => Promise<void>) | null>(null);

  const fetchWinners = async () => {
    try {
      setLoading(true);
      const res = await api.getWinners();
      setWinners(res.winners || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load winners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();
  }, []);

  // Open Contact Status Modal
  const handleOpenContactModal = (w: any) => {
    setActiveWinner(w);
    setContactNameInput(w.fullName && w.fullName !== 'Winner Participant' ? w.fullName : '');
    const isCont = w.contactedStatus === 'contacted' || w.isContacted;
    setContactStatusSelect(isCont ? 'not_contacted' : 'contacted');
    setContactModalOpen(true);
  };

  const handleSaveContactStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWinner) return;

    if (!contactNameInput.trim()) {
      showToast('error', 'To change contact status, you must write the name of the participant.');
      return;
    }

    try {
      await api.updateWinnerStatus(activeWinner.id, {
        contactedStatus: contactStatusSelect,
        isContacted: contactStatusSelect === 'contacted',
        participantName: contactNameInput.trim(),
        fullName: contactNameInput.trim()
      });
      showToast('success', 'Winner contact status updated successfully.');
      setContactModalOpen(false);
      fetchWinners();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update contact status.');
    }
  };

  // Open Prize Collection Modal
  const handleOpenPrizeModal = (w: any) => {
    setActiveWinner(w);
    const isCol = w.prizeCollectionStatus === 'collected' || w.isPrizeCollected;
    setPrizeStatusSelect(isCol ? 'pending' : 'collected');
    setPaymentSlipUrl(w.paymentSlipUrl || '');
    setPaymentSlipPreview(w.paymentSlipUrl || '');
    setPrizeModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPaymentSlipUrl(result);
        setPaymentSlipPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePrizeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWinner) return;

    if (prizeStatusSelect === 'collected' && !paymentSlipUrl.trim()) {
      showToast('error', 'To change prize collection status to collected, you must upload a payment slip.');
      return;
    }

    try {
      await api.updateWinnerStatus(activeWinner.id, {
        prizeCollectionStatus: prizeStatusSelect,
        isPrizeCollected: prizeStatusSelect === 'collected',
        paymentSlipUrl: paymentSlipUrl.trim()
      });
      showToast('success', 'Prize collection status & payment slip saved.');
      setPrizeModalOpen(false);
      fetchWinners();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update prize status.');
    }
  };

  const handleViewSlip = (url: string) => {
    setSelectedSlipUrl(url);
    setViewSlipModalOpen(true);
  };

  const handleReselectWinner = (w: any) => {
    setNotEligibleTargetIdentifier(`Winner Entry #${w.participantNumber || w.id} (Day ${w.questionNumber || 'Quiz'})`);
    setNotEligibleCallback(() => async (reason: string) => {
      const winnerIdentifier = w.id || w.questionId;
      const res = await api.reselectWinner(winnerIdentifier, reason);
      const newNumber = res?.winner?.participantNumber || res?.newWinner?.participantNumber || 'New Winner';
      showToast('success', `Replacement winner selected: ${newNumber}`);
      fetchWinners();
    });
    setNotEligibleModalOpen(true);
  };

  const handleDeleteWinner = async () => {
    if (!winnerToDelete) return;
    try {
      await api.deleteQuizWinner(winnerToDelete.id);
      showToast('success', 'Winner record deleted successfully.');
      setWinnerToDelete(null);
      fetchWinners();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete winner.');
    }
  };

  return (
    <PortalLayout currentModule="quiz_winners" title="Lucky Draw Winners">
      <div className="space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-heading text-white">Ramazan Quiz Lucky Draw Winners</h2>
            <p className="text-xs text-slate-400">Track contacted winners, upload payment slips, and execute authorized re-selections.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading winners...</div>
        ) : winners.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
            No winners recorded yet. Winners will appear after running lucky draws on completed quiz questions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {winners.map(w => {
              const isContacted = w.contactedStatus === 'contacted' || w.isContacted;
              const isCollected = w.prizeCollectionStatus === 'collected' || w.isPrizeCollected;
              const unmaskedId = w.idNumber || w.normalizedIdNumber || w.maskedIdNumber;
              const unmaskedPhone = w.contactNumber || w.maskedContactNumber;

              return (
                <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-bold text-white font-heading">Question Day {w.questionNumber || 'Quiz'}</span>
                      </div>
                      <span className="font-mono text-lg font-bold text-orange-400">{w.participantNumber}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Participant Name:</span>
                        <span className="text-white font-bold">{w.fullName || 'Not set'}</span>
                      </p>
                      <p className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400 font-medium">ID Card Number:</span>
                        <span className="font-mono text-white font-bold">{unmaskedId}</span>
                      </p>
                      <p className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Contact Phone:</span>
                        <span className="font-mono text-orange-300 font-bold">{unmaskedPhone}</span>
                      </p>
                      <p className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Prize:</span>
                        <span className="text-amber-400 font-semibold">{w.prizeTitle}</span>
                      </p>
                      {w.sponsorName && (
                        <p className="text-slate-300 flex items-center justify-between">
                          <span className="text-slate-400 font-medium">Sponsor:</span>
                          <span className="text-sky-300">{w.sponsorName}</span>
                        </p>
                      )}
                      <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                        Selected At: {formatDateTime(w.drawnAt || w.selectedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    
                    {/* Contact Status Row */}
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Contact Status</span>
                        <span className={`font-bold ${isContacted ? 'text-orange-400' : 'text-slate-400'}`}>
                          {w.contactedStatus === 'unreachable' ? 'Unreachable' : isContacted ? 'Contacted' : 'Not Contacted'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenContactModal(w)}
                        className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700"
                      >
                        <User className="w-3.5 h-3.5 text-orange-400" />
                        <span>Update Contact Status</span>
                      </button>
                    </div>

                    {/* Prize Collection Row */}
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Prize Collection</span>
                        <span className={`font-bold ${isCollected ? 'text-sky-400' : 'text-amber-400'}`}>
                          {isCollected ? 'Collected' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.paymentSlipUrl && (
                          <button
                            type="button"
                            onClick={() => handleViewSlip(w.paymentSlipUrl)}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-950 text-sky-300 hover:bg-sky-900 border border-sky-800 font-bold text-[11px] flex items-center gap-1"
                            title="View Payment Slip"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>View Slip</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenPrizeModal(w)}
                          className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700"
                        >
                          <Upload className="w-3.5 h-3.5 text-sky-400" />
                          <span>Update Prize Status</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleReselectWinner(w)}
                        className="w-full py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-Select New Winner</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setWinnerToDelete(w)}
                          className="w-full py-2 bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          title="Delete Winner Record (Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Delete Winner Record</span>
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

      {/* MODAL 1: Contact Status Update */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Update Winner Contact Status"
        description="Write the participant's full name to confirm contact status."
      >
        <form onSubmit={handleSaveContactStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Participant Full Name <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-slate-400 mb-1.5">
              To change contact status, you must type the name of the participant for verification.
            </p>
            <input
              type="text"
              required
              value={contactNameInput}
              onChange={e => setContactNameInput(e.target.value)}
              placeholder="Enter full name of participant..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Contact Status</label>
            <select
              value={contactStatusSelect}
              onChange={e => setContactStatusSelect(e.target.value as any)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="contacted">Contacted (ގުޅުނު)</option>
              <option value="not_contacted">Not Contacted (ނުގުޅޭ)</option>
              <option value="unreachable">Unreachable (ގުޅޭގޮތް ނުވި)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs"
            >
              Save Contact Status
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Prize Collection & Payment Slip Upload */}
      <Modal
        isOpen={prizeModalOpen}
        onClose={() => setPrizeModalOpen(false)}
        title="Update Prize Collection Status"
        description="Upload a payment slip or receipt to mark prize as collected."
      >
        <form onSubmit={handleSavePrizeStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Prize Status</label>
            <select
              value={prizeStatusSelect}
              onChange={e => setPrizeStatusSelect(e.target.value as any)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="collected">Collected (ހަވާލުކުރެވިއްޖެ)</option>
              <option value="pending">Pending (ހަވާލުނުކުރެވޭ)</option>
              <option value="forfeited">Forfeited (ބާޠިލުކުރެވިއްޖެ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Payment Slip / Collection Proof Receipt {prizeStatusSelect === 'collected' && <span className="text-rose-400">*</span>}
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Upload an image or document file (PNG, JPG, PDF) as proof of payment/delivery.
            </p>

            <div className="space-y-3">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-orange-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            {paymentSlipPreview && (
              <div className="mt-3 p-2 bg-slate-950 border border-slate-800 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Payment Slip Preview:</p>
                <img src={paymentSlipPreview} alt="Slip preview" className="max-h-40 rounded-lg object-contain mx-auto" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setPrizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
            >
              Save Prize Status
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: View Payment Slip Preview */}
      <Modal
        isOpen={viewSlipModalOpen}
        onClose={() => setViewSlipModalOpen(false)}
        title="Payment Slip / Collection Proof"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center">
            <img src={selectedSlipUrl} alt="Payment slip" className="max-h-96 rounded-xl object-contain" />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setViewSlipModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Re-select Winner / Disqualify Modal */}
      <MarkNotEligibleModal
        isOpen={notEligibleModalOpen}
        onClose={() => setNotEligibleModalOpen(false)}
        participantIdentifier={notEligibleTargetIdentifier}
        onConfirm={async (reason) => {
          if (notEligibleCallback) {
            await notEligibleCallback(reason);
          }
        }}
      />

      {/* MODAL: Confirm Delete Winner */}
      <ConfirmModal
        isOpen={!!winnerToDelete}
        onClose={() => setWinnerToDelete(null)}
        onConfirm={handleDeleteWinner}
        title="Delete Quiz Winner Record"
        message={`Are you sure you want to delete winner #${winnerToDelete?.participantNumber} (Day ${winnerToDelete?.questionNumber || 'Quiz'})? This will remove this recorded winner record.`}
        confirmText="Delete Winner Record"
        cancelText="Cancel"
        isDanger={true}
      />

    </PortalLayout>
  );
};

