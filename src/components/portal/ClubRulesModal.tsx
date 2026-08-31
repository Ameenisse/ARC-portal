import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ClubRulesData } from '../../types';
import {
  BookOpen,
  Search,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Printer,
  Calendar,
  Tag,
  Globe,
  Languages
} from 'lucide-react';

interface ClubRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules?: ClubRulesData;
}

export const ClubRulesModal: React.FC<ClubRulesModalProps> = ({ isOpen, onClose, rules: initialRules }) => {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<ClubRulesData | null>(initialRules || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  
  // Language Switch: 'dhivehi' | 'english' | 'both'
  const [lang, setLang] = useState<'dhivehi' | 'english' | 'both'>('dhivehi');

  useEffect(() => {
    if (initialRules) {
      setRules(initialRules);
      if (initialRules.chapters) {
        const exp: Record<string, boolean> = {};
        initialRules.chapters.forEach(c => { exp[c.id] = true; });
        setExpandedChapters(exp);
      }
      setLoading(false);
      return;
    }

    if (isOpen) {
      setLoading(true);
      api.getClubRules()
        .then(data => {
          setRules(data);
          if (data?.chapters) {
            const exp: Record<string, boolean> = {};
            data.chapters.forEach(c => { exp[c.id] = true; });
            setExpandedChapters(exp);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialRules]);

  if (!isOpen) return null;

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredChapters = rules?.chapters ? rules.chapters.filter(chap => {
    if (selectedChapterId !== 'all' && chap.id !== selectedChapterId) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const matchChapTitle = (chap.titleDhivehi || '').toLowerCase().includes(q) || (chap.titleEnglish || '').toLowerCase().includes(q);
    const matchSummary = (chap.summary || chap.summaryDhivehi || chap.summaryEnglish || '').toLowerCase().includes(q);
    const matchArticles = chap.articles.some(art =>
      art.articleNumber.toLowerCase().includes(q) ||
      (art.titleDhivehi || art.title || '').toLowerCase().includes(q) ||
      (art.titleEnglish || art.title || '').toLowerCase().includes(q) ||
      (art.contentDhivehi || art.content || '').toLowerCase().includes(q) ||
      (art.contentEnglish || art.content || '').toLowerCase().includes(q)
    );

    return matchChapTitle || matchSummary || matchArticles;
  }) : [];

  const mainDir = lang === 'english' ? 'ltr' : 'rtl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6 overflow-y-auto">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative ${mainDir === 'rtl' ? 'text-right' : 'text-left'}`}
        dir={mainDir}
      >
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-heading">
                  {lang === 'english'
                    ? (rules?.titleEnglish || rules?.titleDhivehi || 'Ananda Recreation Club Rules')
                    : (rules?.titleDhivehi || rules?.titleEnglish || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދު')}
                </h2>
                {rules?.version && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-mono font-bold">
                    v{rules.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'english'
                  ? (rules?.titleDhivehi || 'Ananda Recreation Club - Official Rules & Regulations')
                  : (rules?.titleEnglish || 'Ananda Recreation Club - Official Rules & Regulations')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Language Switch Toggle Pill */}
            <div className="bg-slate-950 p-1 border border-slate-800 rounded-xl flex items-center gap-1 text-xs">
              <button
                onClick={() => setLang('dhivehi')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  lang === 'dhivehi' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ދިވެހި
              </button>
              <button
                onClick={() => setLang('english')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  lang === 'english' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('both')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  lang === 'both' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Both Dhivehi and English Side-by-Side"
              >
                 Both
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Print Rules"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="bg-slate-950/80 p-4 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto flex-1 max-w-2xl">
            <div className="relative w-full sm:flex-1">
              <Search className={`w-4 h-4 text-slate-500 absolute top-2.5 ${mainDir === 'rtl' ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={lang === 'english' ? 'Search rules & articles...' : 'ޤަވާޢިދުން ހޯއްދަވާ (Search rules)...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 ${
                  mainDir === 'rtl' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute top-2.5 text-slate-500 hover:text-white text-xs ${mainDir === 'rtl' ? 'left-3' : 'right-3'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {rules?.chapters && rules.chapters.length > 0 && (
              <select
                value={selectedChapterId}
                onChange={e => setSelectedChapterId(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500/50"
              >
                <option value="all">
                  {lang === 'english' ? `All Chapters (${rules.chapters.length})` : `ހުރިހާ ބާބެއް (${rules.chapters.length})`}
                </option>
                {rules.chapters.map(c => (
                  <option key={c.id} value={c.id}>
                    {lang === 'english'
                      ? `Chapter ${c.chapterNumber}: ${c.titleEnglish || c.titleDhivehi}`
                      : `ބާބު ${c.chapterNumber}: ${c.titleDhivehi || c.titleEnglish}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            {rules?.effectiveDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-400" />
                <span>{lang === 'english' ? `Effective Date: ${rules.effectiveDate}` : `އަމަލުކުރަން ފެށީ: ${rules.effectiveDate}`}</span>
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">{lang === 'english' ? 'Loading club rules...' : 'ޤަވާޢިދު ލޯޑުވަނީ...'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Section */}
              {(rules?.descriptionDhivehi || rules?.descriptionEnglish || rules?.description) && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      {lang === 'english' ? 'Rules Overview & Preamble' : 'ޤަވާޢިދުގެ ޚުލާޞާ (Summary)'}
                    </h4>

                    {lang === 'both' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div dir="rtl" className="text-right">
                          <span className="text-[10px] font-bold text-orange-400 block mb-0.5">ދިވެހި:</span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {rules?.descriptionDhivehi || rules?.description}
                          </p>
                        </div>
                        <div dir="ltr" className="text-left border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
                          <span className="text-[10px] font-bold text-orange-400 block mb-0.5">English:</span>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {rules?.descriptionEnglish || rules?.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {lang === 'english'
                          ? (rules?.descriptionEnglish || rules?.descriptionDhivehi || rules?.description)
                          : (rules?.descriptionDhivehi || rules?.descriptionEnglish || rules?.description)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {filteredChapters.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <Search className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">
                    {lang === 'english' ? 'No articles found' : 'އެއްވެސް މާއްދާއެއް ނުފެނުނު'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {lang === 'english' ? 'Try searching with a different keyword.' : 'ހޯއްދެވި ލަފުޒު ބަދަލުކުރެއްވުމަށްފަހު އަލުން މަސައްކަތްކުރައްވާ.'}
                  </p>
                </div>
              ) : (
                filteredChapters.map(chap => {
                  const isExpanded = expandedChapters[chap.id] ?? true;
                  return (
                    <div key={chap.id} className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                      <button
                        onClick={() => toggleChapter(chap.id)}
                        className={`w-full p-4 bg-slate-900/90 hover:bg-slate-800/80 border-b border-slate-800 flex items-center justify-between gap-4 transition ${
                          mainDir === 'rtl' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                            {chap.chapterNumber}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-white font-heading">
                              {lang === 'english'
                                ? `Chapter ${chap.chapterNumber}: ${chap.titleEnglish || chap.titleDhivehi}`
                                : `ބާބު ${chap.chapterNumber}: ${chap.titleDhivehi || chap.titleEnglish}`}
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              {lang === 'both' ? (
                                <span>{chap.titleDhivehi} • {chap.titleEnglish}</span>
                              ) : (
                                <span>{lang === 'english' ? chap.titleDhivehi : chap.titleEnglish}</span>
                              )}
                              <span> • ({chap.articles.length} {lang === 'english' ? 'Articles' : 'މާއްދާ'})</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-slate-950/40">
                          {(chap.summary || chap.summaryDhivehi || chap.summaryEnglish) && (
                            <div className="text-xs text-slate-400 italic bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                              {lang === 'both' ? (
                                <div className="space-y-1">
                                  <p dir="rtl"><strong>ދިވެހި:</strong> {chap.summaryDhivehi || chap.summary}</p>
                                  <p dir="ltr"><strong>English:</strong> {chap.summaryEnglish || chap.summary}</p>
                                </div>
                              ) : (
                                <p>{lang === 'english' ? (chap.summaryEnglish || chap.summaryDhivehi || chap.summary) : (chap.summaryDhivehi || chap.summaryEnglish || chap.summary)}</p>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-3">
                            {chap.articles.map(art => {
                              const artTitleDv = art.titleDhivehi || art.title || '';
                              const artTitleEn = art.titleEnglish || art.title || '';
                              const artContDv = art.contentDhivehi || art.content || '';
                              const artContEn = art.contentEnglish || art.content || '';

                              return (
                                <div
                                  key={art.articleNumber}
                                  className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 hover:border-slate-700 transition space-y-2"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-orange-400 font-mono flex items-center gap-1.5">
                                      <Tag className="w-3 h-3" />
                                      <span>{lang === 'english' ? `Article ${art.articleNumber}` : `މާއްދާ ${art.articleNumber}`}</span>
                                    </span>
                                    
                                    <h4 className="text-xs font-bold text-white">
                                      {lang === 'english' ? (artTitleEn || artTitleDv) : (artTitleDv || artTitleEn)}
                                    </h4>
                                  </div>

                                  {lang === 'both' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                      <div dir="rtl" className="text-right space-y-1">
                                        <div className="text-[10px] font-bold text-orange-400 uppercase">
                                          {artTitleDv && <span className="mr-1">[{artTitleDv}]</span>}
                                          <span>ދިވެހި</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                                          {artContDv || '—'}
                                        </p>
                                      </div>
                                      <div dir="ltr" className="text-left space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
                                        <div className="text-[10px] font-bold text-orange-400 uppercase">
                                          <span>English</span>
                                          {artTitleEn && <span className="ml-1">[{artTitleEn}]</span>}
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                                          {artContEn || '—'}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                                      {lang === 'english' ? (artContEn || artContDv) : (artContDv || artContEn)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            {rules?.updatedByName && (
              <span>
                {lang === 'english' ? 'Last modified by: ' : 'އެންމެ ފަހުން އިޞްލާޙުކުރީ: '}
                <strong className="text-slate-300">{rules.updatedByName}</strong>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            {lang === 'english' ? 'Close' : 'ލައްޕާލައްވާ (Close)'}
          </button>
        </div>

      </div>
    </div>
  );
};
