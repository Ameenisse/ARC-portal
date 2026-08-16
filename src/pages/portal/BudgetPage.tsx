import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Modal } from '../../components/common/Modal';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  Users,
  Settings as SettingsIcon,
  Plus,
  ArrowRightLeft,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Receipt,
  Search,
  Sparkles,
  RefreshCw,
  Tag,
  FileCheck,
  Percent,
  Check,
  X,
  Target,
  FileSpreadsheet,
  ShieldAlert,
  Lock,
  Award,
  Coins,
  Heart
} from 'lucide-react';
import {
  BankAccount,
  BankAccountType,
  IncomeRecord,
  ExpenseRecord,
  MemberContributionRecord,
  MemberContributionSetting,
  BudgetStats,
  AccountTransferRecord,
  IncomeCategory,
  ExpenseCategory,
  CategoryBudgetAllocation
} from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { AnnualContributionMatrix } from '../../components/portal/budget/AnnualContributionMatrix';
import { CategoryAllocationsTab } from '../../components/portal/budget/CategoryAllocationsTab';
import { BudgetReportsTab } from '../../components/portal/budget/BudgetReportsTab';

type BudgetTab = 'dashboard' | 'income' | 'expenses' | 'fund_manager' | 'allocations' | 'accounts' | 'settings' | 'reports';

