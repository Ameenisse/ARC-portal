import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader } from '../../components/public/PublicHeader';
import { PublicFooter } from '../../components/public/PublicFooter';
import {
  Package,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
  User,
  LogIn,
  ChevronLeft,
  Info,
  MapPin,
  Sparkles,
  Search
} from 'lucide-react';
import { RentalItem } from '../../types';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { usePublicSiteData } from '../../hooks/usePublicSiteData';
import { PageLoader } from '../../components/common/PageLoader';
import { PageTransition } from '../../components/common/PageTransition';
import { RentalBookingModal } from '../../components/rental/RentalBookingModal';
import { RentalRulesModal } from '../../components/rental/RentalRulesModal';
import { CustomerProfileModal } from '../../components/rental/CustomerProfileModal';

const CACHED_RENTAL_KEY = 'arc_cached_rental_items_v1';

const translateFeatureToDh = (feature: string): string => {
  const map: Record<string, string> = {
    'Capacity: 4 to 6 Persons': '4 އިން 6 މީހުންގެ ޖާގަ',
    'Waterproof PU 3000mm Rainfly': '3000mm ވޯޓަރޕްރޫފް ފޮތި',
    'UV Protection Silver Coating': 'އަވިން ރައްކާތެރިކޮށްދޭ ސިލްވަރ ކޯޓިންގ',
    'Reinforced Aluminum Alloy Poles': 'ވަރުގަދަ އެލުމިނިއަމް ދަނޑިތައް',
    'Ground Pegs & High-Tensile Wind Ropes': 'ބިންވަޅު ޖަހާ މޮހޮރާއި ވައި ވާގަނޑުތައް',
    'Compact Carrying Duffle Bag': 'އުފުލަން ފަސޭހަ ޚާއްޞަ ދަބަސް'
  };
  return map[feature] || feature;
};

const getItemDescriptionDh = (item: RentalItem): string => {
  if (item.shortDescription && item.shortDescription.toLowerCase().includes('heavy-duty')) {
    return '4 އާއި 6 މީހުންގެ ޖާގައިގެ ވަރުގަދަ ވޯޓަރޕްރޫފް ޕިކްނިކް އަދި ބީޗް ކޭމްޕިންގ ޓެންޓް. އަވިންނާއި ވާރެއިން ފުރިހަމަ ރައްކާތެރިކަން ލިބޭނެއެވެ.';
  }
  return item.shortDescription || item.description;
};

