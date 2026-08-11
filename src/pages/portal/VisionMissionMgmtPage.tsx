import React, { useEffect, useState } from 'react';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { api } from '../../services/api';
import { useToast } from '../../components/common/Toast';
import { Save } from 'lucide-react';

export const VisionMissionMgmtPage: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [heading, setHeading] = useState('Vision & Mission');
  const [introduction, setIntroduction] = useState('');
  const [visionTitle, setVisionTitle] = useState('Our Vision');
  const [visionContent, setVisionContent] = useState('');
  const [missionTitle, setMissionTitle] = useState('Our Mission');
  const [missionContent, setMissionContent] = useState('');

  useEffect(() => {
    api.getContentSettings()
      .then(res => {
        const settings = res.settings || [];
        const getVal = (k: string, def: any) => settings.find((s: any) => s.key === k)?.value ?? def;

        setHeading(getVal('vmHeading', 'Vision & Mission'));
        setIntroduction(getVal('vmIntro', ''));
        setVisionTitle(getVal('visionTitle', 'Our Vision'));
        setVisionContent(getVal('visionContent', ''));
        setMissionTitle(getVal('missionTitle', 'Our Mission'));
        setMissionContent(getVal('missionContent', ''));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = [
        { group: 'branding', key: 'vmHeading', value: heading },
        { group: 'branding', key: 'vmIntro', value: introduction },
        { group: 'branding', key: 'visionTitle', value: visionTitle },
        { group: 'branding', key: 'visionContent', value: visionContent },
        { group: 'branding', key: 'missionTitle', value: missionTitle },
        { group: 'branding', key: 'missionContent', value: missionContent }
      ];

      await api.updateContentSettings(payload);
      showToast('success', 'Vision & Mission updated.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update Vision & Mission.');
    }
  };

  return (
    <PortalLayout currentModule="vision_mission" title="Vision & Mission Management">
      {loading ? (
        <div className="py-12 text-center text-slate-400">Loading Vision & Mission data...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold font-heading text-white">Section Overview</h3>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Section Heading</label>
              <input
                type="text"
                required
                value={heading}
                onChange={e => setHeading(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Introduction Text</label>
              <textarea
                rows={2}
                value={introduction}
                onChange={e => setIntroduction(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Vision Editor */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold font-heading text-orange-400">Vision Statement</h3>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Vision Card Title</label>
                <input
                  type="text"
                  required
                  value={visionTitle}
                  onChange={e => setVisionTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Vision Content *</label>
                <textarea
                  rows={5}
                  required
                  value={visionContent}
                  onChange={e => setVisionContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            {/* Mission Editor */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold font-heading text-red-400">Mission Statement</h3>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Mission Card Title</label>
                <input
                  type="text"
                  required
                  value={missionTitle}
                  onChange={e => setMissionTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Mission Content *</label>
                <textarea
                  rows={5}
                  required
                  value={missionContent}
                  onChange={e => setMissionContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

          </div>

          <div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Vision & Mission</span>
            </button>
          </div>

        </form>
      )}
    </PortalLayout>
  );
};
