import { ModuleKey, Role, SiteSetting, ClubRulesData, UserRoleName, SlideshowItem } from '../types';

export const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'members', 'events_meetings', 'budget', 'slideshow', 'content',
  'vision_mission', 'contact', 'social_media', 'exco_team', 'ramazan_quiz',
  'quiz_participants', 'quiz_winners', 'users', 'roles_permissions',
  'audit_logs', 'club_rules', 'settings', 'messages'
];

export const defaultRoles: Role[] = [
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Full administrative access across all portal modules and security settings.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_admin',
      moduleKey: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true,
      canApprove: true,
      canExport: true,
      canManageSettings: true
    }))
  },
  {
    id: 'role_president',
    name: 'President' as UserRoleName,
    description: 'Executive governance, presidential directives, circulars, meeting oversight and approvals.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_president',
      moduleKey: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canPublish: true,
      canApprove: true,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_treasurer',
    name: 'Treasurer' as UserRoleName,
    description: 'Financial accounting, bank accounts, income/expense records, and member contributions.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_treasurer',
      moduleKey: m,
      canView: true,
      canCreate: m === 'budget' || m === 'members',
      canEdit: m === 'budget' || m === 'members',
      canDelete: false,
      canPublish: m === 'budget',
      canApprove: m === 'budget',
      canExport: true,
      canManageSettings: m === 'budget'
    }))
  },
  {
    id: 'role_secretary',
    name: 'Secretary' as UserRoleName,
    description: 'Club correspondence, event planning, meeting minutes, attendance, and member records.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_secretary',
      moduleKey: m,
      canView: true,
      canCreate: m === 'events_meetings' || m === 'members' || m === 'messages',
      canEdit: m === 'events_meetings' || m === 'members' || m === 'messages',
      canDelete: false,
      canPublish: true,
      canApprove: false,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_exco',
    name: 'EXCO Member' as UserRoleName,
    description: 'Executive committee access to events, meetings, internal messages, and quiz management.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_exco',
      moduleKey: m,
      canView: true,
      canCreate: m === 'events_meetings' || m === 'ramazan_quiz' || m === 'messages',
      canEdit: m === 'events_meetings' || m === 'ramazan_quiz' || m === 'messages',
      canDelete: false,
      canPublish: false,
      canApprove: false,
      canExport: true,
      canManageSettings: false
    }))
  },
  {
    id: 'role_member',
    name: 'Club Member' as UserRoleName,
    description: 'Standard member portal access to events, personal contributions, and club rules.',
    isSystemRole: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultPermissions: ALL_MODULES.map(m => ({
      roleId: 'role_member',
      moduleKey: m,
      canView: m === 'dashboard' || m === 'events_meetings' || m === 'club_rules' || m === 'budget',
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canPublish: false,
      canApprove: false,
      canExport: false,
      canManageSettings: false
    }))
  }
];

