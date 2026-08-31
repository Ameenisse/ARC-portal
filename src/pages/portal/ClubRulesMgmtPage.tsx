import React, { useState, useEffect } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { ClubRulesModal } from '../../components/portal/ClubRulesModal';
import { useTableSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { ClubRulesData, ClubRuleChapter, ClubRuleArticle } from '../../types';
import {
  BookOpen,
  Plus,
  Save,
  Eye,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Tag,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';

export const ClubRulesMgmtPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [rules, setRules] = useState<ClubRulesData>({
    titleDhivehi: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދު 2026',
    titleEnglish: 'Ananda Recreation Club - Official Rules & Regulations (2026)',
    description: 'ކްލަބުގެ މަޤްޞަދުތަކާއި، މެންބަރުންގެ ޙައްޤުތަކާއި މަސްއޫލިއްޔަތުތައް، އަދި ހިންގާ ކޮމިޓީގެ ދައުރާއި އިދާރީ އުޞޫލުތައް ބަޔާންކުރާ ރަސްމީ ޤަވާޢިދު.',
    version: '2.1',
    effectiveDate: '2026-01-01',
    updatedAt: new Date().toISOString(),
    chapters: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Chapter Modal state
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterForm, setChapterForm] = useState({
    chapterNumber: 1,
    titleDhivehi: '',
    titleEnglish: '',
    summaryDhivehi: '',
    summaryEnglish: ''
  });

  // Article Modal state
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null);
  const [editingArticleIndex, setEditingArticleIndex] = useState<number | null>(null);
  const [articleForm, setArticleForm] = useState({
    articleNumber: '',
    titleDhivehi: '',
    titleEnglish: '',
    contentDhivehi: '',
    contentEnglish: ''
  });

  useEffect(() => {
    fetchClubRules();
  }, []);

  // Real-time sync for club rules, directives, and circulars
  useTableSync(['clubRules', 'presidentialDirectives', 'officialCirculars'], () => {
    if (!saving) {
      fetchClubRules();
    }
  });

  const fetchClubRules = async () => {
    try {
      setLoading(true);
      const data = await api.getClubRules();
      if (data) {
        setRules(data);
        if (data.chapters) {
          const exp: Record<string, boolean> = {};
          data.chapters.forEach(c => { exp[c.id] = true; });
          setExpandedChapters(exp);
        }
      }
    } catch (err: any) {
      showToast('ޤަވާޢިދު ލޯޑުކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const updated = await api.updateClubRules({
        ...rules,
        updatedAt: new Date().toISOString()
      });
      setRules(updated);
      showToast('ކްލަބުގެ ހިންގާ ޤަވާޢިދު ކާމިޔާބުކަމާއެކު ސޭވްކުރެވިއްޖެ!', 'success');
    } catch (err: any) {
      showToast('ސޭވްކުރުމުގައި މައްސަލައެއް ދިމާވެއްޖެ: ' + (err.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- CHAPTER HANDLERS ---
  const handleOpenAddChapter = () => {
    const nextChapNum = rules.chapters.length > 0
      ? Math.max(...rules.chapters.map(c => c.chapterNumber)) + 1
      : 1;
    setChapterForm({
      chapterNumber: nextChapNum,
      titleDhivehi: '',
      titleEnglish: '',
      summaryDhivehi: '',
      summaryEnglish: ''
    });
    setEditingChapterId(null);
    setIsChapterModalOpen(true);
  };

  const handleOpenEditChapter = (chap: ClubRuleChapter) => {
    setEditingChapterId(chap.id);
    setChapterForm({
      chapterNumber: chap.chapterNumber,
      titleDhivehi: chap.titleDhivehi || '',
      titleEnglish: chap.titleEnglish || '',
      summaryDhivehi: chap.summaryDhivehi || chap.summary || '',
      summaryEnglish: chap.summaryEnglish || chap.summary || ''
    });
    setIsChapterModalOpen(true);
  };

  const handleSaveChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.titleDhivehi.trim() && !chapterForm.titleEnglish.trim()) {
      showToast('ބާބުގެ ދިވެހި ނުވަތަ އިނގިރޭސި ސުރުޚީ ލިޔުއްވާ!', 'error');
      return;
    }

    if (editingChapterId) {
      // Edit existing chapter
      const updatedChapters = rules.chapters.map(c => {
        if (c.id === editingChapterId) {
          return {
            ...c,
            chapterNumber: Number(chapterForm.chapterNumber),
            titleDhivehi: chapterForm.titleDhivehi.trim(),
            titleEnglish: chapterForm.titleEnglish.trim(),
            summary: chapterForm.summaryDhivehi.trim() || chapterForm.summaryEnglish.trim(),
            summaryDhivehi: chapterForm.summaryDhivehi.trim(),
            summaryEnglish: chapterForm.summaryEnglish.trim()
          };
        }
        return c;
      });
      setRules({ ...rules, chapters: updatedChapters });
      showToast('ބާބު އިޞްލާޙުކުރެވިއްޖެ!', 'success');
    } else {
      // Add new chapter
      const newChap: ClubRuleChapter = {
        id: 'chap_' + Date.now(),
        chapterNumber: Number(chapterForm.chapterNumber),
        titleDhivehi: chapterForm.titleDhivehi.trim(),
        titleEnglish: chapterForm.titleEnglish.trim(),
        summary: chapterForm.summaryDhivehi.trim() || chapterForm.summaryEnglish.trim(),
        summaryDhivehi: chapterForm.summaryDhivehi.trim(),
        summaryEnglish: chapterForm.summaryEnglish.trim(),
        articles: []
      };
      setRules({ ...rules, chapters: [...rules.chapters, newChap] });
      setExpandedChapters(prev => ({ ...prev, [newChap.id]: true }));
      showToast('އައު ބާބެއް އިތުރުކުރެވިއްޖެ!', 'success');
    }

    setIsChapterModalOpen(false);
  };

  const handleDeleteChapter = (chapId: string, chapTitle: string) => {
    if (!window.confirm(`"${chapTitle}" މި ބާބު ފޮހެލަން ބޭނުންފުޅުތޯ؟ މީގެ ދަށުގައިވާ ހުރިހާ މާއްދާތަކެއްވެސް ފޮހެވޭނެއެވެ.`)) {
      return;
    }
    const updated = rules.chapters.filter(c => c.id !== chapId);
    setRules({ ...rules, chapters: updated });
    showToast('ބާބު ފޮހެލެވިއްޖެ!', 'success');
  };

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    const newChapters = [...rules.chapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newChapters.length) return;

    const temp = newChapters[index];
    newChapters[index] = newChapters[targetIndex];
    newChapters[targetIndex] = temp;

    setRules({ ...rules, chapters: newChapters });
  };

  // --- ARTICLE HANDLERS ---
  const handleOpenAddArticle = (chapId: string) => {
    const chap = rules.chapters.find(c => c.id === chapId);
    const nextArtNum = chap && chap.articles.length > 0
      ? `${chap.chapterNumber}.${chap.articles.length + 1}`
      : `${chap?.chapterNumber || 1}.1`;

    setTargetChapterId(chapId);
    setEditingArticleIndex(null);
    setArticleForm({
      articleNumber: nextArtNum,
      titleDhivehi: '',
      titleEnglish: '',
      contentDhivehi: '',
      contentEnglish: ''
    });
    setIsArticleModalOpen(true);
  };

  const handleOpenEditArticle = (chapId: string, articleIndex: number, article: ClubRuleArticle) => {
    setTargetChapterId(chapId);
    setEditingArticleIndex(articleIndex);
    setArticleForm({
      articleNumber: article.articleNumber,
      titleDhivehi: article.titleDhivehi || article.title || '',
      titleEnglish: article.titleEnglish || article.title || '',
      contentDhivehi: article.contentDhivehi || article.content || '',
      contentEnglish: article.contentEnglish || article.content || ''
    });
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!articleForm.titleDhivehi.trim() && !articleForm.titleEnglish.trim()) ||
      (!articleForm.contentDhivehi.trim() && !articleForm.contentEnglish.trim())
    ) {
      showToast('މާއްދާގެ ސުރުޚީއާއި ތަފްޞީލު (ދިވެހި ނުވަތަ އިނގިރޭސި) ފުރިހަމަކުރައްވާ!', 'error');
      return;
    }

    if (!targetChapterId) return;

    const updatedChapters = rules.chapters.map(chap => {
      if (chap.id === targetChapterId) {
        const newArticles = [...chap.articles];
        const artObj: ClubRuleArticle = {
          articleNumber: articleForm.articleNumber.trim(),
          title: articleForm.titleDhivehi.trim() || articleForm.titleEnglish.trim(),
          titleDhivehi: articleForm.titleDhivehi.trim(),
          titleEnglish: articleForm.titleEnglish.trim(),
          content: articleForm.contentDhivehi.trim() || articleForm.contentEnglish.trim(),
          contentDhivehi: articleForm.contentDhivehi.trim(),
          contentEnglish: articleForm.contentEnglish.trim()
        };

        if (editingArticleIndex !== null) {
          // Edit existing article
          newArticles[editingArticleIndex] = artObj;
        } else {
          // Add new article
          newArticles.push(artObj);
        }
        return { ...chap, articles: newArticles };
      }
      return chap;
    });

    setRules({ ...rules, chapters: updatedChapters });
    showToast(editingArticleIndex !== null ? 'މާއްދާ އިޞްލާޙުކުރެވިއްޖެ!' : 'އައު މާއްދާއެއް އިތުރުކުރެވިއްޖެ!', 'success');
    setIsArticleModalOpen(false);
  };

  const handleDeleteArticle = (chapId: string, articleIndex: number) => {
    if (!window.confirm('މި މާއްދާ ފޮހެލަން ބޭނުންފުޅުތޯ؟')) return;

    const updatedChapters = rules.chapters.map(chap => {
      if (chap.id === chapId) {
        const newArticles = chap.articles.filter((_, idx) => idx !== articleIndex);
        return { ...chap, articles: newArticles };
      }
      return chap;
    });

    setRules({ ...rules, chapters: updatedChapters });
    showToast('މާއްދާ ފޮހެލެވިއްޖެ!', 'success');
  };

  const handleMoveArticle = (chapId: string, articleIndex: number, direction: 'up' | 'down') => {
    const updatedChapters = rules.chapters.map(chap => {
      if (chap.id === chapId) {
        const newArticles = [...chap.articles];
        const targetIndex = direction === 'up' ? articleIndex - 1 : articleIndex + 1;
        if (targetIndex < 0 || targetIndex >= newArticles.length) return chap;

        const temp = newArticles[articleIndex];
        newArticles[articleIndex] = newArticles[targetIndex];
        newArticles[targetIndex] = temp;

        return { ...chap, articles: newArticles };
      }
      return chap;
    });

    setRules({ ...rules, chapters: updatedChapters });
  };

  // Filtered chapters for display
  const filteredChapters = rules.chapters.filter(chap => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchChap = chap.titleDhivehi.toLowerCase().includes(q) || chap.titleEnglish.toLowerCase().includes(q);
    const matchArticles = chap.articles.some(a =>
      a.articleNumber.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
    );
    return matchChap || matchArticles;
  });

  return (
    <PortalLayout currentModule="club_rules" title="Club Rules Management">
      <div className="space-y-6">

        {/* Toast Notification */}
        {toast && (
          <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between gap-3 shadow-xl transition animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-heading">
                ކްލަބުގެ ހިންގާ ޤަވާޢިދު ބެލެހެއްޓުން (Club Rules & Regulations)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ކްލަބުގެ ބާބުތަކާއި، މާއްދާތައް އަދި އިދާރީ އުޞޫލުތައް އޮންލައިންކޮށް އިޞްލާޙުކޮށް ބެލެހެއްޓެވުން.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition"
            >
              <Eye className="w-4 h-4 text-orange-400" />
              <span>ޤަވާޢިދު ބައްލަވާލައްވާ (Preview)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddChapter}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/30 font-bold text-xs flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>އައު ބާބެއް އިތުރުކުރައްވާ</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'ސޭވްވަނީ...' : 'ހުރިހާ ބަދަލެއް ސޭވްކުރައްވާ'}</span>
            </button>
          </div>
        </div>

        {/* Document Overview Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" />
            <span>ޤަވާޢިދުގެ އަސާސީ މަޢުލޫމާތު (Constitution Metadata)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                ޤަވާޢިދުގެ ނަން (ދިވެހިން) *
              </label>
              <input
                type="text"
                required
                value={rules.titleDhivehi}
                onChange={e => setRules({ ...rules, titleDhivehi: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Document Title (English) *
              </label>
              <input
                type="text"
                required
                value={rules.titleEnglish}
                onChange={e => setRules({ ...rules, titleEnglish: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                ވާޝަން ނަންބަރު (Version Number) *
              </label>
              <input
                type="text"
                required
                value={rules.version}
                onChange={e => setRules({ ...rules, version: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-orange-500/50"
                placeholder="e.g. 2.1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                އަމަލުކުރަން ފެށި ތާރީޚު (Effective Date) *
              </label>
              <input
                type="date"
                required
                value={rules.effectiveDate}
                onChange={e => setRules({ ...rules, effectiveDate: e.target.value })}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  ޤަވާޢިދުގެ ޚުލާޞާ (ދިވެހިން)
                </label>
                <textarea
                  rows={2}
                  value={rules.descriptionDhivehi || rules.description || ''}
                  onChange={e => setRules({ ...rules, descriptionDhivehi: e.target.value, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50 leading-relaxed"
                  placeholder="ޤަވާޢިދުގެ ޚުލާޞާ ދިވެހިން..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Document Description (English)
                </label>
                <textarea
                  rows={2}
                  value={rules.descriptionEnglish || ''}
                  onChange={e => setRules({ ...rules, descriptionEnglish: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50 leading-relaxed"
                  placeholder="Document overview in English..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chapters & Articles Management Toolbar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="ބާބު ނުވަތަ މާއްދާއެއް ހޯއްދަވާ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-3 text-slate-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              ޖުމްލަ {rules.chapters.length} ބާބު
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              ޖުމްލަ {rules.chapters.reduce((acc, c) => acc + c.articles.length, 0)} މާއްދާ
            </span>
          </div>
        </div>

        {/* Chapters & Articles Tree Editor */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">ޤަވާޢިދުގެ ބާބުތައް ލޯޑުވަނީ...</p>
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Layers className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">އެއްވެސް ބާބެއް ނެތް</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              މަތީގައިވާ "އައު ބާބެއް އިތުރުކުރައްވާ" ބަޓަނަށް ކްލިކް ކުރައްވައިގެން ޤަވާޢިދުގެ ފުރަތަމަ ބާބު އިތުރުކުރައްވާ.
            </p>
            <button
              onClick={handleOpenAddChapter}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>އައު ބާބެއް އިތުރުކުރައްވާ</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChapters.map((chap, chapIdx) => {
              const isExpanded = expandedChapters[chap.id] ?? true;
              return (
                <div key={chap.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition">
                  
                  {/* Chapter Header */}
                  <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleChapter(chap.id)}
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <span className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {chap.chapterNumber}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white font-heading">
                          {chap.titleDhivehi}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {chap.titleEnglish} • ({chap.articles.length} މާއްދާ)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full md:w-auto justify-end flex-wrap">
                      <button
                        onClick={() => handleOpenAddArticle(chap.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>މާއްދާއެއް އިތުރުކުރައްވާ</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditChapter(chap)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                        title="Edit Chapter Header"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveChapter(chapIdx, 'up')}
                        disabled={chapIdx === 0}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveChapter(chapIdx, 'down')}
                        disabled={chapIdx === rules.chapters.length - 1}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteChapter(chap.id, chap.titleDhivehi)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                        title="Delete Chapter"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Chapter Content & Articles */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-slate-900/60">
                      {chap.summary && (
                        <p className="text-xs text-slate-400 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                          {chap.summary}
                        </p>
                      )}

                      {chap.articles.length === 0 ? (
                        <div className="py-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
                          <p>މި ބާބުގައި އަދި އެއްވެސް މާއްދާއެއް ނެތް.</p>
                          <button
                            onClick={() => handleOpenAddArticle(chap.id)}
                            className="text-orange-400 hover:underline font-bold"
                          >
                            + މާއްދާއެއް އިތުރުކުރައްވާ
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {chap.articles.map((art, artIdx) => (
                            <div
                              key={artIdx}
                              className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition space-y-2 group"
                            >
                              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono text-xs font-bold border border-orange-500/20">
                                    މާއްދާ {art.articleNumber}
                                  </span>
                                  <h4 className="text-xs font-bold text-white">
                                    {art.titleDhivehi || art.title || '—'}
                                  </h4>
                                  {(art.titleEnglish || art.title) && (
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      ({art.titleEnglish || art.title})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                                  <button
                                    onClick={() => handleOpenEditArticle(chap.id, artIdx, art)}
                                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition"
                                    title="Edit Article"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleMoveArticle(chap.id, artIdx, 'up')}
                                    disabled={artIdx === 0}
                                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-20 text-xs transition"
                                    title="Move Article Up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleMoveArticle(chap.id, artIdx, 'down')}
                                    disabled={artIdx === chap.articles.length - 1}
                                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-20 text-xs transition"
                                    title="Move Article Down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteArticle(chap.id, artIdx)}
                                    className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs transition"
                                    title="Delete Article"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                                  <span className="text-[10px] font-bold text-orange-400 block mb-1">ދިވެހި އިބާރާތް:</span>
                                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                                    {art.contentDhivehi || art.content || '—'}
                                  </p>
                                </div>
                                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80" dir="ltr">
                                  <span className="text-[10px] font-bold text-orange-400 block mb-1">English Content:</span>
                                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                                    {art.contentEnglish || art.content || '—'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* CHAPTER MODAL */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span>{editingChapterId ? 'ބާބު އިޞްލާޙުކުރުން' : 'އައު ބާބެއް އިތުރުކުރުން'}</span>
              </h3>
              <button onClick={() => setIsChapterModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ބާބުގެ ނަންބަރު (Chapter Number) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={chapterForm.chapterNumber}
                  onChange={e => setChapterForm({ ...chapterForm, chapterNumber: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ބާބުގެ ސުރުޚީ (ދިވެހިން) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ބާބު 1: ނަމާއި، އެޑްރެސް އަދި މަޤްޞަދުތައް"
                  value={chapterForm.titleDhivehi}
                  onChange={e => setChapterForm({ ...chapterForm, titleDhivehi: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Chapter Title (English)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1: Name, Address & Objectives"
                  value={chapterForm.titleEnglish}
                  onChange={e => setChapterForm({ ...chapterForm, titleEnglish: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ޚުލާޞާ (ދިވެހިން)
                </label>
                <textarea
                  rows={2}
                  placeholder="ބާބާ ގުޅޭ ކުރު ޚުލާޞާއެއް..."
                  value={chapterForm.summaryDhivehi}
                  onChange={e => setChapterForm({ ...chapterForm, summaryDhivehi: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Summary (English)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief chapter summary in English..."
                  value={chapterForm.summaryEnglish}
                  onChange={e => setChapterForm({ ...chapterForm, summaryEnglish: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChapterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  ކެންސަލް
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
                >
                  ސޭވްކުރައްވާ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARTICLE MODAL */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-heading flex items-center gap-2">
                <Tag className="w-5 h-5 text-orange-400" />
                <span>{editingArticleIndex !== null ? 'މާއްދާ އިޞްލާޙުކުރުން' : 'އައު މާއްދާއެއް އިތުރުކުރުން'}</span>
              </h3>
              <button onClick={() => setIsArticleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  މާއްދާ ނަންބަރު (Article Number) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1.1"
                  value={articleForm.articleNumber}
                  onChange={e => setArticleForm({ ...articleForm, articleNumber: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:border-orange-500/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    މާއްދާގެ ސުރުޚީ (ދިވެހިން) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ކްލަބުގެ ނަން"
                    value={articleForm.titleDhivehi}
                    onChange={e => setArticleForm({ ...articleForm, titleDhivehi: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Article Title (English)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Club Name & Abbreviation"
                    value={articleForm.titleEnglish}
                    onChange={e => setArticleForm({ ...articleForm, titleEnglish: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  މާއްދާގެ އިބާރާތް / ތަފްޞީލު (ދިވެހިން) *
                </label>
                <textarea
                  rows={4}
                  placeholder="މާއްދާގެ ފުރިހަމަ އިބާރާތް ދިވެހިން ލިޔުއްވާ..."
                  value={articleForm.contentDhivehi}
                  onChange={e => setArticleForm({ ...articleForm, contentDhivehi: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500/50 leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Article Content / Provision (English)
                </label>
                <textarea
                  rows={4}
                  placeholder="Full text of the article in English..."
                  value={articleForm.contentEnglish}
                  onChange={e => setArticleForm({ ...articleForm, contentEnglish: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-orange-500/50 leading-relaxed font-sans"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  ކެންސަލް
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/20"
                >
                  ސޭވްކުރައްވާ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      <ClubRulesModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

    </PortalLayout>
  );
};
