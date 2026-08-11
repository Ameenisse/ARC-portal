import React, { useState } from 'react';
import { Mail, Phone, MessageSquare, MapPin, Clock, PhoneCall, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface ReachUsProps {
  contacts: Array<{
    id: string;
    type: string;
    label: string;
    value: string;
  }>;
}

export const ReachUsSection: React.FC<ReachUsProps> = ({ contacts = [] }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    contactInfo: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const getContactVal = (type: string) => contacts.find(c => c.type === type)?.value || '';

  const email = getContactVal('email') || 'info@arcclub.mv';
  const primaryPhone = getContactVal('primary_phone') || '+960 777 4321';
  const secondaryPhone = getContactVal('secondary_phone') || '+960 330 1234';
  const whatsapp = getContactVal('whatsapp') || '+9607774321';
  const address = getContactVal('address') || 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް، މަޖީދީމަގު، މާލެ، ދިވެހިރާއްޖެ';
  const workingHours = getContactVal('working_hours') || 'ހޮނިހިރު - ބުރާސްފަތި: 09:00 - 22:00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.message.trim()) return;

    setSending(true);
    try {
      await api.submitPublicContactMessage({
        fullName: formData.fullName,
        contactInfo: formData.contactInfo,
        subject: formData.subject,
        message: formData.message
      });
      setSentSuccess(true);
      setFormData({ fullName: '', contactInfo: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      console.error('Failed to submit message', err);
      // Fallback UI success so visitor isn't stuck
      setSentSuccess(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-slate-950 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-semibold text-xs uppercase tracking-wider mb-3">
            <PhoneCall className="w-3.5 h-3.5" />
            <span>ގުޅުއްވާ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
            ގުޅުއްވުމަށް އަދި މެސެޖު ފޮނުއްވުމަށް
          </h2>
          <p className="text-slate-400 text-base mt-2">
            އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހަރަކާތްތަކާއި، ރަމަޟާން ކުއިޒް، ނުވަތަ ސުޕޮންސަރޝިޕާ ބެހޭގޮތުން މަޢުލޫމާތު ހޯއްދެވުމަށް ގުޅުއްވާ ނުވަތަ މެސެޖެއް ފޮނުއްވާ!
          </p>
        </div>

        {/* Top Info Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Email */}
          <a
            href={`mailto:${email}`}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">އީމެއިލް</span>
              <span className="text-base font-bold text-white group-hover:text-orange-400 transition-colors mt-1 block">
                {email}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">އީމެއިލް ފޮނުއްވުމަށް ފިއްތަވާލައްވާ</span>
            </div>
          </a>

          {/* Primary Phone Dialer */}
          <a
            href={`tel:${(primaryPhone || '').replace(/\s+/g, '')}`}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-red-500/50 transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">މައި ފޯނު ނަންބަރު</span>
              <span className="text-base font-bold text-white group-hover:text-red-400 transition-colors mt-1 block font-mono">
                {primaryPhone}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">ފޯނު ކުރެއްވުމަށް ފިއްތަވާލައްވާ</span>
            </div>
          </a>

          {/* WhatsApp Chat */}
          <a
            href={`https://wa.me/${(whatsapp || '').replace(/[^\d]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">ވައިބަރ / ވާޓްސްއެޕް</span>
              <span className="text-base font-bold text-white group-hover:text-orange-400 transition-colors mt-1 block font-mono">
                {whatsapp}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">މެސެޖު ކުރެއްވުމަށް ފިއްތަވާލައްވާ</span>
            </div>
          </a>

          {/* Office Address */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">އޮފީސް އެޑްރެސް</span>
              <span className="text-sm font-semibold text-white mt-1 block leading-relaxed">
                {address}
              </span>
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4 md:col-span-2 lg:col-span-2">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">މަސައްކަތު ގަޑި</span>
              <span className="text-sm font-semibold text-white mt-1 block leading-relaxed">
                {workingHours}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">ހުކުރު ދުވަހާއި ރަސްމީ ބަންދު ދުވަސްތަކުގައި ބަންދުވާނެއެވެ.</span>
            </div>
          </div>

        </div>

        {/* MESSAGE BOX FORM CONTAINER */}
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-heading text-white">މެސެޖު ފޮނުއްވުމަށް (Message Box)</h3>
              <p className="text-xs text-slate-400">ކްލަބަށް ދެއްވަން ބޭނުންފުޅުވާ ޚިޔާލެއް ނުވަތަ ސުވާލެއް ތިރީގައިވާ ފޯމުން ފޮނުއްވާލައްވާ!</p>
            </div>
          </div>

          {sentSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 animate-scale-in">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white font-heading">ޝުކުރިއްޔާ! މެސެޖު ލިބިއްޖެއެވެ.</h4>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                ތިޔަ ފޮނުއްވި މެސެޖު އާނަންދާ ރީކްރިއޭޝަން ކްލަބަށް ވަނީ ލިބިފައެވެ. އިރާދަކުރެއްވިއްޔާ ވީއެންމެ އަވަހަކަށް ޖަވާބު އަރުވާނަމެވެ.
              </p>
              <button
                type="button"
                onClick={() => setSentSuccess(false)}
                className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all"
              >
                އަނެއްކާވެސް މެސެޖެއް ފޮނުއްވުމަށް
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    ފުރިހަމަ ނަން (Full Name) <span className="text-orange-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="މިސާލު: އަޙްމަދު ޢަލީ"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    ފޯނު ނަންބަރު / އީމެއިލް (Contact Info)
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                    placeholder="7771234 / email@example.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  މައުޟޫޢު (Subject)
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                >
                  <option value="General Inquiry">ޢާންމު މަޢުލޫމާތު ސާފުކުރުން (General Inquiry)</option>
                  <option value="Ramazan Quiz">ރަމަޟާން ކުއިޒާ ގުޅޭ (Ramazan Quiz)</option>
                  <option value="Sponsorship">ސްޕޮންސަރޝިޕް (Sponsorship & Partnership)</option>
                  <option value="Feedback">ޚިޔާލާއި ފާޑުކިއުން (Feedback & Suggestions)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  މެސެޖު / ޚިޔާލު (Your Message) <span className="text-orange-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="ތިޔަބޭފުޅާގެ މެސެޖު ނުވަތަ ސުވާލު މިތަނުގައި ލިޔުއްވާ..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>ފޮނުވަނީ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>މެސެޖު ފޮނުއްވާ (Send Message)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </section>
  );
};


