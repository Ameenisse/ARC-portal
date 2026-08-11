import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '../../components/portal/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SlideshowItem, ExcoMember, SocialLink, ContactInfo, ClubEvent } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ImageUploadInput } from '../../components/common/ImageUploadInput';
import { useToast } from '../../components/common/Toast';
import { 
  Image as ImageIcon, Globe, Target, Users, Share2, PhoneCall, Plus, Edit, Trash2, 
  Eye, EyeOff, Save, CheckCircle, User, Calendar, MapPin
} from 'lucide-react';

export const ContentMgmtPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- TAB 1: SLIDESHOW STATE ---
  const [slides, setSlides] = useState<SlideshowItem[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<SlideshowItem | null>(null);
  const [desktopImage, setDesktopImage] = useState('');
  const [mobileImage, setMobileImage] = useState('');
  const [slideTitle, setSlideTitle] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [overlayLevel, setOverlayLevel] = useState(45);
  const [slideStatus, setSlideStatus] = useState<'active' | 'inactive'>('active');

  // --- TAB 2: PUBLIC CONTENT & BRANDING STATE ---
  const [loadingContent, setLoadingContent] = useState(false);
  const [clubName, setClubName] = useState('Ananda Recreation Club');
  const [clubAbbreviation, setClubAbbreviation] = useState('ARC Club');
  const [clubLogo, setClubLogo] = useState('');
  const [useLogo, setUseLogo] = useState(false);
  const [welcomeHeading, setWelcomeHeading] = useState('Welcome to Ananda Recreation Club');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    slideshow: true, welcome: true, vision_mission: true, ramazan_quiz: true, exco_team: true, reach_us: true, social_links: true
  });

  // --- TAB 3: VISION & MISSION STATE ---
  const [loadingVM, setLoadingVM] = useState(false);
  const [vmHeading, setVmHeading] = useState('Vision & Mission');
  const [vmIntro, setVmIntro] = useState('');
  const [visionTitle, setVisionTitle] = useState('Our Vision');
  const [visionContent, setVisionContent] = useState('');
  const [missionTitle, setMissionTitle] = useState('Our Mission');
  const [missionContent, setMissionContent] = useState('');

  // --- TAB 4: EXCO TEAM STATE ---
  const [excoMembers, setExcoMembers] = useState<ExcoMember[]>([]);
  const [loadingExco, setLoadingExco] = useState(false);
  const [excoModalOpen, setExcoModalOpen] = useState(false);
  const [editingExco, setEditingExco] = useState<ExcoMember | null>(null);
  const [excoFullName, setExcoFullName] = useState('');
  const [excoDesignation, setExcoDesignation] = useState('');
  const [excoImage, setExcoImage] = useState('');
  const [excoDescription, setExcoDescription] = useState('');
  const [excoSocialLink, setExcoSocialLink] = useState('');
  const [excoStatus, setExcoStatus] = useState<'active' | 'inactive'>('active');

  // --- TAB 5: SOCIAL MEDIA STATE ---
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [socialPlatform, setSocialPlatform] = useState('facebook');
  const [socialUrl, setSocialUrl] = useState('');

  // --- TAB 6: CONTACT INFO STATE ---
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactInfo | null>(null);
  const [contactType, setContactType] = useState('email');
  const [contactLabel, setContactLabel] = useState('');
  const [contactValue, setContactValue] = useState('');

  // --- TAB 7: EVENTS & ALBUMS STATE ---
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventSummary, setEventSummary] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCoverImage, setEventCoverImage] = useState('');
  const [eventPhotoAlbum, setEventPhotoAlbum] = useState<string[]>([]);
  const [eventDisplayOrder, setEventDisplayOrder] = useState(1);
  const [eventStatus, setEventStatus] = useState<'active' | 'inactive'>('active');

  // Fetch Handlers
  const fetchSlides = async () => {
    try {
      setLoadingSlides(true);
      const res = await api.getSlideshow();
      setSlides(res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load slideshow photos.');
    } finally {
      setLoadingSlides(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await api.getEvents();
      setEvents(res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchContentSettings = async () => {
    try {
      setLoadingContent(true);
      const res = await api.getContentSettings();
      const settings = res.settings || [];
      const getVal = (g: string, k: string, def: any) => settings.find((s: any) => s.group === g && s.key === k)?.value ?? def;

      setClubName(getVal('branding', 'clubName', 'Ananda Recreation Club'));
      setClubAbbreviation(getVal('branding', 'clubAbbreviation', 'ARC Club'));
      setClubLogo(getVal('branding', 'logo', ''));
      setUseLogo(getVal('branding', 'useLogo', false));
      setWelcomeHeading(getVal('branding', 'welcomeHeading', 'Welcome to ARC Club'));
      setWelcomeMessage(getVal('branding', 'welcomeMessage', ''));
      setAboutText(getVal('branding', 'aboutText', ''));
      setSectionVisibility(getVal('public_site', 'sectionVisibility', {
        slideshow: true, welcome: true, vision_mission: true, ramazan_quiz: true, exco_team: true, reach_us: true, social_links: true
      }));

      // Vision & Mission
      setVmHeading(getVal('branding', 'vmHeading', 'Vision & Mission'));
      setVmIntro(getVal('branding', 'vmIntro', ''));
      setVisionTitle(getVal('branding', 'visionTitle', 'Our Vision'));
      setVisionContent(getVal('branding', 'visionContent', ''));
      setMissionTitle(getVal('branding', 'missionTitle', 'Our Mission'));
      setMissionContent(getVal('branding', 'missionContent', ''));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingContent(false);
      setLoadingVM(false);
    }
  };

  const fetchExco = async () => {
    try {
      setLoadingExco(true);
      const res = await api.getExcoMembers();
      setExcoMembers(res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load EXCO members.');
    } finally {
      setLoadingExco(false);
    }
  };

  const fetchSocial = async () => {
    try {
      setLoadingSocial(true);
      const res = await api.getSocialLinks();
      setSocialLinks(res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load social media links.');
    } finally {
      setLoadingSocial(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await api.getContacts();
      setContacts(res || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load contact info.');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Define subtabs and permission checks
  const allSubTabs = [
    { key: 'events', label: `ޙަރަކާތްތަކާއި އަލްބަމް (${events.length})`, icon: Calendar, canView: hasPermission('events_meetings', 'canView') || hasPermission('content', 'canView') },
    { key: 'slideshow', label: `ފޮޓޯ ސްލައިޑްޝޯ (${slides.length})`, icon: ImageIcon, canView: hasPermission('slideshow', 'canView') || hasPermission('content', 'canView') },
    { key: 'content', label: 'ޢާންމު މަޢުލޫމާތު & Brand', icon: Globe, canView: hasPermission('content', 'canView') },
    { key: 'vision_mission', label: 'ވިޜަން & މިޝަން', icon: Target, canView: hasPermission('vision_mission', 'canView') || hasPermission('content', 'canView') },
    { key: 'exco_team', label: `ހިންގާ ކޮމިޓީ (${excoMembers.length})`, icon: Users, canView: hasPermission('exco_team', 'canView') || hasPermission('content', 'canView') },
    { key: 'social_media', label: `ސޯޝަލް މީޑިއާ (${socialLinks.length})`, icon: Share2, canView: hasPermission('social_media', 'canView') || hasPermission('content', 'canView') },
    { key: 'contact', label: `ގުޅޭނެ މަޢުލޫމާތު (${contacts.length})`, icon: PhoneCall, canView: hasPermission('contact', 'canView') || hasPermission('content', 'canView') }
  ];

  const allowedSubTabs = allSubTabs.filter(t => t.canView);
  const requestedTab = searchParams.get('tab');
  const currentTab = allowedSubTabs.some(t => t.key === requestedTab)
    ? (requestedTab as string)
    : (allowedSubTabs[0]?.key || 'slideshow');

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (currentTab === 'slideshow') fetchSlides();
    else if (currentTab === 'content') fetchContentSettings();
    else if (currentTab === 'vision_mission') fetchContentSettings();
    else if (currentTab === 'exco_team') fetchExco();
    else if (currentTab === 'social_media') fetchSocial();
    else if (currentTab === 'contact') fetchContacts();
    else if (currentTab === 'events') fetchEvents();
  }, [currentTab]);

  // EVENT CRUD HANDLERS
  const handleOpenCreateEvent = () => {
    setEditingEvent(null);
    setEventTitle('');
    setEventSummary('');
    setEventDescription('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventLocation('');
    setEventCoverImage('');
    setEventPhotoAlbum([]);
    setEventDisplayOrder(events.length + 1);
    setEventStatus('active');
    setEventModalOpen(true);
  };

  const handleOpenEditEvent = (evt: ClubEvent) => {
    setEditingEvent(evt);
    setEventTitle(evt.title);
    setEventSummary(evt.summary);
    setEventDescription(evt.description || '');
    setEventDate(evt.eventDate || '');
    setEventLocation(evt.location || '');
    setEventCoverImage(evt.coverImage || '');
    setEventPhotoAlbum(evt.photoAlbum || []);
    setEventDisplayOrder(evt.displayOrder || 1);
    setEventStatus(evt.status || 'active');
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventSummary.trim()) {
      showToast('error', 'Event title and summary are required.');
      return;
    }

    try {
      const payload = {
        title: eventTitle.trim(),
        summary: eventSummary.trim(),
        description: eventDescription.trim(),
        eventDate: eventDate.trim(),
        location: eventLocation.trim(),
        coverImage: eventCoverImage.trim() || (eventPhotoAlbum[0] || ''),
        photoAlbum: eventPhotoAlbum,
        displayOrder: Number(eventDisplayOrder) || 1,
        status: eventStatus
      };

      if (editingEvent) {
        await api.updateEvent(editingEvent.id, payload);
        showToast('success', 'Event updated successfully.');
      } else {
        await api.createEvent(payload);
        showToast('success', 'New event created successfully.');
      }

      setEventModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save event.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event and its photo album?')) return;
    try {
      await api.deleteEvent(id);
      showToast('success', 'Event deleted.');
      fetchEvents();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete event.');
    }
  };

  const handleAddPhotoToAlbum = (url: string) => {
    if (!url.trim()) return;
    setEventPhotoAlbum([...eventPhotoAlbum, url.trim()]);
  };

  const handleRemovePhotoFromAlbum = (index: number) => {
    setEventPhotoAlbum(eventPhotoAlbum.filter((_, idx) => idx !== index));
  };

  // SLIDESHOW CRUD
  const handleOpenCreateSlide = () => {
    setEditingSlide(null);
    setDesktopImage('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80');
    setMobileImage('');
    setSlideTitle('');
    setSlideSubtitle('');
    setButtonText('Explore Ramazan Quiz');
    setButtonLink('#quiz');
    setTextAlignment('center');
    setOverlayLevel(45);
    setSlideStatus('active');
    setSlideModalOpen(true);
  };

  const handleOpenEditSlide = (slide: SlideshowItem) => {
    setEditingSlide(slide);
    setDesktopImage(slide.desktopImage);
    setMobileImage(slide.mobileImage || '');
    setSlideTitle(slide.title);
    setSlideSubtitle(slide.subtitle || '');
    setButtonText(slide.buttonText || '');
    setButtonLink(slide.buttonLink || '');
    setTextAlignment(slide.textAlignment || 'center');
    setOverlayLevel(slide.overlayLevel ?? 45);
    setSlideStatus(slide.status || 'active');
    setSlideModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desktopImage || !slideTitle) {
      showToast('error', 'Desktop Image URL and Title are required.');
      return;
    }
    const payload = {
      desktopImage, mobileImage, title: slideTitle, subtitle: slideSubtitle,
      buttonText, buttonLink, textAlignment, overlayLevel: Number(overlayLevel), status: slideStatus
    };
    try {
      if (editingSlide) {
        await api.updateSlide(editingSlide.id, payload);
        showToast('success', 'Slide updated successfully.');
      } else {
        await api.createSlide(payload);
        showToast('success', 'Slide created successfully.');
      }
      setSlideModalOpen(false);
      fetchSlides();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save slide.');
    }
  };

  const handleDeleteSlide = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slideshow photo?')) return;
    try {
      await api.deleteSlide(id);
      showToast('success', 'Slide deleted.');
      fetchSlides();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete slide.');
    }
  };

  // PUBLIC CONTENT SAVE
  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = [
        { group: 'branding', key: 'clubName', value: clubName },
        { group: 'branding', key: 'clubAbbreviation', value: clubAbbreviation },
        { group: 'branding', key: 'logo', value: clubLogo },
        { group: 'branding', key: 'useLogo', value: useLogo },
        { group: 'branding', key: 'welcomeHeading', value: welcomeHeading },
        { group: 'branding', key: 'welcomeMessage', value: welcomeMessage },
        { group: 'branding', key: 'aboutText', value: aboutText },
        { group: 'public_site', key: 'sectionVisibility', value: sectionVisibility }
      ];
      await api.updateContentSettings(payload);
      showToast('success', 'Public website content settings saved.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save content settings.');
    }
  };

  // VISION & MISSION SAVE
  const handleSaveVM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = [
        { group: 'branding', key: 'vmHeading', value: vmHeading },
        { group: 'branding', key: 'vmIntro', value: vmIntro },
        { group: 'branding', key: 'visionTitle', value: visionTitle },
        { group: 'branding', key: 'visionContent', value: visionContent },
        { group: 'branding', key: 'missionTitle', value: missionTitle },
        { group: 'branding', key: 'missionContent', value: missionContent }
      ];
      await api.updateContentSettings(payload);
      showToast('success', 'Vision & Mission settings saved.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save Vision & Mission.');
    }
  };

  // EXCO CRUD
  const handleOpenCreateExco = () => {
    setEditingExco(null);
    setExcoFullName('');
    setExcoDesignation('President');
    setExcoImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80');
    setExcoDescription('');
    setExcoSocialLink('');
    setExcoStatus('active');
    setExcoModalOpen(true);
  };

  const handleOpenEditExco = (item: ExcoMember) => {
    setEditingExco(item);
    setExcoFullName(item.fullName);
    setExcoDesignation(item.designation);
    setExcoImage(item.image || '');
    setExcoDescription(item.description || '');
    setExcoSocialLink(item.socialLink || '');
    setExcoStatus(item.status || 'active');
    setExcoModalOpen(true);
  };

  const handleSaveExco = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        fullName: excoFullName, designation: excoDesignation, image: excoImage,
        description: excoDescription, socialLink: excoSocialLink, status: excoStatus
      };
      if (editingExco) {
        await api.updateExcoMember(editingExco.id, payload);
        showToast('success', 'EXCO member updated.');
      } else {
        await api.createExcoMember(payload);
        showToast('success', 'EXCO member added.');
      }
      setExcoModalOpen(false);
      fetchExco();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save EXCO member.');
    }
  };

  const handleDeleteExco = async (id: string) => {
    if (!confirm('Are you sure you want to delete this EXCO member?')) return;
    try {
      await api.deleteExcoMember(id);
      showToast('success', 'EXCO member deleted.');
      fetchExco();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete EXCO member.');
    }
  };

  // SOCIAL CRUD
  const handleOpenCreateSocial = () => {
    setEditingSocial(null);
    setSocialPlatform('Facebook');
    setSocialUrl('');
    setSocialModalOpen(true);
  };

  const handleOpenEditSocial = (item: SocialLink) => {
    setEditingSocial(item);
    setSocialPlatform(item.platform);
    setSocialUrl(item.url);
    setSocialModalOpen(true);
  };

  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSocial) {
        await api.updateSocialLink(editingSocial.id, { platform: socialPlatform, url: socialUrl });
        showToast('success', 'Social link updated.');
      } else {
        await api.createSocialLink({ platform: socialPlatform, url: socialUrl });
        showToast('success', 'Social link added.');
      }
      setSocialModalOpen(false);
      fetchSocial();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save social link.');
    }
  };

  const handleDeleteSocial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this social media link?')) return;
    try {
      await api.deleteSocialLink(id);
      showToast('success', 'Social link deleted.');
      fetchSocial();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete social link.');
    }
  };

  // CONTACT CRUD
  const handleOpenCreateContact = () => {
    setEditingContact(null);
    setContactType('email');
    setContactLabel('Official Email');
    setContactValue('');
    setContactModalOpen(true);
  };

  const handleOpenEditContact = (item: ContactInfo) => {
    setEditingContact(item);
    setContactType(item.type);
    setContactLabel(item.label);
    setContactValue(item.value);
    setContactModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.updateContact(editingContact.id, { type: contactType, label: contactLabel, value: contactValue });
        showToast('success', 'Contact info updated.');
      } else {
        await api.createContact({ type: contactType, label: contactLabel, value: contactValue });
        showToast('success', 'Contact info added.');
      }
      setContactModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save contact detail.');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact detail?')) return;
    try {
      await api.deleteContact(id);
      showToast('success', 'Contact detail deleted.');
      fetchContacts();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete contact.');
    }
  };

  return (
    <PortalLayout currentModule="content" title="Public Site Management">
      <div className="space-y-6">
        
        {/* Module Header & Sub-Nav Tabs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">Public Website Module</span>
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white">ޢާންމު ވެބްސައިޓް މެނޭޖްމަންޓް</h2>
              <p className="text-xs text-slate-400 mt-1">
                ވެބްސައިޓްގެ ފޮޓޯ ސްލައިޑްޝޯ، ވިޜަން އަދި މިޝަން، ހިންގާ ކޮމިޓީ، ސޯޝަލް މީޑިއާ އަދި ގުޅޭނެ މަޢުލޫމާތު.
              </p>
            </div>

            {currentTab === 'slideshow' && (
              <button
                type="button"
                onClick={handleOpenCreateSlide}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>އަލަށް ސްލައިޑެއް އިތުރުކުރައްވާ</span>
              </button>
            )}

            {currentTab === 'exco_team' && (
              <button
                type="button"
                onClick={handleOpenCreateExco}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>އެކްސްކޯ މެންބަރަކު އިތުރުކުރައްވާ</span>
              </button>
            )}

            {currentTab === 'social_media' && (
              <button
                type="button"
                onClick={handleOpenCreateSocial}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>ސޯޝަލް ލިންކެއް އިތުރުކުރައްވާ</span>
              </button>
            )}

            {currentTab === 'contact' && (
              <button
                type="button"
                onClick={handleOpenCreateContact}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>ގުޅޭނެ ތަފްޞީލެއް އިތުރުކުރައްވާ</span>
              </button>
            )}

            {currentTab === 'events' && (
              <button
                type="button"
                onClick={handleOpenCreateEvent}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>އާ ހަރަކާތެއް އިތުރުކުރައްވާ</span>
              </button>
            )}
          </div>

          {/* Sub-Nav Bar */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 overflow-x-auto custom-scrollbar">
            {allowedSubTabs.map(subTab => {
              const Icon = subTab.icon;
              return (
                <button
                  key={subTab.key}
                  type="button"
                  onClick={() => setTab(subTab.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                    currentTab === subTab.key
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{subTab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: SLIDESHOW */}
        {currentTab === 'slideshow' && (
          <div className="space-y-4">
            {loadingSlides ? (
              <div className="py-12 text-center text-slate-400">ސްލައިޑްޝޯ ފޮޓޯތައް ލޯޑުވަނީ...</div>
            ) : slides.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <p className="text-sm">އަދި އެއްވެސް ސްލައިޑްޝޯ ފޮޓޯއެއް ނެތެވެ.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateSlide}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
                >
                  ސްލައިޑެއް ހައްދަވާ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slides.map(slide => (
                  <div key={slide.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div className="h-44 relative bg-slate-950">
                      <img src={slide.desktopImage} alt={slide.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950" style={{ opacity: (slide.overlayLevel || 45) / 100 }} />
                      <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                        <span className="text-[10px] uppercase font-bold text-orange-400">Order: #{slide.displayOrder}</span>
                        <h4 className="text-base font-bold font-heading line-clamp-1">{slide.title}</h4>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-400 line-clamp-2">{slide.subtitle}</p>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          slide.status === 'active' ? 'bg-orange-950 text-orange-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {slide.status}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSlide(slide)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PUBLIC CONTENT & BRANDING */}
        {currentTab === 'content' && (
          <form onSubmit={handleSaveContent} className="space-y-6 max-w-4xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold font-heading text-white">General Branding & Welcome Text</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Club Full Name</label>
                  <input
                    type="text"
                    required
                    value={clubName}
                    onChange={e => setClubName(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Club Abbreviation</label>
                  <input
                    type="text"
                    required
                    value={clubAbbreviation}
                    onChange={e => setClubAbbreviation(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo Upload & Display Mode Toggle */}
              <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <label className="text-sm font-bold text-white block">
                      Header & Footer Brand Display Mode
                    </label>
                    <p className="text-xs text-slate-400">
                      Select whether to display the text abbreviation badge or the uploaded logo image across the public website.
                    </p>
                  </div>

                  <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUseLogo(false)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        !useLogo
                          ? 'bg-orange-500 text-white font-bold shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Abbreviation ({clubAbbreviation || 'ARC'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseLogo(true)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        useLogo
                          ? 'bg-orange-500 text-white font-bold shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Uploaded Image Logo
                    </button>
                  </div>
                </div>

                {/* Live Preview Indicator */}
                <div className="pt-2 flex items-center gap-3 border-t border-slate-800/60">
                  <span className="text-xs text-slate-400">Live Header Badge Preview:</span>
                  <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                    {useLogo && clubLogo ? (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden p-0.5 flex items-center justify-center">
                        <img src={clubLogo} alt="Logo" className="w-full h-full object-contain rounded" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                        {clubAbbreviation || 'ARC'}
                      </div>
                    )}
                    <span className="text-xs text-white font-medium">
                      {useLogo ? (clubLogo ? 'Using Uploaded Image Logo' : 'Image Logo (Upload file below)') : `Using Abbreviation Text (${clubAbbreviation || 'ARC'})`}
                    </span>
                  </div>
                </div>

                {/* Upload Image File Input */}
                <div className="pt-2">
                  <ImageUploadInput
                    label="Official Club Logo Image File"
                    value={clubLogo}
                    onChange={setClubLogo}
                    placeholder="Upload logo file (PNG, SVG, WEBP, JPG)..."
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Upload a high-quality logo file. Transparent PNGs or SVGs are recommended.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Landing Welcome Heading</label>
                <input
                  type="text"
                  required
                  value={welcomeHeading}
                  onChange={e => setWelcomeHeading(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Landing Welcome Message</label>
                <textarea
                  rows={3}
                  value={welcomeMessage}
                  onChange={e => setWelcomeMessage(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">About ARC Club</label>
                <textarea
                  rows={3}
                  value={aboutText}
                  onChange={e => setAboutText(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold font-heading text-white">Public Section Visibility</h3>
              <p className="text-xs text-slate-400">Toggle which sections are visible on the public landing page.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'slideshow', label: 'Hero Photo Slideshow' },
                  { key: 'welcome', label: 'Welcome & About' },
                  { key: 'vision_mission', label: 'Vision & Mission' },
                  { key: 'ramazan_quiz', label: 'Ramazan Quiz Widget' },
                  { key: 'exco_team', label: 'EXCO Team Cards' },
                  { key: 'reach_us', label: 'Reach Us Contact Info' }
                ].map(sec => (
                  <div key={sec.key} className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="text-sm font-semibold text-white">{sec.label}</span>
                    <button
                      type="button"
                      onClick={() => setSectionVisibility(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition-colors ${
                        sectionVisibility[sec.key]
                          ? 'bg-orange-950 text-orange-400 border border-orange-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sectionVisibility[sec.key] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{sectionVisibility[sec.key] ? 'Visible' : 'Hidden'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Save Content Settings</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: VISION & MISSION */}
        {currentTab === 'vision_mission' && (
          <form onSubmit={handleSaveVM} className="space-y-6 max-w-4xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold font-heading text-white">Section Overview</h3>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Section Heading</label>
                <input
                  type="text"
                  required
                  value={vmHeading}
                  onChange={e => setVmHeading(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Introduction Text</label>
                <textarea
                  rows={2}
                  value={vmIntro}
                  onChange={e => setVmIntro(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-400 flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Save Vision & Mission</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: EXCO TEAM */}
        {currentTab === 'exco_team' && (
          <div className="space-y-4">
            {loadingExco ? (
              <div className="py-12 text-center text-slate-400">ހިންގާ ކޮމިޓީގެ މައުލޫމާތު ލޯޑުވަނީ...</div>
            ) : excoMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <p className="text-sm">އަދި އެއްވެސް ހިންގާ ކޮމިޓީ މެންބަރަކު އިތުރުކުރެވިފައެއް ނެތެވެ.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateExco}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
                >
                  މެންބަރަކު އިތުރުކުރައްވާ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {excoMembers.map(m => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div className="h-48 relative bg-slate-800 flex items-center justify-center">
                      {m.image && m.image.trim() !== '' ? (
                        <img src={m.image} alt={m.fullName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900 flex flex-col items-center justify-center p-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-1">
                            <User className="w-6 h-6" />
                          </div>
                          <span className="text-[11px] text-slate-300 font-bold truncate max-w-[140px]">{m.fullName}</span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          m.status === 'active' ? 'bg-orange-950 text-orange-400 border border-orange-800' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">{m.designation}</span>
                        <h4 className="text-base font-bold text-white font-heading mt-0.5">{m.fullName}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExco(m)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExco(m.id)}
                          className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SOCIAL MEDIA */}
        {currentTab === 'social_media' && (
          <div className="space-y-4">
            {loadingSocial ? (
              <div className="py-12 text-center text-slate-400">ސޯޝަލް މީޑިއާ ލިންކުތައް ލޯޑުވަނީ...</div>
            ) : socialLinks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <p className="text-sm">އަދި އެއްވެސް ސޯޝަލް މީޑިއާ ލިންކެއް ނެތެވެ.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateSocial}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
                >
                  ލިންކެއް އިތުރުކުރައްވާ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {socialLinks.map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                        {s.platform}
                      </span>
                      <p className="text-xs font-mono text-slate-300 mt-2 truncate">{s.url}</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSocial(s)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSocial(s.id)}
                        className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: EVENTS & ALBUMS */}
        {currentTab === 'events' && (
          <div className="space-y-4">
            {loadingEvents ? (
              <div className="py-12 text-center text-slate-400">ޙަރަކާތްތައް ލޯޑުވަނީ...</div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-medium">އަދި އެއްވެސް ޙަރަކާތެއް ނެތެވެ.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateEvent}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs shadow-md"
                >
                  އާ ހަރަކާތެއް އިތުރުކުރައްވާ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((evt) => {
                  const coverImg = evt.coverImage || (evt.photoAlbum && evt.photoAlbum[0]) || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80';
                  return (
                    <div key={evt.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg">
                      <div>
                        {/* Event Cover Image */}
                        <div className="h-48 relative bg-slate-950 overflow-hidden">
                          <img src={coverImg} alt={evt.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                          
                          {/* Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              evt.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {evt.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          {/* Photo Count */}
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-orange-400" />
                            <span>{evt.photoAlbum ? evt.photoAlbum.length : 0} Photos</span>
                          </div>

                          <div className="absolute bottom-3 right-3 left-3 text-white">
                            <span className="text-[10px] uppercase font-bold text-orange-400">Order: #{evt.displayOrder}</span>
                            <h4 className="text-base font-bold font-heading line-clamp-1">{evt.title}</h4>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>🗓️ {evt.eventDate || 'No Date'}</span>
                            <span>📍 {evt.location || 'ARC'}</span>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{evt.summary}</p>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-4 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEvent(evt)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5 text-orange-400" />
                          <span>އުނިއިތުރު ގެންނަވާ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ފުހެލައްވާ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {currentTab === 'contact' && (
          <div className="space-y-4">
            {loadingContacts ? (
              <div className="py-12 text-center text-slate-400">ގުޅޭނެ މަޢުލޫމާތު ލޯޑުވަނީ...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <p className="text-sm">އަދި އެއްވެސް ގުޅޭނެ ތަފްޞީލެއް ނެތެވެ.</p>
                <button
                  type="button"
                  onClick={handleOpenCreateContact}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-xs"
                >
                  ތަފްޞީލެއް އިތުރުކުރައްވާ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {contacts.map(c => (
                  <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-950 px-2 py-0.5 rounded-md">
                        {c.type}
                      </span>
                      <h4 className="text-base font-bold text-white font-heading mt-2">{c.label}</h4>
                      <p className="text-sm font-mono text-slate-300 mt-1 break-all">{c.value}</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenEditContact(c)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-1.5 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Slide Modal */}
      <Modal isOpen={slideModalOpen} onClose={() => setSlideModalOpen(false)} title={editingSlide ? 'Edit Slide' : 'Add Slide'}>
        <form onSubmit={handleSaveSlide} className="space-y-4">
          <ImageUploadInput
            label="Desktop Image"
            required
            value={desktopImage}
            onChange={setDesktopImage}
          />
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Title *</label>
            <input type="text" required value={slideTitle} onChange={e => setSlideTitle(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Subtitle</label>
            <textarea rows={2} value={slideSubtitle} onChange={e => setSlideSubtitle(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setSlideModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs">Save Slide</button>
          </div>
        </form>
      </Modal>

      {/* Exco Modal */}
      <Modal isOpen={excoModalOpen} onClose={() => setExcoModalOpen(false)} title={editingExco ? 'Edit EXCO Member' : 'Add EXCO Member'}>
        <form onSubmit={handleSaveExco} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Full Name *</label>
            <input type="text" required value={excoFullName} onChange={e => setExcoFullName(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Designation *</label>
            <input type="text" required value={excoDesignation} onChange={e => setExcoDesignation(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <ImageUploadInput
            label="Photo Image"
            required
            value={excoImage}
            onChange={setExcoImage}
          />
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Bio / Description</label>
            <textarea rows={2} value={excoDescription} onChange={e => setExcoDescription(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setExcoModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs">Save EXCO Member</button>
          </div>
        </form>
      </Modal>

      {/* Social Modal */}
      <Modal isOpen={socialModalOpen} onClose={() => setSocialModalOpen(false)} title={editingSocial ? 'Edit Social Link' : 'Add Social Link'}>
        <form onSubmit={handleSaveSocial} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Platform *</label>
            <input type="text" required value={socialPlatform} onChange={e => setSocialPlatform(e.target.value)} placeholder="e.g. Facebook" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">URL *</label>
            <input type="url" required value={socialUrl} onChange={e => setSocialUrl(e.target.value)} placeholder="https://..." className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setSocialModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs">Save Link</button>
          </div>
        </form>
      </Modal>

      {/* Contact Modal */}
      <Modal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} title={editingContact ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleSaveContact} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Type *</label>
            <select value={contactType} onChange={e => setContactType(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white">
              <option value="email">Email</option>
              <option value="primary_phone">Primary Phone</option>
              <option value="secondary_phone">Secondary Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="address">Address</option>
              <option value="working_hours">Working Hours</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Label *</label>
            <input type="text" required value={contactLabel} onChange={e => setContactLabel(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Value *</label>
            <textarea rows={2} required value={contactValue} onChange={e => setContactValue(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white" />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button type="button" onClick={() => setContactModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl text-xs">Save Contact</button>
          </div>
        </form>
      </Modal>

      {/* Event Form Modal */}
      <Modal
        isOpen={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={editingEvent ? 'Edit Event / ޙަރަކާތް ބަދަލުކުރެއްވުން' : 'Add New Event / އާ ޙަރަކާތެއް އިތުރުކުރެއްވުން'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEvent} className="space-y-5 text-right" dir="rtl">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              ޙަރަކާތުގެ ނަން / Event Title *
            </label>
            <input
              type="text"
              required
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              placeholder="މިސާލު: އާނަންދާ ރަމަޟާން ކުއިޒް 2026 އިފްތިތާޙީ ޙަފްލާ"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                ތާރީޚު / Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                ތަން / Location
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={e => setEventLocation(e.target.value)}
                placeholder="މިސާލު: އާނަންދާ ކްލަބް މަރުކަޒު"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              ޚުލާޞާ / Summary * (Short excerpt for cards)
            </label>
            <textarea
              rows={2}
              required
              value={eventSummary}
              onChange={e => setEventSummary(e.target.value)}
              placeholder="ޙަރަކާތުގެ ކުރު ޚުލާޞާއެއް..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              ތަފްޞީލު / Full Description (Optional)
            </label>
            <textarea
              rows={3}
              value={eventDescription}
              onChange={e => setEventDescription(e.target.value)}
              placeholder="ޙަރަކާތުގެ ފުރިހަމަ ތަފްޞީލު..."
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Cover Image Upload */}
          <ImageUploadInput
            label="ކަވަރު ފޮޓޯ / Cover Image"
            value={eventCoverImage}
            onChange={setEventCoverImage}
          />

          {/* Photo Album Management */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-orange-400">
              ފޮޓޯ އަލްބަމް / Photo Album ({eventPhotoAlbum.length} Photos)
            </label>

            {/* Upload New Photo to Album */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-medium text-slate-300 block">އަލްބަމަށް ފޮޓޯއެއް އިތުރުކުރައްވާ:</span>
              <ImageUploadInput
                label="ފޮޓޯ އަޕްލޯޑުކުރައްވާ"
                value=""
                onChange={(uploadedUrl) => {
                  if (uploadedUrl) handleAddPhotoToAlbum(uploadedUrl);
                }}
              />
            </div>

            {/* Photo Thumbnails List */}
            {eventPhotoAlbum.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {eventPhotoAlbum.map((url, index) => (
                  <div key={index} className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group">
                    <img src={url} alt={`Album photo ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhotoFromAlbum(index)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-md"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-slate-300 font-mono">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Display Order & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Display Order / ތަރުތީބު
              </label>
              <input
                type="number"
                min="1"
                value={eventDisplayOrder}
                onChange={e => setEventDisplayOrder(Number(e.target.value))}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Status / ޙާލަތު
              </label>
              <select
                value={eventStatus}
                onChange={e => setEventStatus(e.target.value as 'active' | 'inactive')}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="active">Active (ފެންނަގޮތަށް)</option>
                <option value="inactive">Inactive (ފޮރުވާފައި)</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setEventModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              ކެންސަލް
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>ރައްކާކުރައްވާ</span>
            </button>
          </div>
        </form>
      </Modal>

    </PortalLayout>
  );
};