export const BudgetPage: React.FC = () => {
  const { user, hasPermission, loading: authLoading } = useAuth();
  const { lang, dir } = usePortalLanguage();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Permission checks
  const canViewBudget = hasPermission('budget', 'canView');
  const canCreate = hasPermission('budget', 'canCreate');
  const canEdit = hasPermission('budget', 'canEdit');
  const canDelete = hasPermission('budget', 'canDelete');
  const canApprove = hasPermission('budget', 'canApprove');
  const canExport = hasPermission('budget', 'canExport');
  const canManageSettings = hasPermission('budget', 'canManageSettings');

  const tabParam = searchParams.get('tab') as BudgetTab | null;
  const initialTab: BudgetTab = (tabParam && ['dashboard', 'income', 'expenses', 'fund_manager', 'allocations', 'accounts', 'settings', 'reports'].includes(tabParam))
    ? tabParam
    : 'dashboard';

  const [activeTab, setActiveTab] = useState<BudgetTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (tabParam && ['dashboard', 'income', 'expenses', 'fund_manager', 'allocations', 'accounts', 'settings', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab: BudgetTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Data states
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<AccountTransferRecord[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [contributions, setContributions] = useState<MemberContributionRecord[]>([]);
  const [allocations, setAllocations] = useState<CategoryBudgetAllocation[]>([]);
  const [settings, setSettings] = useState<MemberContributionSetting | null>(null);
  const [membersList, setMembersList] = useState<any[]>([]);

  // View modes
  const [fundViewMode, setFundViewMode] = useState<'roster' | 'annual_matrix'>('roster');

  // Modals state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeRecord | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedMemberForPay, setSelectedMemberForPay] = useState<any | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState<any | null>(null);

  // Filter states
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState<string>('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<string>('all');
  const [fundMonthFilter, setFundMonthFilter] = useState<number>(new Date().getMonth() + 1);
  const [fundStatusFilter, setFundStatusFilter] = useState<string>('all');
  const [fundSearchTerm, setFundSearchTerm] = useState<string>('');

  // Account Form State
  const [accountForm, setAccountForm] = useState<{
    accountName: string;
    accountNumber: string;
    bankName: string;
    type: BankAccountType;
    currency: string;
    openingBalance: number;
    currentBalance: number;
    status: 'active' | 'inactive';
    notes: string;
  }>({
    accountName: '',
    accountNumber: '',
    bankName: 'Bank of Maldives (BML)',
    type: 'bank',
    currency: 'MVR',
    openingBalance: 0,
    currentBalance: 0,
    status: 'active',
    notes: ''
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 100,
    date: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    notes: ''
  });

  // Income Form State
  const [incomeForm, setIncomeForm] = useState<{
    title: string;
    category: IncomeCategory;
    amount: number;
    date: string;
    accountId: string;
    paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'gateway' | 'other';
    referenceNumber: string;
    receivedFrom: string;
    payerMemberId?: string;
    notes: string;
    status: 'received' | 'pending' | 'cancelled';
  }>({
    title: '',
    category: 'member_contribution',
    amount: 100,
    date: new Date().toISOString().slice(0, 10),
    accountId: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    receivedFrom: '',
    payerMemberId: '',
    notes: '',
    status: 'received'
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState<{
    title: string;
    category: ExpenseCategory;
    amount: number;
    date: string;
    accountId: string;
    paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'card' | 'other';
    referenceNumber: string;
    payee: string;
    approvedBy: string;
    status: 'paid' | 'pending_approval' | 'rejected';
    receiptNumber: string;
    notes: string;
  }>({
    title: '',
    category: 'event_logistics',
    amount: 100,
    date: new Date().toISOString().slice(0, 10),
    accountId: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    payee: '',
    approvedBy: '',
    status: 'paid',
    receiptNumber: '',
    notes: ''
  });

  // Contribution Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    memberId: '',
    year: new Date().getFullYear(),
    paymentType: 'single_month' as 'single_month' | 'annual_advance' | 'custom_months',
    month: new Date().getMonth() + 1,
    startMonth: 1,
    endMonth: 12,
    waiveFine: false,
    accountId: '',
    paymentMethod: 'bank_transfer' as const,
    referenceNumber: '',
    notes: ''
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<MemberContributionSetting>({
    monthlyFee: 100,
    dueDayOfMonth: 10,
    finePerDay: 5,
    annualAdvanceDiscountMonths: 1,
    currency: 'MVR',
    defaultDepositAccountId: '',
    enableAutoFines: true,
    gracePeriodDays: 0,
    updatedAt: new Date().toISOString()
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        statsData,
        accountsData,
        transfersData,
        incomeData,
        expensesData,
        contributionsData,
        allocationsData,
        settingsData,
        membersData
      ] = await Promise.all([
        api.getBudgetStats(selectedYear),
        api.getBankAccounts(),
        api.getAccountTransfers().catch(() => []),
        api.getIncomeRecords(),
        api.getExpenseRecords(),
        api.getMemberContributions({ year: selectedYear }),
        api.getBudgetAllocations(selectedYear).catch(() => []),
        api.getContributionSettings(),
        api.getMembers()
      ]);

      setStats(statsData);
      setAccounts(accountsData);
      setTransfers(transfersData);
      setIncomeRecords(incomeData);
      setExpenseRecords(expensesData);
      setContributions(contributionsData);
      setAllocations(allocationsData);
      setSettings(settingsData);
      setSettingsForm(settingsData);
      setMembersList(membersData);

      if (accountsData.length > 0) {
        setTransferForm(prev => ({
          ...prev,
          fromAccountId: accountsData[0].id,
          toAccountId: accountsData[1]?.id || accountsData[0].id
        }));
        setIncomeForm(prev => ({ ...prev, accountId: accountsData[0].id }));
        setExpenseForm(prev => ({ ...prev, accountId: accountsData[0].id }));
        setPaymentForm(prev => ({ ...prev, accountId: accountsData[0].id }));
      }
    } catch (err: any) {
      showToast('error', 'Failed to load budget data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // --- Handlers for Category Allocations ---
  const handleSaveAllocation = async (data: Partial<CategoryBudgetAllocation>) => {
    try {
      await api.saveBudgetAllocation(data);
      showToast('success', 'Budget allocation saved successfully');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save allocation');
    }
  };

  const handleDeleteAllocation = async (id: string) => {
    if (!window.confirm('Remove this category budget allocation ceiling?')) return;
    try {
      await api.deleteBudgetAllocation(id);
      showToast('success', 'Allocation ceiling removed');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete allocation');
    }
  };

  // --- Handlers for Expense Approvals ---
  const handleApproveExpense = async (expense: ExpenseRecord) => {
    try {
      await api.updateExpenseRecord(expense.id, {
        status: 'paid',
        approvedBy: user?.fullName || 'Executive Officer'
      });
      showToast('success', `Expense "${expense.title}" approved and marked as paid`);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve expense');
    }
  };

  const handleRejectExpense = async (expense: ExpenseRecord) => {
    if (!window.confirm(`Reject expense request "${expense.title}"?`)) return;
    try {
      await api.updateExpenseRecord(expense.id, {
        status: 'rejected',
        approvedBy: `${user?.fullName || 'Executive Officer'} (Rejected)`
      });
      showToast('success', `Expense "${expense.title}" rejected`);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject expense');
    }
  };

  // --- CSV Export Handlers ---
  const exportIncomeCsv = () => {
    const headers = 'ID,Title,Category,Amount(MVR),Date,Account,PaymentMethod,ReferenceNumber,ReceivedFrom,Status\n';
    const rows = incomeRecords.map(i => 
      `"${i.id}","${(i.title || '').replace(/"/g, '""')}","${i.category}",${i.amount},"${i.date}","${i.accountName || ''}","${i.paymentMethod}","${i.referenceNumber || ''}","${(i.receivedFrom || '').replace(/"/g, '""')}","${i.status}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ARC_Income_Register_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExpenseCsv = () => {
    const headers = 'ID,Title,Category,Amount(MVR),Date,Account,PaymentMethod,ReferenceNumber,Payee,ApprovedBy,Status,ReceiptNumber\n';
    const rows = expenseRecords.map(e => 
      `"${e.id}","${(e.title || '').replace(/"/g, '""')}","${e.category}",${e.amount},"${e.date}","${e.accountName || ''}","${e.paymentMethod}","${e.referenceNumber || ''}","${(e.payee || '').replace(/"/g, '""')}","${(e.approvedBy || '').replace(/"/g, '""')}","${e.status}","${e.receiptNumber || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ARC_Expense_Register_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportContributionsCsv = () => {
    const headers = 'MemberID,MemberName,MemberNumber,Year,Month,BaseFee,Discount,LateFine,FineDays,TotalPayable,PaidAmount,DueDate,PaidDate,Status,ReceiptNumber\n';
    const rows = contributions.map(c => 
      `"${c.memberId}","${c.memberName}","${c.memberNumber}",${c.year},${c.month},${c.baseAmount},${c.discountAmount},${c.fineAmount},${c.fineDays},${c.totalPayable},${c.paidAmount || 0},"${c.dueDate}","${c.paidDate || ''}","${c.status}","${c.receiptNumber || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ARC_Member_Contributions_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Handlers for Bank Accounts ---
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.updateBankAccount(editingAccount.id, accountForm);
        showToast('success', 'Account updated successfully');
      } else {
        await api.createBankAccount(accountForm);
        showToast('success', 'New account created successfully');
      }
      setAccountModalOpen(false);
      setEditingAccount(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bank account?')) return;
    try {
      await api.deleteBankAccount(id);
      showToast('success', 'Account deleted successfully');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete account');
    }
  };

  const handleTransferFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.transferAccountFunds(transferForm);
      showToast('success', `Funds transferred: ${transferForm.amount} MVR`);
      setTransferModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Transfer failed');
    }
  };

  // --- Handlers for Income ---
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingIncome) {
        await api.updateIncomeRecord(editingIncome.id, incomeForm);
        showToast('success', 'Income record updated');
      } else {
        await api.createIncomeRecord(incomeForm);
        showToast('success', 'Income record created');
      }
      setIncomeModalOpen(false);
      setEditingIncome(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save income');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!window.confirm('Delete this income record?')) return;
    try {
      await api.deleteIncomeRecord(id);
      showToast('success', 'Income record deleted');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete income');
    }
  };

  // --- Handlers for Expense ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.updateExpenseRecord(editingExpense.id, expenseForm);
        showToast('success', 'Expense record updated');
      } else {
        await api.createExpenseRecord(expenseForm);
        showToast('success', 'Expense record recorded');
      }
      setExpenseModalOpen(false);
      setEditingExpense(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await api.deleteExpenseRecord(id);
      showToast('success', 'Expense record deleted');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete expense');
    }
  };

  // --- Handlers for Member Contributions ---
  const openPayModalForMember = (member: any, defaultMonth?: number) => {
    setSelectedMemberForPay(member);
    const targetMonth = defaultMonth || fundMonthFilter || (new Date().getMonth() + 1);
    setPaymentForm({
      memberId: member.id,
      year: selectedYear,
      paymentType: 'single_month',
      month: targetMonth,
      startMonth: 1,
      endMonth: 12,
      waiveFine: false,
      accountId: accounts[0]?.id || '',
      paymentMethod: 'bank_transfer',
      referenceNumber: `ARC-FEE-${Date.now().toString().slice(-4)}`,
      notes: ''
    });
    setPayModalOpen(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.processContributionPayment(paymentForm);
      showToast('success', `Payment processed: ${result.totalPaid} MVR. (Discount: ${result.discountGiven} MVR)`);
      setPayModalOpen(false);
      
      // Open receipt preview
      setCurrentReceiptData({
        member: selectedMemberForPay,
        result,
        paymentForm
      });
      setReceiptModalOpen(true);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process payment');
    }
  };

  // --- Handlers for Settings ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateContributionSettings(settingsForm);
      setSettings(updated);
      showToast('success', 'Contribution settings saved successfully');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update settings');
    }
  };

  // Helper calculations for payment modal
  const calcModalPayable = () => {
    if (!settings) return { base: 0, discount: 0, fine: 0, total: 0 };
    const monthlyFee = settings.monthlyFee;
    if (paymentForm.paymentType === 'annual_advance') {
      const base = monthlyFee * 12;
      const discount = monthlyFee * (settings.annualAdvanceDiscountMonths || 1);
      const total = base - discount;
      return { base, discount, fine: 0, total };
    } else if (paymentForm.paymentType === 'single_month') {
      const targetRecord = contributions.find(
        c => c.memberId === paymentForm.memberId && c.year === paymentForm.year && c.month === paymentForm.month
      );
      const fine = paymentForm.waiveFine ? 0 : (targetRecord?.fineAmount || 0);
      const total = monthlyFee + fine;
      return { base: monthlyFee, discount: 0, fine, total };
    } else {
      const count = Math.max(1, (paymentForm.endMonth - paymentForm.startMonth + 1));
      const base = monthlyFee * count;
      const discount = count === 12 ? monthlyFee * (settings.annualAdvanceDiscountMonths || 1) : 0;
      const total = base - discount;
      return { base, discount, fine: 0, total };
    }
  };

  const modalCalc = calcModalPayable();

  const monthNames = [
    { num: 1, nameEn: 'January', nameDv: 'ޖެނުއަރީ' },
    { num: 2, nameEn: 'February', nameDv: 'ފެބްރުއަރީ' },
    { num: 3, nameEn: 'March', nameDv: 'މާރިޗު' },
    { num: 4, nameEn: 'April', nameDv: 'އޭޕްރީލް' },
    { num: 5, nameEn: 'May', nameDv: 'މެއި' },
    { num: 6, nameEn: 'June', nameDv: 'ޖޫން' },
    { num: 7, nameEn: 'July', nameDv: 'ޖުލައި' },
    { num: 8, nameEn: 'August', nameDv: 'އޮގަސްޓް' },
    { num: 9, nameEn: 'September', nameDv: 'ސެޕްޓެމްބަރ' },
    { num: 10, nameEn: 'October', nameDv: 'އޮކްޓޯބަރ' },
    { num: 11, nameEn: 'November', nameDv: 'ނޮވެމްބަރ' },
    { num: 12, nameEn: 'December', nameDv: 'ޑިސެމްބަރ' }
  ];

  if (!authLoading && !canViewBudget) {
    return (
      <PortalLayout currentModule="budget" title={lang === 'english' ? 'Budget & Finance Module' : 'ބަޖެޓާއި މާލީ މޮޑިއުލް'}>
        <div className="p-8 sm:p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 my-8 max-w-2xl mx-auto shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-heading">ހުއްދައެއް ނެތް (Access Restricted)</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {lang === 'english'
                ? 'Access to the Budget & Finance module is restricted to Administrators and assigned finance officers. If you need access, please contact the System Administrator.'
                : 'ބަޖެޓާއި މާލީ މޮޑިއުލް ބެއްލެވޭނީ ސިސްޓަމް އެޑްމިނިސްޓްރޭޓަރުންނާއި، މި މޮޑިއުލްއަށް ޚާއްސަ ހުއްދަ ދެވިފައިވާ ޔޫޒަރުންނަށް އެކަނިއެވެ. ހުއްދަ ހޯއްދެވުމަށް އެޑްމިންއަށް ގުޅުއްވާ.'}
            </p>
          </div>
          <div className="pt-4">
            <Link
              to="/portal"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors border border-slate-700 shadow-sm"
            >
              <span>ޑޭޝްބޯޑަށް އެނބުރިދިއުން (Return to Dashboard)</span>
            </Link>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout currentModule="budget" title={lang === 'english' ? 'Budget & Finance Module' : 'ބަޖެޓާއި މާލީ މޮޑިއުލް'}>
      
      {/* Top Header & Navigation Bar */}
      <div className="space-y-6">
        
        {/* Module Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5" />
                <span>ARC Finance & Treasury</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                {selectedYear} Fiscal Year
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              {lang === 'english' ? 'Club Budget & Financial Control' : 'ކްލަބުގެ ބަޖެޓާއި ފައިސާގެ ނިޒާމު'}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
              {lang === 'english'
                ? 'Manage club bank accounts, real-time revenue and expenditure tracking, member monthly contributions with daily late fines, and annual advance discount calculations.'
                : 'ކްލަބުގެ އެކައުންޓްތައް، އާމްދަނީ، ޚަރަދު އަދި މެންބަރުންގެ މަހު ފީ ބެލެހެއްޓުމާއި ލަސްވާ ދުވަސްތަކުގެ ޖޫރިމަނާއާއި އަހަރީ އެޑްވާންސް ޑިސްކައުންޓް ބަލަހައްޓާ މޮޑިއުލް.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              aria-label="Select Fiscal Year"
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{lang === 'english' ? 'Refresh' : 'އާކޮށްލާ'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none shadow-sm">
          {[
            { id: 'dashboard', labelEn: 'Module Dashboard', labelDv: 'ޑޭޝްބޯޑު', icon: TrendingUp },
            { id: 'income', labelEn: 'Income Tracker', labelDv: 'އާމްދަނީ', icon: DollarSign },
            { id: 'expenses', labelEn: 'Expenses Tracker', labelDv: 'ޚަރަދުތައް', icon: TrendingDown },
            { id: 'allocations', labelEn: 'Budget Ceilings & Targets', labelDv: 'ބަޖެޓް ލިމިޓްތައް', icon: Target },
            { id: 'fund_manager', labelEn: 'Members Fund Manager', labelDv: 'މެންބަރުންގެ ފަންޑު', icon: Users },
            { id: 'accounts', labelEn: 'Accounts Manager', labelDv: 'އެކައުންޓްތައް', icon: Building2 },
            { id: 'reports', labelEn: 'Reports & Statements', labelDv: 'މާލީ ރިޕޯޓްތައް', icon: FileSpreadsheet },
            { id: 'settings', labelEn: 'Module Settings', labelDv: 'މޮޑިއުލް ސެޓިންގްސް', icon: SettingsIcon }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as BudgetTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{lang === 'english' ? tab.labelEn : tab.labelDv}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MODULE DASHBOARD */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            
            {/* Top Key Financial KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Total Bank & Cash Balances */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === 'english' ? 'Total Liquid Balance' : 'ޖުމްލަ އެކައުންޓް ފައިސާ'}
                  </span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {stats.totalAccountsBalance.toLocaleString()} <span className="text-xs font-normal text-blue-400">MVR</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>{accounts.length} Active Accounts (BML, MIB, Petty Cash)</span>
                </div>
              </div>

              {/* Total Revenue / Income */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === 'english' ? 'Total Income Received' : 'ޖުމްލަ ލިބުނު އާމްދަނީ'}
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  +{stats.totalIncome.toLocaleString()} <span className="text-xs font-normal text-slate-400">MVR</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
                  <span>Contributions, Sponsors & Donations</span>
                </div>
              </div>

              {/* Total Expenses */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === 'english' ? 'Total Expenses Disbursed' : 'ޖުމްލަ ހިނގި ޚަރަދު'}
                  </span>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
                  -{stats.totalExpenses.toLocaleString()} <span className="text-xs font-normal text-slate-400">MVR</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400/80">
                  <span>Events, Prizes, Hall & Refreshments</span>
                </div>
              </div>

              {/* Net Surplus / Deficit */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {lang === 'english' ? 'Net Operating Balance' : 'ސާފު ބާކީ (Net)'}
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${stats.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.netBalance >= 0 ? `+${stats.netBalance.toLocaleString()}` : stats.netBalance.toLocaleString()} <span className="text-xs font-normal text-slate-400">MVR</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Fiscal Health: {stats.netBalance >= 0 ? 'Surplus Positive' : 'Deficit Watch'}</span>
                </div>
              </div>

            </div>

            {/* Middle Section: Member Contributions Health & Monthly Cashflow Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Member Contribution Collection Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {lang === 'english' ? 'Members Contribution Health' : 'މެންބަރުންގެ ފީ ޙާލަތު'}
                      </h3>
                      <p className="text-slate-400 text-[11px]">Year {selectedYear} Collection Progress</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fund_manager')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    View Fund Manager →
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold">Collected</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {stats.totalContributionsCollected.toLocaleString()} MVR
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold">Late Fines Collected</span>
                    <span className="text-lg font-bold text-amber-400 font-mono">
                      {stats.totalFinesCollected.toLocaleString()} MVR
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold">Pending ({stats.pendingContributionsCount})</span>
                    <span className="text-lg font-bold text-slate-300 font-mono">
                      {stats.pendingContributionsAmount.toLocaleString()} MVR
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[11px] text-rose-400 block font-semibold">Overdue ({stats.overdueContributionsCount})</span>
                    <span className="text-lg font-bold text-rose-400 font-mono">
                      {stats.overdueContributionsAmount.toLocaleString()} MVR
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                  <Percent className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Annual 1-Month Discount Incentive Active</span>
                    <span className="text-[11px] text-emerald-300/80">
                      Members paying 1 full year in advance automatically receive 1 month free (Pay 1,100 MVR instead of 1,200 MVR).
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Income vs Expense Flow */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {lang === 'english' ? 'Monthly Cash Flow Analysis' : 'މަހުން މަހަށް އާމްދަނީއާއި ޚަރަދު'}
                      </h3>
                      <p className="text-slate-400 text-[11px]">Fiscal Comparison across 12 months</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                      <span className="text-slate-300">Income</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-rose-500" />
                      <span className="text-slate-300">Expenses</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4">
                  {stats.monthlyFlow.map((flow, idx) => {
                    const maxVal = Math.max(...stats.monthlyFlow.map(f => Math.max(f.income, f.expense, 1000)));
                    const incomeHeight = Math.max(10, Math.round((flow.income / maxVal) * 90));
                    const expenseHeight = Math.max(10, Math.round((flow.expense / maxVal) * 90));

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="h-28 w-full flex items-end justify-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
                          <div
                            style={{ height: `${incomeHeight}%` }}
                            className="w-2.5 sm:w-3 bg-emerald-500 rounded-t-sm transition-all"
                            title={`Income: ${flow.income} MVR`}
                          />
                          <div
                            style={{ height: `${expenseHeight}%` }}
                            className="w-2.5 sm:w-3 bg-rose-500 rounded-t-sm transition-all"
                            title={`Expense: ${flow.expense} MVR`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{flow.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Bottom Row: Recent Financial Transactions & Category Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Category Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'english' ? 'Income & Expense Categories' : 'ބަޖެޓު ކެޓަގަރީތައް'}</span>
                </h3>

                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Top Incomes</span>
                  {stats.categoryIncome.map((c, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{c.categoryLabel}</span>
                        <span className="text-emerald-400 font-mono font-bold">{c.amount.toLocaleString()} MVR ({c.percentage}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div style={{ width: `${c.percentage}%` }} className="h-full bg-emerald-500 rounded-full" />
                      </div>
                    </div>
                  ))}

                  <div className="pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Top Expenses</span>
                  </div>
                  {stats.categoryExpense.map((c, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{c.categoryLabel}</span>
                        <span className="text-rose-400 font-mono font-bold">{c.amount.toLocaleString()} MVR ({c.percentage}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div style={{ width: `${c.percentage}%` }} className="h-full bg-rose-500 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions Feed */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-orange-400" />
                    <span>{lang === 'english' ? 'Latest Ledger Transactions' : 'އެންމެ ފަހުގެ މުޢާމަލާތްތައް'}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('income')}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-emerald-400"
                    >
                      + Add Income
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('expenses')}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-rose-400"
                    >
                      + Add Expense
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
                  {stats.recentTransactions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">No ledger entries recorded yet.</div>
                  ) : (
                    stats.recentTransactions.map(tx => (
                      <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">{tx.title}</span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span className="capitalize">{tx.category.replace(/_/g, ' ')}</span>
                              <span>•</span>
                              <span className="text-slate-500">{tx.accountName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} MVR
                          </span>
                          <span className="block text-[10px] text-slate-500 capitalize">{tx.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: INCOME TRACKER */}
        {activeTab === 'income' && (
          <div className="space-y-6">
            
            {/* Income Highlights & Contribution Calculation Summary */}
            {(() => {
              const totalInc = incomeRecords.reduce((s, i) => s + Number(i.amount || 0), 0);
              const memberContribInc = incomeRecords
                .filter(i => i.category === 'member_contribution')
                .reduce((s, i) => s + Number(i.amount || 0), 0);
              const sponsorshipInc = incomeRecords
                .filter(i => i.category === 'sponsorship' || i.category === 'donation' || i.category === 'grant')
                .reduce((s, i) => s + Number(i.amount || 0), 0);
              const otherInc = totalInc - memberContribInc - sponsorshipInc;
              const contribPct = totalInc > 0 ? Math.round((memberContribInc / totalInc) * 100) : 0;
              const contribCount = incomeRecords.filter(i => i.category === 'member_contribution').length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>ޖުމްލަ އާމްދަނީ (Total Income)</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xl font-bold text-white font-mono">{formatCurrency(totalInc)}</p>
                    <p className="text-[11px] text-slate-500">{incomeRecords.length} ރެކޯޑް ޖަމާކުރެވިފައި</p>
                  </div>

                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-1.5 relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-emerald-400">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        މެންބަރޝިޕް ފީ (Member Contributions)
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded font-mono">
                        {contribPct}%
                      </span>
                    </div>
                    <p className="text-xl font-bold text-emerald-400 font-mono">{formatCurrency(memberContribInc)}</p>
                    <p className="text-[11px] text-emerald-300/80">{contribCount} ފަހަރު އާމްދަނީގެ ގޮތުގައި ލިބިފައި</p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>ސްޕޮންސަރ އަދި އެހީ (Sponsorship/Donation)</span>
                      <Award className="w-4 h-4 text-sky-400" />
                    </div>
                    <p className="text-xl font-bold text-sky-400 font-mono">{formatCurrency(sponsorshipInc)}</p>
                    <p className="text-[11px] text-slate-500">ކޯޕަރޭޓް އަދި އާންމު އެހީ</p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>އެހެނިހެން އާމްދަނީ (Other Revenue)</span>
                      <Coins className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-xl font-bold text-amber-400 font-mono">{formatCurrency(otherInc)}</p>
                    <p className="text-[11px] text-slate-500">އިވެންޓް ފީ، މަރޗަންޑައިޒް</p>
                  </div>
                </div>
              );
            })()}

            {/* Header Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">ކެޓަގަރީ (Category):</span>
                </div>
                <select
                  value={incomeCategoryFilter}
                  onChange={e => setIncomeCategoryFilter(e.target.value)}
                  aria-label="Filter income by category"
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold"
                >
                  <option value="all">All Categories (ހުރިހާ ކެޓަގަރީއެއް)</option>
                  <option value="member_contribution">Member Contributions (މެންބަރޝިޕް ފީ)</option>
                  <option value="sponsorship">Sponsorships (ސްޕޮންސަރޝިޕް)</option>
                  <option value="donation">Donations (ހެޔޮއެދޭ ފަރާތްތަކުގެ އެހީ)</option>
                  <option value="event_fee">Event Registration Fees (އިވެންޓް ފީ)</option>
                  <option value="merchandise">Merchandise & Sales (ތަކެތި ވިއްކުން)</option>
                  <option value="grant">Grants & Aid (އެހީ/ގްރާންޓް)</option>
                  <option value="other">Other Revenue (އެހެނިހެން އާމްދަނީ)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportIncomeCsv}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export Income CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingIncome(null);
                    setIncomeForm({
                      title: '',
                      category: 'member_contribution',
                      amount: 100,
                      date: new Date().toISOString().slice(0, 10),
                      accountId: accounts[0]?.id || '',
                      paymentMethod: 'bank_transfer',
                      referenceNumber: '',
                      receivedFrom: '',
                      payerMemberId: '',
                      notes: '',
                      status: 'received'
                    });
                    setIncomeModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer hover:opacity-95 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Income (އާމްދަނީ އިތުރުކުރައްވާ)</span>
                </button>
              </div>
            </div>

            {/* Income Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Income Title & Reference</th>
                      <th className="p-4">Category (ކެޓަގަރީ)</th>
                      <th className="p-4">Received From (ފަރާތް)</th>
                      <th className="p-4">Deposit Account</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Amount (MVR)</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {incomeRecords.filter(i => incomeCategoryFilter === 'all' || i.category === incomeCategoryFilter).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                          މި ކެޓަގަރީގެ އެއްވެސް އާމްދަނީއެއް އަދި ރެކޯޑްކުރެވިފައެއް ނުވޭ
                        </td>
                      </tr>
                    ) : (
                      incomeRecords
                        .filter(i => incomeCategoryFilter === 'all' || i.category === incomeCategoryFilter)
                        .map(inc => (
                          <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                            <td className="p-4">
                              <span className="font-bold text-white block">{inc.title}</span>
                              {inc.referenceNumber && (
                                <span className="text-[10px] text-slate-400 font-mono">Ref: {inc.referenceNumber}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {inc.category === 'member_contribution' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                                  <Users className="w-3 h-3 text-emerald-400" />
                                  މެންބަރޝިޕް ފީ (Member Contribution)
                                </span>
                              ) : inc.category === 'sponsorship' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold text-[11px]">
                                  <Award className="w-3 h-3 text-sky-400" />
                                  ސްޕޮންސަރޝިޕް (Sponsorship)
                                </span>
                              ) : inc.category === 'donation' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold text-[11px]">
                                  <Heart className="w-3 h-3 text-purple-400" />
                                  އެހީ (Donation)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px] capitalize">
                                  {inc.category.replace(/_/g, ' ')}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-300 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span>{inc.receivedFrom}</span>
                              </div>
                            </td>
                            <td className="p-4 text-slate-400">{inc.accountName || 'Bank Account'}</td>
                            <td className="p-4 text-slate-400 font-mono">{inc.date}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                              +{Number(inc.amount).toLocaleString()}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIncome(inc);
                                    setIncomeForm({
                                      title: inc.title,
                                      category: inc.category,
                                      amount: inc.amount,
                                      date: inc.date,
                                      accountId: inc.accountId,
                                      paymentMethod: inc.paymentMethod,
                                      referenceNumber: inc.referenceNumber || '',
                                      receivedFrom: inc.receivedFrom,
                                      payerMemberId: inc.payerMemberId || '',
                                      notes: inc.notes || '',
                                      status: inc.status
                                    });
                                    setIncomeModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteIncome(inc.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: EXPENSES TRACKER */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            
            {/* Header Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">Category:</span>
                </div>
                <select
                  value={expenseCategoryFilter}
                  onChange={e => setExpenseCategoryFilter(e.target.value)}
                  aria-label="Filter expenses by category"
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold"
                >
                  <option value="all">All Categories</option>
                  <option value="event_logistics">Event Logistics</option>
                  <option value="venue_rent">Venue Rent</option>
                  <option value="catering">Catering & Refreshments</option>
                  <option value="prizes_awards">Prizes & Awards</option>
                  <option value="marketing_pr">Marketing & PR</option>
                  <option value="equipment">Equipment</option>
                  <option value="office_admin">Office Admin</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={expenseStatusFilter}
                  onChange={e => setExpenseStatusFilter(e.target.value)}
                  aria-label="Filter expenses by status"
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportExpenseCsv}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>Export Expense CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setExpenseForm({
                      title: '',
                      category: 'event_logistics',
                      amount: 500,
                      date: new Date().toISOString().slice(0, 10),
                      accountId: accounts[0]?.id || '',
                      paymentMethod: 'bank_transfer',
                      referenceNumber: '',
                      payee: '',
                      approvedBy: user ? user.fullName : '',
                      status: 'paid',
                      receiptNumber: '',
                      notes: ''
                    });
                    setExpenseModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record New Expense</span>
                </button>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Expense Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Payee / Vendor</th>
                      <th className="p-4">Disbursed From</th>
                      <th className="p-4">Approved By</th>
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Amount (MVR)</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expenseRecords
                      .filter(e => expenseCategoryFilter === 'all' || e.category === expenseCategoryFilter)
                      .filter(e => expenseStatusFilter === 'all' || e.status === expenseStatusFilter)
                      .map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-4">
                            <span className="font-bold text-white block">{exp.title}</span>
                            {exp.receiptNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">Receipt: {exp.receiptNumber}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 font-semibold text-[11px] capitalize">
                              {exp.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-medium">{exp.payee || 'N/A'}</td>
                          <td className="p-4 text-slate-400">{exp.accountName || 'Bank Account'}</td>
                          <td className="p-4 text-slate-400">{exp.approvedBy || '-'}</td>
                          <td className="p-4 text-slate-400 font-mono">{exp.date}</td>
                          <td className="p-4 text-right font-mono font-bold text-rose-400 text-sm">
                            -{exp.amount.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              exp.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                              exp.status === 'pending_approval' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                              'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {exp.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {exp.status === 'pending_approval' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveExpense(exp)}
                                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-0.5"
                                    title="Approve and mark as paid"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectExpense(exp)}
                                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-0.5"
                                    title="Reject expense request"
                                  >
                                    <X className="w-3.5 h-3.5 stroke-[3]" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingExpense(exp);
                                  setExpenseForm({
                                    title: exp.title,
                                    category: exp.category,
                                    amount: exp.amount,
                                    date: exp.date,
                                    accountId: exp.accountId,
                                    paymentMethod: exp.paymentMethod,
                                    referenceNumber: exp.referenceNumber || '',
                                    payee: exp.payee,
                                    approvedBy: exp.approvedBy || '',
                                    status: exp.status,
                                    receiptNumber: exp.receiptNumber || '',
                                    notes: exp.notes || ''
                                  });
                                  setExpenseModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3.5: CATEGORY BUDGET ALLOCATIONS & CEILINGS */}
        {activeTab === 'allocations' && (
          <CategoryAllocationsTab
            year={selectedYear}
            allocations={allocations}
            onSaveAllocation={handleSaveAllocation}
            onDeleteAllocation={handleDeleteAllocation}
            lang={lang}
          />
        )}

        {/* TAB 4: MEMBERS FUND MANAGER (Monthly Contribution Ledger, Fines & Annual Advance Discount) */}
        {activeTab === 'fund_manager' && (
          <div className="space-y-6">
            
            {/* Rules Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                    Active Bylaw Rules
                  </span>
                  <span className="text-xs text-slate-400">
                    Monthly Fee: <strong className="text-white">{settings?.monthlyFee || 100} MVR</strong>
                  </span>
                  <span className="text-xs text-slate-400">
                    Due Date: <strong className="text-white">Day {settings?.dueDayOfMonth || 10} of month</strong>
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Members Contribution & Fine Reconciliation
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  • <strong>Late Fine Calculation:</strong> Exceeding due date incurs <strong>{settings?.finePerDay || 5} MVR per day</strong> late fine automatically.
                  <br />
                  • <strong>Annual Advance Discount:</strong> Paying 1 full year in advance automatically deducts <strong>1 month contribution free ({settings?.monthlyFee || 100} MVR discount)</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
                {/* View Mode Toggle */}
                <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFundViewMode('roster')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      fundViewMode === 'roster'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly Roster
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundViewMode('annual_matrix')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      fundViewMode === 'annual_matrix'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>12-Month Matrix</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SettingsIcon className="w-4 h-4 text-emerald-400" />
                  <span>Edit Fee & Fine Rules</span>
                </button>
              </div>
            </div>

            {/* Matrix View or Roster View */}
            {fundViewMode === 'annual_matrix' ? (
              <AnnualContributionMatrix
                year={selectedYear}
                membersList={membersList}
                contributions={contributions}
                onOpenPayModal={openPayModalForMember}
                onOpenReceipt={(rec, linkedMember) => {
                  setCurrentReceiptData({
                    member: linkedMember || { fullName: rec.memberName, memberNumber: rec.memberNumber },
                    result: {
                      incomeRecord: {
                        referenceNumber: rec.receiptNumber || rec.referenceNumber || 'TXN-PAID',
                        date: rec.paidDate || rec.updatedAt.slice(0, 10),
                        paymentMethod: rec.paymentMethod || 'bank_transfer',
                        accountName: rec.accountName || 'Bank of Maldives'
                      },
                      totalPaid: rec.paidAmount || rec.totalPayable,
                      discountGiven: rec.discountAmount,
                      finesCollected: rec.fineAmount
                    },
                    paymentForm: {
                      year: rec.year,
                      month: rec.month,
                      paymentType: rec.isAdvancePayment ? 'annual_advance' : 'single_month'
                    }
                  });
                  setReceiptModalOpen(true);
                }}
                onExportCsv={exportContributionsCsv}
                lang={lang}
              />
            ) : (
              <>
                {/* Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-300">Month:</span>
                    </div>
                    <select
                      value={fundMonthFilter}
                      onChange={e => setFundMonthFilter(Number(e.target.value))}
                      aria-label="Filter by month"
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold"
                    >
                      {monthNames.map(m => (
                        <option key={m.num} value={m.num}>
                          {m.nameEn} ({m.nameDv})
                        </option>
                      ))}
                    </select>

                    <select
                      value={fundStatusFilter}
                      onChange={e => setFundStatusFilter(e.target.value)}
                      aria-label="Filter by status"
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 font-bold"
                    >
                      <option value="all">All Statuses</option>
                      <option value="paid">Paid Only</option>
                      <option value="pending">Pending Only</option>
                      <option value="overdue">Overdue (With Fines)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={exportContributionsCsv}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export CSV</span>
                    </button>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search member name / number..."
                        value={fundSearchTerm}
                        onChange={e => setFundSearchTerm(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-1.5 focus:ring-2 focus:ring-emerald-500 w-64"
                      />
                    </div>
                  </div>
                </div>

                {/* Member Contributions Ledger Grid */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-4">Member Info</th>
                          <th className="p-4">Target Period</th>
                          <th className="p-4">Due Date</th>
                          <th className="p-4">Base Fee</th>
                          <th className="p-4">Discount</th>
                          <th className="p-4">Late Fine</th>
                          <th className="p-4 text-right">Total Payable</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {contributions
                          .filter(c => fundMonthFilter === 0 || c.month === fundMonthFilter)
                          .filter(c => fundStatusFilter === 'all' || c.status === fundStatusFilter)
                          .filter(c => !fundSearchTerm || c.memberName.toLowerCase().includes(fundSearchTerm.toLowerCase()) || c.memberNumber.toLowerCase().includes(fundSearchTerm.toLowerCase()))
                          .map(record => {
                            const isOverdue = record.status === 'overdue';
                            const isPaid = record.status === 'paid';
                            const linkedMember = membersList.find(m => m.id === record.memberId);

                            return (
                              <tr key={record.id} className="hover:bg-slate-800/40 transition">
                                <td className="p-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                      {record.memberName.charAt(0)}
                                    </div>
                                    <div>
                                      <span className="font-bold text-white block">{record.memberName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">{record.memberNumber}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className="font-bold text-slate-200">
                                    {monthNames.find(m => m.num === record.month)?.nameEn} {record.year}
                                  </span>
                                  {record.isAdvancePayment && (
                                    <span className="block text-[10px] text-emerald-400 font-semibold">
                                      ★ Annual Advance Paid
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 font-mono text-slate-400">{record.dueDate}</td>
                                <td className="p-4 font-mono font-bold text-slate-300">{record.baseAmount} MVR</td>
                                <td className="p-4 font-mono text-emerald-400">
                                  {record.discountAmount > 0 ? `-${record.discountAmount} MVR` : '-'}
                                </td>
                                <td className="p-4 font-mono">
                                  {record.fineAmount > 0 ? (
                                    <span className="text-rose-400 font-bold">
                                      +{record.fineAmount} MVR <span className="text-[10px] text-slate-400 font-normal">({record.fineDays}d)</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">0 MVR</span>
                                  )}
                                </td>
                                <td className="p-4 text-right font-mono font-bold text-sm">
                                  <span className={isPaid ? 'text-emerald-400' : isOverdue ? 'text-rose-400' : 'text-slate-200'}>
                                    {record.totalPayable.toLocaleString()} MVR
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    isPaid
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : isOverdue
                                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {record.status}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  {isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCurrentReceiptData({
                                          member: linkedMember || { fullName: record.memberName, memberNumber: record.memberNumber },
                                          result: {
                                            incomeRecord: {
                                              referenceNumber: record.receiptNumber || record.referenceNumber || 'TXN-PAID',
                                              date: record.paidDate || record.updatedAt.slice(0, 10),
                                              paymentMethod: record.paymentMethod || 'bank_transfer',
                                              accountName: record.accountName || 'Bank of Maldives'
                                            },
                                            totalPaid: record.paidAmount || record.totalPayable,
                                            discountGiven: record.discountAmount,
                                            finesCollected: record.fineAmount
                                          },
                                          paymentForm: {
                                            year: record.year,
                                            month: record.month,
                                            paymentType: record.isAdvancePayment ? 'annual_advance' : 'single_month'
                                          }
                                        });
                                        setReceiptModalOpen(true);
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 mx-auto"
                                    >
                                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Receipt</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openPayModalForMember(linkedMember || { id: record.memberId, fullName: record.memberName, memberNumber: record.memberNumber }, record.month)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 mx-auto shadow-sm"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      <span>Collect Pay</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* TAB 5: ACCOUNTS MANAGER */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="font-bold text-white text-sm">Liquid Bank & Cash Repositories</h3>
                <p className="text-slate-400 text-xs">All ARC financial vaults, deposit accounts, and petty cash balances</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTransferForm({
                      fromAccountId: accounts[0]?.id || '',
                      toAccountId: accounts[1]?.id || accounts[0]?.id || '',
                      amount: 500,
                      date: new Date().toISOString().slice(0, 10),
                      referenceNumber: '',
                      notes: ''
                    });
                    setTransferModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
                >
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  <span>Transfer Funds</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount(null);
                    setAccountForm({
                      accountName: '',
                      accountNumber: '',
                      bankName: 'Bank of Maldives (BML)',
                      type: 'bank',
                      currency: 'MVR',
                      openingBalance: 0,
                      currentBalance: 0,
                      status: 'active',
                      notes: ''
                    });
                    setAccountModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Bank Account</span>
                </button>
              </div>
            </div>

            {/* Bank Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {accounts.map(acc => (
                <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      acc.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {acc.status}
                    </span>
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                      {acc.type === 'cash' ? <Wallet className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-base">{acc.accountName}</h4>
                    <span className="text-xs text-slate-400 font-mono block pt-0.5">{acc.bankName}</span>
                    {acc.accountNumber && (
                      <span className="text-xs text-emerald-400/90 font-mono block pt-1">
                        Acc: {acc.accountNumber}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Current Balance</span>
                    <div className="text-2xl font-extrabold text-white font-mono pt-1">
                      {acc.currentBalance.toLocaleString()} <span className="text-xs font-normal text-emerald-400">{acc.currency}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAccount(acc);
                        setAccountForm({
                          accountName: acc.accountName,
                          accountNumber: acc.accountNumber,
                          bankName: acc.bankName,
                          type: acc.type,
                          currency: acc.currency,
                          openingBalance: acc.openingBalance,
                          currentBalance: acc.currentBalance,
                          status: acc.status,
                          notes: acc.notes || ''
                        });
                        setAccountModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Inter-Account Transfers History */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                <span>Inter-Account Transfers Log</span>
              </h3>

              {transfers.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">No internal account transfers recorded yet.</div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {transfers.map(trf => (
                    <div key={trf.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-200">
                          <span>{trf.fromAccountName}</span>
                          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                          <span>{trf.toAccountName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <span>{trf.date}</span> • <span>Ref: {trf.referenceNumber}</span> • <span>By: {trf.createdBy}</span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-sm text-blue-400">
                        {trf.amount.toLocaleString()} MVR
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 6: MODULE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-white">Membership Fee & Fine Rules Configuration</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Adjust default membership dues, due dates, daily overdue fines, and advance payment discount policies.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Monthly Contribution Fee (MVR)</label>
                    <input
                      type="number"
                      min={0}
                      value={settingsForm.monthlyFee}
                      onChange={e => setSettingsForm({ ...settingsForm, monthlyFee: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Monthly Payment Due Day</label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={settingsForm.dueDayOfMonth}
                      onChange={e => setSettingsForm({ ...settingsForm, dueDayOfMonth: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500">e.g. 10th of every month</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Late Payment Fine Per Day (MVR)</label>
                    <input
                      type="number"
                      min={0}
                      value={settingsForm.finePerDay}
                      onChange={e => setSettingsForm({ ...settingsForm, finePerDay: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500">Amount charged per day past due date</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Annual Advance Payment Discount (Months)</label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={settingsForm.annualAdvanceDiscountMonths}
                      onChange={e => setSettingsForm({ ...settingsForm, annualAdvanceDiscountMonths: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                      required
                    />
                    <span className="text-[10px] text-emerald-400">1 month discount gives 1 month free when paying full 12 months</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Grace Period (Days)</label>
                    <input
                      type="number"
                      min={0}
                      value={settingsForm.gracePeriodDays}
                      onChange={e => setSettingsForm({ ...settingsForm, gracePeriodDays: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Default Deposit Account</label>
                    <select
                      value={settingsForm.defaultDepositAccountId}
                      onChange={e => setSettingsForm({ ...settingsForm, defaultDepositAccountId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.accountName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.enableAutoFines}
                      onChange={e => setSettingsForm({ ...settingsForm, enableAutoFines: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-800"
                    />
                    <span className="text-xs font-bold text-slate-200">Automatically calculate and apply daily overdue fines</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    Save Rules Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 8: FINANCIAL REPORTS & STATEMENTS */}
        {activeTab === 'reports' && (
          <BudgetReportsTab
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            accounts={accounts}
            incomeRecords={incomeRecords}
            expenseRecords={expenseRecords}
            contributions={contributions}
            allocations={allocations}
            settings={settings}
            membersList={membersList}
            canExport={canExport}
          />
        )}

      </div>

      {/* --- MODAL 1: ADD/EDIT BANK ACCOUNT --- */}
      {accountModalOpen && (
        <Modal
          isOpen={accountModalOpen}
          onClose={() => setAccountModalOpen(false)}
          title={editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
        >
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Account Label / Name</label>
              <input
                type="text"
                value={accountForm.accountName}
                onChange={e => setAccountForm({ ...accountForm, accountName: e.target.value })}
                placeholder="e.g. Bank of Maldives - Main Operating"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Bank / Institution</label>
                <input
                  type="text"
                  value={accountForm.bankName}
                  onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  placeholder="e.g. BML / MIB / Cash Drawer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountForm.accountNumber}
                  onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                  placeholder="e.g. 7701123456001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Account Type</label>
                <select
                  value={accountForm.type}
                  onChange={e => setAccountForm({ ...accountForm, type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Petty Cash / Cash in Hand</option>
                  <option value="mobile_wallet">Mobile Wallet</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Opening / Current Balance (MVR)</label>
                <input
                  type="number"
                  value={accountForm.currentBalance}
                  onChange={e => setAccountForm({ ...accountForm, currentBalance: Number(e.target.value), openingBalance: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Notes / Description</label>
              <textarea
                value={accountForm.notes}
                onChange={e => setAccountForm({ ...accountForm, notes: e.target.value })}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold"
              >
                Save Account
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 2: INTER-ACCOUNT TRANSFER --- */}
      {transferModalOpen && (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Transfer Funds Between Accounts"
        >
          <form onSubmit={handleTransferFunds} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Source Account (From)</label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={e => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} ({a.currentBalance} MVR)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Destination Account (To)</label>
                <select
                  value={transferForm.toAccountId}
                  onChange={e => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} ({a.currentBalance} MVR)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Transfer Amount (MVR)</label>
                <input
                  type="number"
                  min={1}
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Date</label>
                <input
                  type="date"
                  value={transferForm.date}
                  onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Transfer Reference / Notes</label>
              <input
                type="text"
                value={transferForm.notes}
                onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder="e.g. Petty cash replenishment from main bank"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold"
              >
                Execute Transfer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 3: ADD/EDIT INCOME --- */}
      {incomeModalOpen && (
        <Modal
          isOpen={incomeModalOpen}
          onClose={() => setIncomeModalOpen(false)}
          title={editingIncome ? 'Edit Income Record (އާމްދަނީ ބަދަލުކުރުން)' : 'Record New Income (އާމްދަނީ ޖަމާކުރުން)'}
        >
          <form onSubmit={handleSaveIncome} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Income Title (ތަފްސީލް)</label>
              <input
                type="text"
                value={incomeForm.title}
                onChange={e => setIncomeForm({ ...incomeForm, title: e.target.value })}
                placeholder="e.g. Member Dues (March 2026) or Gold Sponsorship"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Category (ކެޓަގަރީ)</label>
                <select
                  value={incomeForm.category}
                  onChange={e => setIncomeForm({ ...incomeForm, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-medium"
                >
                  <option value="member_contribution">Member Contribution (މެންބަރޝިޕް ފީ)</option>
                  <option value="sponsorship">Sponsorship (ސްޕޮންސަރޝިޕް)</option>
                  <option value="donation">Donation (ހެޔޮއެދޭ އެހީ)</option>
                  <option value="event_fee">Event Registration Fee (އިވެންޓް ފީ)</option>
                  <option value="merchandise">Merchandise & Sales (ތަކެތި ވިއްކުން)</option>
                  <option value="grant">Grant / Aid (އެހީ/ގްރާންޓް)</option>
                  <option value="other">Other Income (އެހެނިހެން އާމްދަނީ)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Amount (MVR)</label>
                <input
                  type="number"
                  min={1}
                  value={incomeForm.amount}
                  onChange={e => setIncomeForm({ ...incomeForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* If Member Contribution is selected, allow picking a registered member */}
            {incomeForm.category === 'member_contribution' && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Select Club Member (މެންބަރު ޚިޔާރުކުރައްވާ)</span>
                  </label>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-mono">
                    Direct Ledger Integration
                  </span>
                </div>
                <select
                  value={incomeForm.payerMemberId || ''}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const member = membersList.find(m => m.id === selectedId);
                    if (member) {
                      setIncomeForm({
                        ...incomeForm,
                        payerMemberId: member.id,
                        receivedFrom: `${member.fullName} (${member.memberNumber})`,
                        title: incomeForm.title || `Member Contribution - ${member.fullName} (${member.memberNumber})`
                      });
                    } else {
                      setIncomeForm({
                        ...incomeForm,
                        payerMemberId: '',
                        receivedFrom: ''
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">-- Choose Member from Roster (އޮޕްޝަނަލް) --</option>
                  {membersList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.memberNumber} - {m.fullName} ({m.phone || 'Member'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  މި ފައިސާ ކްލަބުގެ ޖުމްލަ އާމްދަނީ (Total Income) ގެ ތެރޭގައި މެންބަރޝިޕް ފީގެ ގޮތުގައި ހިމެނޭނެއެވެ.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Deposit To Account</label>
                <select
                  value={incomeForm.accountId}
                  onChange={e => setIncomeForm({ ...incomeForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Payment Method</label>
                <select
                  value={incomeForm.paymentMethod}
                  onChange={e => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="bank_transfer">Bank Transfer (BML/MIB)</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="cheque">Cheque</option>
                  <option value="gateway">Online Gateway</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Received From (Entity / Person)</label>
                <input
                  type="text"
                  value={incomeForm.receivedFrom}
                  onChange={e => setIncomeForm({ ...incomeForm, receivedFrom: e.target.value })}
                  placeholder="e.g. Ibrahim Rasheed / Dhiraagu / Donor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Transaction Ref / Slip No.</label>
                <input
                  type="text"
                  value={incomeForm.referenceNumber}
                  onChange={e => setIncomeForm({ ...incomeForm, referenceNumber: e.target.value })}
                  placeholder="e.g. TXN-BML-99124"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Date</label>
              <input
                type="date"
                value={incomeForm.date}
                onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                required
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIncomeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Save Income Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 4: ADD/EDIT EXPENSE --- */}
      {expenseModalOpen && (
        <Modal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
          title={editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Expense Title</label>
              <input
                type="text"
                value={expenseForm.title}
                onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                placeholder="e.g. Ramadan Quiz Grand Prizes (Phones & Vouchers)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="event_logistics">Event Logistics</option>
                  <option value="venue_rent">Venue Rent</option>
                  <option value="catering">Catering & Refreshments</option>
                  <option value="prizes_awards">Prizes & Awards</option>
                  <option value="marketing_pr">Marketing & PR</option>
                  <option value="office_admin">Office Admin</option>
                  <option value="equipment">Equipment</option>
                  <option value="travel">Travel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Amount (MVR)</label>
                <input
                  type="number"
                  min={1}
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Disburse From Account</label>
                <select
                  value={expenseForm.accountId}
                  onChange={e => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName} ({a.currentBalance} MVR)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Payee / Vendor Name</label>
                <input
                  type="text"
                  value={expenseForm.payee}
                  onChange={e => setExpenseForm({ ...expenseForm, payee: e.target.value })}
                  placeholder="e.g. Redwave Store / Male Youth Center"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Approved By (EXCO Officer)</label>
                <input
                  type="text"
                  value={expenseForm.approvedBy}
                  onChange={e => setExpenseForm({ ...expenseForm, approvedBy: e.target.value })}
                  placeholder="e.g. Ibrahim Rasheed (President)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Status</label>
                <select
                  value={expenseForm.status}
                  onChange={e => setExpenseForm({ ...expenseForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="paid">Paid (Disburse immediately)</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
              >
                Record Expense
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 5: PROCESS MEMBER CONTRIBUTION PAYMENT --- */}
      {payModalOpen && selectedMemberForPay && (
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Collect Contribution: ${selectedMemberForPay.fullName} (${selectedMemberForPay.memberNumber})`}
        >
          <form onSubmit={handleProcessPayment} className="space-y-4">
            
            {/* Mode selection */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Select Payment Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentForm({ ...paymentForm, paymentType: 'single_month' })}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    paymentForm.paymentType === 'single_month'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-xs block">Single Month Payment</span>
                  <span className="text-[11px] text-slate-400">Pay individual selected month fee (+ late fine if past due)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentForm({ ...paymentForm, paymentType: 'annual_advance' })}
                  className={`p-3 rounded-2xl border text-left transition relative overflow-hidden cursor-pointer ${
                    paymentForm.paymentType === 'annual_advance'
                      ? 'bg-emerald-500/15 border-emerald-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-extrabold uppercase">
                    1 Month Free
                  </div>
                  <span className="font-bold text-xs block text-emerald-400">★ 1-Year Advance Package</span>
                  <span className="text-[11px] text-slate-300">Pay 12 months with automatic 1-month discount ({settings?.monthlyFee || 100} MVR off)</span>
                </button>
              </div>
            </div>

            {paymentForm.paymentType === 'single_month' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Month ({paymentForm.year})</label>
                <select
                  value={paymentForm.month}
                  onChange={e => setPaymentForm({ ...paymentForm, month: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  {monthNames.map(m => (
                    <option key={m.num} value={m.num}>
                      Month {m.num}: {m.nameEn} ({m.nameDv})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deposit Account & Payment Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Deposit To Bank Account</label>
                <select
                  value={paymentForm.accountId}
                  onChange={e => setPaymentForm({ ...paymentForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="bank_transfer">Bank Transfer (BML/MIB)</option>
                  <option value="cash">Cash</option>
                  <option value="gateway">Payment Gateway</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Payment Reference / Slip Number</label>
              <input
                type="text"
                value={paymentForm.referenceNumber}
                onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                placeholder="e.g. TXN-BML-551234"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
              />
            </div>

            {/* Fine waiver toggle for single month */}
            {paymentForm.paymentType === 'single_month' && modalCalc.fine > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentForm.waiveFine}
                    onChange={e => setPaymentForm({ ...paymentForm, waiveFine: e.target.checked })}
                    className="rounded text-amber-500 bg-slate-950 border-slate-800"
                  />
                  <span className="text-xs font-bold text-amber-300">
                    Waive Late Fine ({modalCalc.fine} MVR) with Executive Discretion
                  </span>
                </label>
              </div>
            )}

            {/* Payment Summary Box */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Base Membership Fee:</span>
                <span className="font-mono text-white">{modalCalc.base} MVR</span>
              </div>
              {modalCalc.discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400">
                  <span>1-Year Advance Discount:</span>
                  <span className="font-mono">-{modalCalc.discount} MVR</span>
                </div>
              )}
              {modalCalc.fine > 0 && !paymentForm.waiveFine && (
                <div className="flex justify-between text-xs text-rose-400">
                  <span>Overdue Late Fine:</span>
                  <span className="font-mono">+{modalCalc.fine} MVR</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="font-bold text-sm text-white">Net Total Payable:</span>
                <span className="font-mono font-extrabold text-lg text-emerald-400">
                  {modalCalc.total.toLocaleString()} MVR
                </span>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/20"
              >
                Confirm & Issue Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* --- MODAL 6: OFFICIAL PAYMENT RECEIPT PREVIEW --- */}
      {receiptModalOpen && currentReceiptData && (
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title="Official ARC Contribution Receipt"
        >
          <div className="space-y-5">
            {/* Printable Receipt Card */}
            <div className="bg-slate-950 border-2 border-dashed border-emerald-500/40 rounded-3xl p-6 space-y-5 text-slate-200">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                    ARC
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Ananda Recreation Club</h4>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Official Payment Receipt</span>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-emerald-400 font-bold block">PAID & VERIFIED</span>
                  <span className="text-slate-400 text-[10px]">{currentReceiptData.result?.incomeRecord?.date || new Date().toISOString().slice(0, 10)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Member Name</span>
                  <span className="font-bold text-white text-sm">{currentReceiptData.member?.fullName}</span>
                  <span className="text-slate-400 font-mono text-[11px] block">{currentReceiptData.member?.memberNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Receipt Ref</span>
                  <span className="font-mono text-white font-bold">{currentReceiptData.result?.incomeRecord?.referenceNumber}</span>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-2xl p-4 space-y-2 text-xs border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Description:</span>
                  <span className="font-bold text-white">
                    {currentReceiptData.paymentForm?.paymentType === 'annual_advance'
                      ? `Annual Advance Contribution (${currentReceiptData.paymentForm.year} - 12 Months)`
                      : `Monthly Contribution (${currentReceiptData.paymentForm?.year} Month ${currentReceiptData.paymentForm?.month})`}
                  </span>
                </div>
                {currentReceiptData.result?.discountGiven > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>1-Year Advance Discount:</span>
                    <span className="font-mono">-{currentReceiptData.result.discountGiven} MVR</span>
                  </div>
                )}
                {currentReceiptData.result?.finesCollected > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Late Payment Fine:</span>
                    <span className="font-mono">+{currentReceiptData.result.finesCollected} MVR</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-base text-white">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-400 font-mono">{currentReceiptData.result?.totalPaid} MVR</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 flex justify-between items-center pt-2">
                <span>Deposited: {currentReceiptData.result?.incomeRecord?.accountName || 'ARC Operating Account'}</span>
                <span>Treasurer / Finance Officer Verified</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PortalLayout>
  );
};