export const defaultSiteSettingsList: SiteSetting[] = [
  { id: 'set_branding_clubName', group: 'branding', key: 'clubName', value: 'Ananda Recreation Club', updatedAt: new Date().toISOString() },
  { id: 'set_branding_clubAbbreviation', group: 'branding', key: 'clubAbbreviation', value: 'ARC', updatedAt: new Date().toISOString() },
  { id: 'set_branding_welcomeHeading', group: 'branding', key: 'welcomeHeading', value: 'Welcome to Ananda Recreation Club', updatedAt: new Date().toISOString() },
  { id: 'set_branding_welcomeMessage', group: 'branding', key: 'welcomeMessage', value: 'Connecting hearts and encouraging excellence.', updatedAt: new Date().toISOString() },
  { id: 'set_branding_aboutText', group: 'branding', key: 'aboutText', value: 'Ananda Recreation Club (ARC) is dedicated to youth empowerment, sports, and community engagement in Male\', Maldives.', updatedAt: new Date().toISOString() },
  { id: 'set_branding_headerTitle', group: 'branding', key: 'headerTitle', value: 'Ananda Recreation Club', updatedAt: new Date().toISOString() },
  { id: 'set_branding_headerSubtitle', group: 'branding', key: 'headerSubtitle', value: 'Community & Youth Empowerment Portal', updatedAt: new Date().toISOString() },
  { id: 'set_branding_footerDescription', group: 'branding', key: 'footerDescription', value: 'Official community club website and Ramazan Quiz platform.', updatedAt: new Date().toISOString() },
  { id: 'set_branding_copyrightText', group: 'branding', key: 'copyrightText', value: `© ${new Date().getFullYear()} Ananda Recreation Club. All Rights Reserved.`, updatedAt: new Date().toISOString() },
  { id: 'set_quiz_timeOffsetMinutes', group: 'quiz', key: 'timeOffsetMinutes', value: 0, updatedAt: new Date().toISOString() },
  { id: 'set_branding_timezone', group: 'branding', key: 'timezone', value: 'Indian/Maldives (GMT+05:00)', updatedAt: new Date().toISOString() },
  { id: 'set_budget_accountName', group: 'budget', key: 'accountName', value: 'AANANDHA RECREATION CLUB', updatedAt: new Date().toISOString() },
  { id: 'set_budget_accountNumber', group: 'budget', key: 'accountNumber', value: 'BML | (MVR) 7730000308018', updatedAt: new Date().toISOString() },
  { id: 'set_budget_bankName', group: 'budget', key: 'bankName', value: 'Bank of Maldives (BML)', updatedAt: new Date().toISOString() },
  { id: 'set_budget_paymentInstructionsEn', group: 'budget', key: 'paymentInstructionsEn', value: 'Bank Transfer made payable to: Account Name: AANANDHA RECREATION CLUB | Account Number: BML | (MVR) 7730000308018. Please mention invoice number in remarks and send slip to info@arcclub.mv', updatedAt: new Date().toISOString() },
  { id: 'set_budget_paymentInstructionsDv', group: 'budget', key: 'paymentInstructionsDv', value: 'ބޭންކް ޓްރާންސްފަރ މެދުވެރިކޮށް ފައިސާދައްކާނީ AANANDHA RECREATION CLUB އަށެވެ. ޓްރާންސްފަރ ރިމާކްސްގައި އިންވޮއިސް ނަންބަރު ޖެއްސެވުމަށްފަހު ސްލިޕް info@arcclub.mv އަށް ފޮނުއްވާދެއްވުން އެދެމެވެ.', updatedAt: new Date().toISOString() },
  { id: 'set_budget_invoiceLogo', group: 'budget', key: 'invoiceLogo', value: '', updatedAt: new Date().toISOString() },
  { id: 'set_budget_invoicePhone', group: 'budget', key: 'invoicePhone', value: '6580394', updatedAt: new Date().toISOString() },
  { id: 'set_budget_invoiceEmail', group: 'budget', key: 'invoiceEmail', value: 'info@arcclub.mv', updatedAt: new Date().toISOString() },
  { id: 'set_budget_invoiceAddress', group: 'budget', key: 'invoiceAddress', value: 'AANANDHA RECREATION CLUB\nRaa.Maduvvari, 05110\nMaldives', updatedAt: new Date().toISOString() },
  { id: 'set_budget_defaultInvoicePrefix', group: 'budget', key: 'defaultInvoicePrefix', value: 'ARC/INV/', updatedAt: new Date().toISOString() },
  { id: 'set_budget_defaultQuotationPrefix', group: 'budget', key: 'defaultQuotationPrefix', value: 'ARC/QUO/', updatedAt: new Date().toISOString() }
];

