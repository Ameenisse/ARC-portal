import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { usePortalLanguage } from '../../hooks/usePortalLanguage';
import {
  Package,
  LayoutDashboard,
  FileText,
  Boxes,
  History,
  FileCheck2,
  RotateCcw,
  CreditCard,
  Calendar,
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';

import { RentalDashboardTab } from '../../components/portal/rental/RentalDashboardTab';
import { RentalRequestsTab } from '../../components/portal/rental/RentalRequestsTab';
import { RentalInventoryTab } from '../../components/portal/rental/RentalInventoryTab';
import { RentalMovementsTab } from '../../components/portal/rental/RentalMovementsTab';
import { RentalHandoverTab } from '../../components/portal/rental/RentalHandoverTab';
import { RentalReturnsTab } from '../../components/portal/rental/RentalReturnsTab';
import { RentalPaymentsTab } from '../../components/portal/rental/RentalPaymentsTab';
import { RentalAvailabilityTab } from '../../components/portal/rental/RentalAvailabilityTab';
import { RentalSettingsTab } from '../../components/portal/rental/RentalSettingsTab';

export type RentalTab =
  | 'dashboard'
  | 'requests'
  | 'inventory'
  | 'movements'
  | 'handover'
  | 'returns'
  | 'payments'
  | 'availability'
  | 'settings';

export const RentalServicePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { lang, dir } = usePortalLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const validTabs: RentalTab[] = [
    'dashboard',
    'requests',
    'inventory',
    'movements',
    'handover',
    'returns',
    'payments',
    'availability',
    'settings'
  ];

  const tabParam = searchParams.get('tab') as RentalTab | null;
  const initialTab: RentalTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'dashboard';
  const [activeTab, setActiveTab] = useState<RentalTab>(initialTab);

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: RentalTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Permissions
  const canView = hasPermission('rental_service', 'canView');
  const canCreate = hasPermission('rental_service', 'canCreate');
  const canEdit = hasPermission('rental_service', 'canEdit');
  const canDelete = hasPermission('rental_service', 'canDelete');
  const canApprove = hasPermission('rental_service', 'canApprove');
  const canExport = hasPermission('rental_service', 'canExport');
  const canManageSettings = hasPermission('rental_service', 'canManageSettings');

  const isEn = lang === 'english';

  const tabsConfig: Array<{ key: RentalTab; labelDv: string; labelEn: string; icon: any }> = [
    { key: 'dashboard', labelDv: 'ޑޭޝްބޯޑު', labelEn: 'Overview', icon: LayoutDashboard },
    { key: 'requests', labelDv: 'ރިކުއެސްޓްތައް', labelEn: 'Requests', icon: FileText },
    { key: 'inventory', labelDv: 'އިންވެންޓްރީ & ޔުނިޓްތައް', labelEn: 'Inventory & Units', icon: Boxes },
    { key: 'movements', labelDv: 'މޫވްމަންޓް ލޮގް', labelEn: 'Movement Audit', icon: History },
    { key: 'handover', labelDv: 'ޙަވާލުކުރުން', labelEn: 'Handover', icon: FileCheck2 },
    { key: 'returns', labelDv: 'އަނބުރާ ބަލައިގަތުން', labelEn: 'Returns & Inspection', icon: RotateCcw },
    { key: 'payments', labelDv: 'ފައިސާ & ބިލް', labelEn: 'Billing & Payments', icon: CreditCard },
    { key: 'availability', labelDv: 'ތާވަލު & ލިބުން', labelEn: 'Availability Calendar', icon: Calendar },
    { key: 'settings', labelDv: 'ސެޓިންގްސް', labelEn: 'Settings & BML', icon: SettingsIcon }
  ];

  return (
    <PortalLayout currentModule="rental_service" title={isEn ? 'Rental Service' : 'ކުއްޔަށް ދޫކުރާ ޚިދުމަތް'}>
      <div className="space-y-6">
        {/* Module Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {isEn ? 'Equipment Rental Service Management' : 'ކުއްޔަށް ދޫކުރާ ޚިދުމަތް ބެލެހެއްޓުން'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  Live Operations
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isEn
                  ? 'Real-time equipment inventory, customer bookings, condition inspections, digital signatures & automated BML billing.'
                  : 'ތަކެތީގެ އިންވެންޓްރީ، ބުކިންގް ރިކުއެސްޓް، އިންސްޕެކްޝަން، ސޮއި އަދި ބަޖެޓަށް އާމްދަނީ ވެއްދުން.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/rentals"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-semibold text-orange-400 bg-orange-950/40 hover:bg-orange-900/40 border border-orange-800/80 rounded-xl transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isEn ? 'Open Public Catalog' : 'ޕަބްލިކް ކެޓަލޮގް ބަލާލަން'}
            </a>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin">
          {tabsConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{isEn ? t.labelEn : t.labelDv}</span>
              </button>
            );
          })}
        </div>

        {/* Tab View Container */}
        <div className="transition-all duration-300">
          {activeTab === 'dashboard' && (
            <RentalDashboardTab
              onNavigateTab={(tab) => handleTabChange(tab as RentalTab)}
              lang={lang}
            />
          )}

          {activeTab === 'requests' && (
            <RentalRequestsTab
              canApprove={canApprove}
              canEdit={canEdit}
              lang={lang}
            />
          )}

          {activeTab === 'inventory' && (
            <RentalInventoryTab
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
              lang={lang}
            />
          )}

          {activeTab === 'movements' && (
            <RentalMovementsTab
              lang={lang}
            />
          )}

          {activeTab === 'handover' && (
            <RentalHandoverTab
              canApprove={canApprove}
              canEdit={canEdit}
              lang={lang}
            />
          )}

          {activeTab === 'returns' && (
            <RentalReturnsTab
              canApprove={canApprove}
              canEdit={canEdit}
              lang={lang}
            />
          )}

          {activeTab === 'payments' && (
            <RentalPaymentsTab
              canApprove={canApprove}
              canEdit={canEdit}
              lang={lang}
            />
          )}

          {activeTab === 'availability' && (
            <RentalAvailabilityTab
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <RentalSettingsTab
              canManageSettings={canManageSettings}
              lang={lang}
            />
          )}
        </div>
      </div>
    </PortalLayout>
  );
};
export default RentalServicePage;