export const PublicRentalPage: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, customer, signInWithGoogle, signOutCustomer, previewDevLogin, isProfileComplete } = useCustomerAuth();

  const { data: siteData } = usePublicSiteData();
  const [items, setItems] = useState<RentalItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(CACHED_RENTAL_KEY);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return !sessionStorage.getItem(CACHED_RENTAL_KEY);
      } catch (e) {
        return true;
      }
    }
    return true;
  });
  const [selectedItemForBooking, setSelectedItemForBooking] = useState<RentalItem | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load public rental items
    fetch('/api/public/rental/items')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
          try {
            sessionStorage.setItem(CACHED_RENTAL_KEY, JSON.stringify(data));
          } catch (e) {
            // ignore
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.nameDh && item.nameDh.includes(searchQuery)) ||
    item.itemCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const defaultBranding = siteData?.branding || {
    clubName: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް',
    clubAbbreviation: 'ARC',
    useLogo: true
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white" dir="rtl">
        <PublicHeader branding={defaultBranding} activePath="/rental" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-4 text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
                  <Package className="w-3.5 h-3.5" />
                  އޭއާރްސީ މުޖުތަމަޢު ސާމާނާއި އިކުއިޕްމަންޓް ކުއްޔަށް ދިނުމުގެ ޚިދުމަތް
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                  މާލޭގައި ކޭމްޕިންގ އަދި ހަރަކާތްތަކަށް ބޭނުންވާ ސާމާނު ކުއްޔަށް ހިފުން
                </h1>
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
                  އާނަންދާ ރީކްރިއޭޝަން ކްލަބުން ފޯރުކޮށްދޭ ފެންވަރު ރަނގަޅު ޕިކްނިކް ޓެންޓް، ބީޗް ކޭމްޕިންގ ސާމާނު، އަދި އިޖުތިމާޢީ ހަރަކާތްތަކަށް ބޭނުންވާ ސާމާނު. މާލެއިން ފަސޭހަކަމާއެކު ލިބިގަތުން، 24 ގަޑިއިރުގެ ސާފު ކުލީ އަގުތައް އަދި ވަގުތުން ލިބެންހުރި މިންވަރު ކަށަވަރުކުރެވޭ ބުކިންގ ނިޒާމް.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-4 h-4 text-orange-400" />
                    ކުއްޔަށް ދިނުމުގެ ޤަވާޢިދު ބެއްލެވުން
                  </button>
                  <a
                    href="#catalog"
                    className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md flex items-center gap-1.5 transition"
                  >
                    ތަކެތީގެ ކެޓަލޮގް ބެއްލެވުން
                    <ChevronLeft className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Customer Quick Auth Card */}
              <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/60 shadow-xl max-w-sm w-full text-right">
                {firebaseUser || customer ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3">
                      {customer?.googlePhotoUrl || firebaseUser?.photoURL ? (
                        <img
                          src={customer?.googlePhotoUrl || firebaseUser?.photoURL || ''}
                          alt="Avatar"
                          className="w-11 h-11 rounded-full border border-orange-500/40 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold shrink-0">
                          {(customer?.fullName || 'C').charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-slate-400">ލޮގިންވެފައިވާ ފަރާތް</div>
                        <div className="text-sm font-bold text-white truncate">
                          {customer?.fullName || firebaseUser?.displayName || 'ކަސްޓަމަރު'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate dir-ltr text-right">
                          {customer?.googleEmail || firebaseUser?.email}
                        </div>
                      </div>
                    </div>

                    {!isProfileComplete && (
                      <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center justify-between">
                        <span>އައިޑީ ކާޑު / ފޯނު ނަންބަރު މަދުވޭ</span>
                        <button
                          onClick={() => setShowProfileModal(true)}
                          className="text-white font-semibold underline text-[11px]"
                        >
                          ފުރިހަމަކުރައްވާ
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        to="/customer/portal"
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold text-center shadow transition"
                      >
                        މަގޭ ބުކިންގތަކާއި ބިލްތައް
                      </Link>
                      <button
                        onClick={signOutCustomer}
                        className="py-2 px-3 bg-slate-700/70 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                      >
                        ލޮގްއައުޓް
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <div className="p-3 bg-orange-500/10 rounded-2xl w-fit mx-auto text-orange-400">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">ކަސްޓަމަރުންގެ ޕޯޓަލްއަށް ލޮގިންވުން</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        ބުކިންގ އެޕްރޫވަލް، އިންވޮއިސް އަދި ފައިސާ ދެއްކި ރަސީދުތައް ބެއްލެވުން.
                      </p>
                    </div>

                    <button
                      onClick={() => signInWithGoogle().catch(() => {})}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2.5 transition"
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
                      className="text-[11px] text-orange-400 hover:text-orange-300 underline font-medium"
                    >
                      (ޓެސްޓް ކަސްޓަމަރެއްގެ ގޮތުގައި ލޮގިންވުން)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Steps */}
        <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-right">
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                ތަކެތި ކުއްޔަށް ނެގުމުގެ ފަސޭހަ 5 މަރުޙަލާ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                އަވަސް، އިތުބާރުހުރި، އަދި ހުރިހާ މަރުޙަލާއެއް ޑިޖިޓަލްކޮށް ބަލަހައްޓާ ޚިދުމަތެއް
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { step: '01', title: 'ތަކެތި ޚިޔާރުކޮށް އެދުން', desc: 'ބޭނުންވާ ސާމާނާއި ތާރީޚުތައް ޚިޔާރުކުރައްވާ. ކަލަންޑަރުން ވަގުތުން ލިބެންހުރި މިންވަރު ބެއްލެވުން.' },
                { step: '02', title: 'އެޑްމިން އެޕްރޫވަލް', desc: 'އޭއާރްސީ ޓީމުން ބުކިންގ ޗެކްކުރުމަށްފަހު ރަސްމީ ކުލީ އިންވޮއިސް އަދި ބިލް ފޮނުވުން.' },
                { step: '03', title: 'ފައިސާ ދެއްކުން', desc: 'ބީއެމްއެލް އެކައުންޓަށް ޓްރާންސްފަރ ކުރައްވައި ސްލިޕް އަޕްލޯޑް ކުރެއްވުން.' },
                { step: '04', title: 'ސޮއިކޮށް ހަވާލުވުން', desc: 'އޭއާރްސީ މަރުކަޒުން ސާމާނު ޗެކްކޮށް، ޑިޖިޓަލް ހޭންޑްއޯވަރ ފޯމުގައި ސޮއިކުރެއްވުން.' },
                { step: '05', title: 'އަނބުރާ ހަވާލުކުރުން', desc: 'ވަގުތަށް ސާފުތާހިރުކަމާއެކު ތަކެތި ގެނައުން. އިންސްޕެކްޝަން ނިންމައި ފައިނަލްކުރުން.' }
              ].map((s) => (
                <div key={s.step} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-500 font-mono font-bold text-xs flex items-center justify-center mx-auto">
                    {s.step}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Equipment Catalog */}
        <section id="catalog" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-right">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                ކުއްޔަށް ދޫކުރާ ތަކެތީގެ ކެޓަލޮގް
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ދަތުރުދިއުމަށާއި، ކޭމްޕިންގ އަދި ޚާއްޞަ ހަފްލާތަކަށް ލިބެންހުރި ސާމާނު
              </p>
            </div>

            {/* Search Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ސާމާނު ހޯއްދަވާ..."
                className="w-full pr-9 pl-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-right"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <PageLoader fullscreen={false} message="ކެޓަލޮގް ލޯޑްވަނީ..." />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ކުއްޔަށް ދޫކުރާ އެއްވެސް އެއްޗެއް ނުފެނުނު</p>
              <p className="text-xs text-slate-400">މިވަގުތު ތަކެތި ހުސްވެފައި ނުވަތަ އަދާހަމަކުރެވެނީ. އިތުރު މަޢުލޫމާތު ހޯއްދެވުމަށް އޭއާރްސީއަށް ގުޅުއްވާ.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col text-right"
                >
                  {/* Image Header */}
                  <div className="relative h-56 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt={item.nameDh || item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                      {item.itemCode}
                    </div>
                    <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{item.totalStock} ޔުނިޓް އެބަހުރި</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white font-dhivehi">
                          {item.nameDh || item.name}
                        </h3>
                        {item.nameDh && item.name && (
                          <span className="text-xs text-slate-400 font-mono">
                            {item.name}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {getItemDescriptionDh(item)}
                      </p>

                      {/* Features Badges */}
                      {item.features && item.features.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.features.slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {translateFeatureToDh(f)}
                            </span>
                          ))}
                          {item.features.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                              +{item.features.length - 3} އިތުރަށް
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price and Action Footer */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">24 ގަޑިއިރަކަށް ދައްކަންޖެހޭ އަގު</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                            ރ. {item.pricePer24Hours}
                          </span>
                          <span className="text-[11px] text-slate-500">/ 24 ގަޑިއިރު</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedItemForBooking(item)}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition flex items-center gap-1.5"
                      >
                        ކުއްޔަށް ނެގުމަށް އެދުން
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pickup Location Info Banner */}
        <section className="bg-slate-100 dark:bg-slate-900/60 py-10 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800 text-right">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 bg-orange-100 dark:bg-orange-950/50 rounded-2xl text-orange-600 dark:text-orange-400 shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-center sm:text-right flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                ތަކެތި ނެގުމާއި އަނބުރާ ޙަވާލުކުރާ ތަން
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                އާނަންދާ ރީކްރިއޭޝަން ކްލަބް މަރުކަޒު، ބޮޑުތަކުރުފާނު މަގު، މާލެ، ދިވެހިރާއްޖެ.
                ތަކެތި ޙަވާލުކުރާ އަދި ބަލައިގަންނަ ގަޑިތައް: ހެނދުނު 09:00 އިން ހަވީރު 18:00 އަށް (ހޮނިހިރުން ބުރާސްފައްޗަށް).
              </p>
            </div>
            <button
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-xl transition shrink-0"
            >
              ފުރިހަމަ ޤަވާޢިދު ބެއްލެވުން
            </button>
          </div>
        </section>
      </main>

      <PublicFooter branding={defaultBranding} socialLinks={siteData?.socialLinks || []} />

      {/* Booking Modal */}
      {selectedItemForBooking && (
        <RentalBookingModal
          item={selectedItemForBooking}
          onClose={() => setSelectedItemForBooking(null)}
          onSuccess={(reqId) => {
            setSelectedItemForBooking(null);
            navigate('/customer/portal');
          }}
        />
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <RentalRulesModal
          onClose={() => setShowRulesModal(false)}
        />
      )}

      {/* Customer Profile Modal */}
      {showProfileModal && (
        <CustomerProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}
      </div>
    </PageTransition>
  );
};