export const defaultSlideshow: SlideshowItem[] = [
  {
    id: 'slide_001',
    title: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބަށް މަރުޙަބާ',
    subtitle: 'Connecting hearts and encouraging community excellence',
    desktopImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80',
    textAlignment: 'center',
    overlayLevel: 40,
    displayOrder: 1,
    status: 'active',
    buttonText: 'ބައިވެރިވޭ (Join Us)',
    buttonLink: '#reach-us',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'slide_002',
    title: 'ރަމަޟާން ކުއިޒް 1447',
    subtitle: 'ސުވާލުތަކަށް ޖަވާބުދެއްވައި އަގުހުރި އިނާމުތައް ހޯއްދަވާ!',
    desktopImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80',
    textAlignment: 'center',
    overlayLevel: 50,
    displayOrder: 2,
    status: 'active',
    buttonText: 'ކުއިޒުގައި ބައިވެރިވޭ',
    buttonLink: '#quiz',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultContacts: any[] = [
  {
    id: 'contact_001',
    type: 'primary_phone',
    label: 'ރަސްމީ ފޯނު ނަންބަރު (Hotline)',
    value: '+960 7771234',
    displayOrder: 1,
    status: 'active'
  },
  {
    id: 'contact_002',
    type: 'email',
    label: 'ރަސްމީ އީމެއިލް (Official Email)',
    value: 'info@arcclub.mv',
    displayOrder: 2,
    status: 'active'
  },
  {
    id: 'contact_003',
    type: 'address',
    label: 'އިދާރީ އެޑްރެސް (Registered Address)',
    value: 'H. ARC Clubhouse, Boduthakurufaanu Magu, Malé, Maldives',
    displayOrder: 3,
    status: 'active'
  }
];

export const defaultSocialLinks: any[] = [
  {
    id: 'soc_001',
    platform: 'facebook',
    label: 'Facebook',
    url: 'https://facebook.com/arcclubmv',
    displayOrder: 1,
    status: 'active'
  },
  {
    id: 'soc_002',
    platform: 'instagram',
    label: 'Instagram',
    url: 'https://instagram.com/arcclubmv',
    displayOrder: 2,
    status: 'active'
  },
  {
    id: 'soc_003',
    platform: 'x',
    label: 'X (Twitter)',
    url: 'https://x.com/arcclubmv',
    displayOrder: 3,
    status: 'active'
  }
];

export const defaultExcoMembers: any[] = [
  {
    id: 'exco_001',
    fullName: 'Mohamed Ameen',
    designation: 'President',
    designationDhivehi: 'ރައީސް',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bio: 'Leading strategic youth initiatives and club governance.',
    contactNumber: '+960 7771122',
    email: 'president@arcclub.mv',
    displayOrder: 1,
    termStart: '2025-01-01',
    termEnd: '2027-12-31',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exco_002',
    fullName: 'Ahmed Shifaz',
    designation: 'Vice President',
    designationDhivehi: 'ނައިބު ރައީސް',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Overseeing community outreach, youth empowerment and events.',
    contactNumber: '+960 7773344',
    email: 'vp@arcclub.mv',
    displayOrder: 2,
    termStart: '2025-01-01',
    termEnd: '2027-12-31',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exco_003',
    fullName: 'Aishath Niuma',
    designation: 'Secretary General',
    designationDhivehi: 'ސެކްރެޓަރީ ޖެނެރަލް',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    bio: 'Managing club administration, secretarial records, and official correspondence.',
    contactNumber: '+960 7775566',
    email: 'secretary@arcclub.mv',
    displayOrder: 3,
    termStart: '2025-01-01',
    termEnd: '2027-12-31',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'exco_004',
    fullName: 'Ibrahim Razeen',
    designation: 'Treasurer',
    designationDhivehi: 'ޚަޒާންދާރު',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Managing club financial accounting, budgets, and audit compliance.',
    contactNumber: '+960 7777788',
    email: 'treasurer@arcclub.mv',
    displayOrder: 4,
    termStart: '2025-01-01',
    termEnd: '2027-12-31',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultEvents: any[] = [
  {
    id: 'evt_001',
    title: 'ARC Annual Ramadan Futsal Tournament 2026',
    summary: 'Join the premier community sports tournament with thrilling youth teams.',
    description: 'Annual futsal tournament bringing youth together for friendly competition and sportsmanship during Ramadan.',
    eventDate: '2026-03-15T16:00:00.000Z',
    location: 'Henveiru Youth Ground, Malé',
    photoAlbum: [],
    displayOrder: 1,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const defaultInvoices: any[] = [
  {
    id: 'inv_001',
    type: 'invoice',
    invoiceNumber: 'ARC/INV/2026/0001',
    invoiceDate: '2026-02-09',
    dueDate: '2026-02-23',
    billTo: 'R.Maduvvari Health Center',
    customerAddress: 'R.Maduvvari, 05110, Maldives',
    tin: '1054321GST001',
    remark: 'Supply of fuel for emergency generator facility',
    items: [
      {
        id: 'item_1',
        description: 'Petrol',
        qty: 39.98,
        rate: 18,
        amount: 718.02
      },
      {
        id: 'item_2',
        description: 'Diesel',
        qty: 44.96,
        rate: 17,
        amount: 764.32
      }
    ],
    subTotal: 1482.34,
    discount: 0,
    totalNetPayments: 1482.34,
    amountPaid: 0,
    amountDue: 1482.34,
    paymentMethod: 'online',
    receivedBy: 'Health Center Administrator',
    receivedDate: '2026-02-09',
    bankName: 'Bank of Maldives (BML)',
    accountName: 'AANANDHA RECREATION CLUB',
    accountNumber: 'BML | (MVR) 7730000308018',
    footerNoticeEnglish: 'For any queries or issues related to the invoice, please notify us within 24hrs.',
    footerNoticeDhivehi: 'ބިލާމެދު އެއްވެސް މައްސަލައެއް އުޅޭނަމަ 24 ގަޑިއިރު ތެރޭގައި އެންގުން އެދެމެވެ.',
    clubPhone: '6580394',
    clubEmail: 'arc.rmhc@gmail.com',
    clubAddress: 'AANANDHA RECREATION CLUB\nRaa.Maduvvari, 05110\nMaldives',
    status: 'approved',
    approvalStatus: 'approved',
    approvedBy: 'usr_president_001',
    approvedByName: 'Mohamed Ameen (President)',
    approvedAt: '2026-02-09T08:30:00.000Z',
    createdBy: 'usr_treasurer_001',
    createdByName: 'Ibrahim Razeen (Treasurer)',
    createdAt: '2026-02-09T08:00:00.000Z',
    updatedAt: '2026-02-09T08:30:00.000Z'
  }
];

export const defaultClubRules: ClubRulesData = {
  titleDhivehi: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ގަވާއިދު',
  titleEnglish: 'Ananda Recreation Club Constitution & Bye-Laws',
  descriptionDhivehi: 'ކްލަބުގެ އެންމެހައި ކަންކަން ހިންގުމާ ބެހޭ އަސާސީ ގަވާއިދާއި އުސޫލުތައް',
  descriptionEnglish: 'Primary governing constitution, regulatory operational procedures, and member code of conduct.',
  version: '2026.1',
  effectiveDate: '2026-01-01',
  updatedAt: new Date().toISOString(),
  chapters: [
    {
      id: 'chap_1',
      chapterNumber: 1,
      titleDhivehi: 'އެކުލެވިގެންވާ ގޮތާއި ނަން',
      titleEnglish: 'Name & Constitutional Identity',
      summaryDhivehi: 'ކްލަބުގެ ރަސްމީ ނަމާއި، އިދާރީ މަރުކަޒު އަދި އަސާސީ މަގުސަދުތައް.',
      summaryEnglish: 'Official club name, registered location, and core foundational objectives.',
      articles: [
        {
          articleNumber: '1.1',
          title: 'ކްލަބުގެ ނަން (Club Name)',
          titleDhivehi: 'ކްލަބުގެ ނަން',
          titleEnglish: 'Club Name & Abbreviation',
          content: 'މި ޖަމްޢިއްޔާގެ ނަމަކީ "އާނަންދާ ރީކްރިއޭޝަން ކްލަބް" (Ananda Recreation Club) އެވެ. ކުރުކޮށް ބޭނުންކުރާނީ "ARC" އެވެ.',
          contentDhivehi: 'މި ޖަމްޢިއްޔާގެ ނަމަކީ "އާނަންދާ ރީކްރިއޭޝަން ކްލަބް" (Ananda Recreation Club) އެވެ. ކުރުކޮށް ބޭނުންކުރާނީ "ARC" އެވެ.',
          contentEnglish: 'The official registered title of this NGO shall be "Ananda Recreation Club", abbreviated as "ARC".'
        },
        {
          articleNumber: '1.2',
          title: 'އިދާރީ މަރުކަޒު (Registered Office)',
          titleDhivehi: 'އިދާރީ މަރުކަޒު',
          titleEnglish: 'Registered Office Location',
          content: 'ކްލަބުގެ ރަސްމީ އިދާރީ މަރުކަޒު ހުންނާނީ މާލެ، ދިވެހިރާއްޖޭގައެވެ.',
          contentDhivehi: 'ކްލަބުގެ ރަސްމީ އިދާރީ މަރުކަޒު ހުންނާނީ މާލެ، ދިވެހިރާއްޖޭގައެވެ.',
          contentEnglish: 'The primary head office and registered address of the Club shall be situated in Malé, Republic of Maldives.'
        }
      ]
    }
  ]
};
