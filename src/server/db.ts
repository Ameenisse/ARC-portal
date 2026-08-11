import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// Initialize Supabase Client & PostgreSQL Pool for cross-device cloud persistence
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const dbUrl = process.env.DATABASE_URL || '';

export const supabaseClient = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) 
  : null;

export const pgPool = dbUrl 
  ? new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } }) 
  : null;

// Ensure all database tables exist in Supabase / PostgreSQL
let tablesCreated = false;
async function ensureTablesExist() {
  if (tablesCreated || !pgPool) return;
  try {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_store (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          status TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          full_name TEXT,
          role_id TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS quiz_questions (
          id TEXT PRIMARY KEY,
          title TEXT,
          question_number INT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS quiz_submissions (
          id TEXT PRIMARY KEY,
          question_id TEXT,
          full_name TEXT,
          phone TEXT,
          id_card_number TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS quiz_winners (
          id TEXT PRIMARY KEY,
          question_id TEXT,
          full_name TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS prizes (
          id TEXT PRIMARY KEY,
          title TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS sponsors (
          id TEXT PRIMARY KEY,
          name TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          member_number TEXT,
          full_name TEXT,
          id_card_number TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          title TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS meeting_items (
          id TEXT PRIMARY KEY,
          title TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS exco_members (
          id TEXT PRIMARY KEY,
          name TEXT,
          id_card_number TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          name TEXT,
          status TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE app_store ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE members ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE members ADD COLUMN IF NOT EXISTS id_card_number TEXT;
        ALTER TABLE exco_members ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE exco_members ADD COLUMN IF NOT EXISTS id_card_number TEXT;
        ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS id_card_number TEXT;
        ALTER TABLE quiz_winners ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE prizes ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE meeting_items ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status TEXT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT;
      `);
      tablesCreated = true;
      console.log('Supabase/PostgreSQL tables ensured successfully.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Supabase table setup notice:', err?.message || err);
  }
}


import {
  User,
  Role,
  SlideshowItem,
  SiteSetting,
  SocialLink,
  ExcoMember,
  QuizQuestion,
  QuizSubmission,
  QuizWinner,
  QuizPrize,
  QuizSponsor,
  AuditLog,
  PublicSiteData,
  ModuleKey,
  ModulePermission,
  ClubEvent,
  InboxMessage,
  MessageActionRecord,
  AppNotification,
  ClubMember,
  EventItem,
  MeetingItem,
  ClubRulesData
} from '../types';

const defaultClubRules: ClubRulesData = {
  titleDhivehi: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ހިންގާ ޤަވާޢިދު 2026',
  titleEnglish: 'Ananda Recreation Club - Official Rules & Regulations (2026)',
  description: 'ކްލަބުގެ މަޤްޞަދުތަކާއި، މެންބަރުންގެ ޙައްޤުތަކާއި މަސްއޫލިއްޔަތުތައް، އަދި ހިންގާ ކޮމިޓީގެ ދައުރާއި އިދާރީ އުޞޫލުތައް ބަޔާންކުރާ ރަސްމީ ޤަވާޢިދު.',
  descriptionDhivehi: 'ކްލަބުގެ މަޤްޞަދުތަކާއި، މެންބަރުންގެ ޙައްޤުތަކާއި މަސްއޫލިއްޔަތުތައް، އަދި ހިންގާ ކޮމިޓީގެ ދައުރާއި އިދާރީ އުޞޫލުތައް ބަޔާންކުރާ ރަސްމީ ޤަވާޢިދު.',
  descriptionEnglish: 'Official constitution, member rights and obligations, executive committee responsibilities, and administrative regulations of Ananda Recreation Club.',
  version: '2.1',
  effectiveDate: '2026-01-01',
  updatedAt: new Date().toISOString(),
  updatedByName: 'Mohamed Ibrahim (President)',
  chapters: [
    {
      id: 'chap_1',
      chapterNumber: 1,
      titleDhivehi: 'ބާބު 1: ނަމާއި، އެޑްރެސް އަދި މަޤްޞަދުތައް',
      titleEnglish: 'Chapter 1: Name, Registered Address & Objectives',
      summary: 'ކްލަބުގެ ނަމާއި، ރަސްމީ އެޑްރެސް އަދި ޖަމްޢިއްޔާގެ އަސާސީ މަޤްޞަދުތައް.',
      summaryDhivehi: 'ކްލަބުގެ ނަމާއި، ރަސްމީ އެޑްރެސް އަދި ޖަމްޢިއްޔާގެ އަސާސީ މަޤްޞަދުތައް.',
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
        },
        {
          articleNumber: '1.3',
          title: 'އަސާސީ މަޤްޞަދުތައް (Main Objectives)',
          titleDhivehi: 'އަސާސީ މަޤްޞަދުތައް',
          titleEnglish: 'Main Objectives & Scope',
          content: '1) މެންބަރުންގެ މެދުގައި އެކުވެރިކަމާއި އިޖުތިމާއީ ގުޅުން ބަދަހިކުރުން.\n2) ޒުވާނުންގެ ކުޅިވަރާއި ހުނަރުތައް ތަރައްޤީކުރުމަށް ފުރުޞަތު ހޯދައިދިނުން.\n3) އިޖުތިމާއީ އަދި ޚައިރާތީ ޙަރަކާތްތައް ހިންގުން.',
          contentDhivehi: '1) މެންބަރުންގެ މެދުގައި އެކުވެރިކަމާއި އިޖުތިމާއީ ގުޅުން ބަދަހިކުރުން.\n2) ޒުވާނުންގެ ކުޅިވަރާއި ހުނަރުތައް ތަރައްޤީކުރުމަށް ފުރުޞަތު ހޯދައިދިނުން.\n3) އިޖުތިމާއީ އަދި ޚައިރާތީ ޙަރަކާތްތައް ހިންގުން.',
          contentEnglish: '1) To foster social unity and harmony among members.\n2) To empower youth through sports, talents, and community initiatives.\n3) To organize community service and charitable events.'
        }
      ]
    },
    {
      id: 'chap_2',
      chapterNumber: 2,
      titleDhivehi: 'ބާބު 2: މެންބަރުކަމުގެ އުޞޫލުތައް އަދި ޝަރުޠުތައް',
      titleEnglish: 'Chapter 2: Membership Qualifications & Rules',
      summary: 'މެންބަރަކަށް ވުމުގެ ޝަރުޠުތަކާއި، މެންބަރުކަމުގެ ބާވަތްތަކާއި ފީ.',
      summaryDhivehi: 'މެންބަރަކަށް ވުމުގެ ޝަރުޠުތަކާއި، މެންބަރުކަމުގެ ބާވަތްތަކާއި ފީ.',
      summaryEnglish: 'Eligibility criteria, categories of membership, and annual dues.',
      articles: [
        {
          articleNumber: '2.1',
          title: 'މެންބަރުކަމުގެ ޝަރުޠުތައް (Eligibility)',
          titleDhivehi: 'މެންބަރުކަމުގެ ޝަރުޠުތައް',
          titleEnglish: 'Eligibility Requirements',
          content: 'ދިވެހިރާއްޖޭގެ ޤާނޫނުއަސާސީގެ ދަށުން ކުށުގެ ނިޔާއެއް ތަންފީޛުކުރަމުން ނުދާ، އުމުރުން 18 އަހަރު ފުރިފައިވާ ކޮންމެ ދިވެހި ރައްޔިތަކަށް މެންބަރުކަމަށް އެދެވޭނެއެވެ.',
          contentDhivehi: 'ދިވެހިރާއްޖޭގެ ޤާނޫނުއަސާސީގެ ދަށުން ކުށުގެ ނިޔާއެއް ތަންފީޛުކުރަމުން ނުދާ، އުމުރުން 18 އަހަރު ފުރިފައިވާ ކޮންމެ ދިވެހި ރައްޔިތަކަށް މެންބަރުކަމަށް އެދެވޭނެއެވެ.',
          contentEnglish: 'Any Maldivian citizen aged 18 years or above who is not serving a felony criminal sentence is eligible to apply for membership.'
        },
        {
          articleNumber: '2.2',
          title: 'މެންބަރުކަމުގެ ބާވަތްތައް (Membership Categories)',
          titleDhivehi: 'މެންބަރުކަމުގެ ބާވަތްތައް',
          titleEnglish: 'Categories of Membership',
          content: '1) އާންމު މެންބަރުން (Standard Members)\n2) ހިންގާ ކޮމިޓީ މެންބަރުން (EXCO Members)\n3) ޝަރަފުވެރި މެންބަރުން (Honorary Members)',
          contentDhivehi: '1) އާންމު މެންބަރުން (Standard Members)\n2) ހިންގާ ކޮމިޓީ މެންބަރުން (EXCO Members)\n3) ޝަރަފުވެރި މެންބަރުން (Honorary Members)',
          contentEnglish: '1) Standard Members\n2) EXCO Board Members\n3) Honorary Members'
        },
        {
          articleNumber: '2.3',
          title: 'އަހަރީ ފީ (Annual Membership Fee)',
          titleDhivehi: 'އަހަރީ ފީ',
          titleEnglish: 'Annual Membership Dues',
          content: 'ކޮންމެ މެންބަރަކުވެސް ކްލަބުގެ އަހަރީ މެންބަރޝިޕް ފީ ކަނޑައެޅިފައިވާ ތާރީޚުގެ ކުރިން ދައްކައި ޚަލާޞްކުރަންވާނެއެވެ.',
          contentDhivehi: 'ކޮންމެ މެންބަރަކުވެސް ކްލަބުގެ އަހަރީ މެންބަރޝިޕް ފީ ކަނޑައެޅިފައިވާ ތާރީޚުގެ ކުރިން ދައްކައި ޚަލާޞްކުރަންވާނެއެވެ.',
          contentEnglish: 'Every registered member must settle their designated annual membership fee prior to the annual deadline.'
        }
      ]
    },
    {
      id: 'chap_3',
      chapterNumber: 3,
      titleDhivehi: 'ބާބު 3: ހިންގާ ކޮމިޓީ އަދި މަސްއޫލިއްޔަތުތައް',
      titleEnglish: 'Chapter 3: Executive Committee (EXCO)',
      summary: 'އެގްޒެކެޓިވް ކޮމިޓީ އެކުލެވިގެންވާ ގޮތާއި، އިންތިޚާބުކުރުމުގެ އުޞޫލު.',
      summaryDhivehi: 'އެގްޒެކެޓިވް ކޮމިޓީ އެކުލެވިގެންވާ ގޮތާއި، އިންތިޚާބުކުރުމުގެ އުޞޫލު.',
      summaryEnglish: 'EXCO composition, election procedures, and leadership duties.',
      articles: [
        {
          articleNumber: '3.1',
          title: 'ކޮމިޓީގެ އެކުލެވުން (Composition)',
          titleDhivehi: 'ކޮމިޓީގެ އެކުލެވުން',
          titleEnglish: 'Committee Composition',
          content: 'ހިންގާ ކޮމިޓީގައި ހިމެނޭނީ ރައީސް، ނާއިބު ރައީސް، ސެކްރެޓަރީ ޖެނެރަލް، ޚަޒާންދާރު، އަދި އިންތިޚާބުކުރެވޭ މެންބަރުންނެވެ.',
          contentDhivehi: 'ހިންގާ ކޮމިޓީގައި ހިމެނޭނީ ރައީސް، ނާއިބު ރައީސް، ސެކްރެޓަރީ ޖެނެރަލް، ޚަޒާންދާރު، އަދި އިންތިޚާބުކުރެވޭ މެންބަރުންނެވެ.',
          contentEnglish: 'The Executive Committee consists of President, Vice President, Secretary General, Treasurer, and elected EXCO Members.'
        },
        {
          articleNumber: '3.2',
          title: 'ދައުރުގެ މުއްދަތު (Tenure)',
          titleDhivehi: 'ދައުރުގެ މުއްދަތު',
          titleEnglish: 'Office Tenure',
          content: 'ހިންގާ ކޮމިޓީގެ ދައުރަކީ މީލާދީ 2 އަހަރު ދުވަހެވެ.',
          contentDhivehi: 'ހިންގާ ކޮމިޓީގެ ދައުރަކީ މީލާދީ 2 އަހަރު ދުވަހެވެ.',
          contentEnglish: 'The standard term of office for the Executive Committee shall be 2 calendar years.'
        }
      ]
    },
    {
      id: 'chap_4',
      chapterNumber: 4,
      titleDhivehi: 'ބާބު 4: އަޚްލާޤީ ސުލޫކު އަދި ފިޔަވަޅުއެޅުން',
      titleEnglish: 'Chapter 4: Code of Conduct & Disciplinary Action',
      summary: 'މެންބަރުންގެ އަޚްލާޤީ މިންގަނޑުތަކާއި ސުލޫކީ މައްސަލަތަކުގައި ފިޔަވަޅުއެޅުން.',
      summaryDhivehi: 'މެންބަރުންގެ އަޚްލާޤީ މިންގަނޑުތަކާއި ސުލޫކީ މައްސަލަތަކުގައި ފިޔަވަޅުއެޅުން.',
      summaryEnglish: 'Behavioral standards, conflict resolution, and disciplinary protocol.',
      articles: [
        {
          articleNumber: '4.1',
          title: 'އަޚްލާޤީ މިންގަނޑު (Code of Conduct)',
          titleDhivehi: 'އަޚްލާޤީ މިންގަނޑު',
          titleEnglish: 'Code of Conduct',
          content: 'ކްލަބުގެ ކޮންމެ މެންބަރަކުވެސް ކްލަބުގެ އިއްޒަތާއި އަބުރަށް އުނިކަން ނުލިބޭނެފަދަ ގޮތަކަށް އަމަލުތައް ބަހައްޓަންވާނެއެވެ.',
          contentDhivehi: 'ކްލަބުގެ ކޮންމެ މެންބަރަކުވެސް ކްލަބުގެ އިއްޒަތާއި އަބުރަށް އުނިކަން ނުލިބޭނެފަދަ ގޮތަކަށް އަމަލުތައް ބަހައްޓަންވާނެއެވެ.',
          contentEnglish: 'All club members shall uphold integrity and conduct themselves in a manner that protects the reputation of the Club.'
        },
        {
          articleNumber: '4.2',
          title: 'ފިޔަވަޅުއެޅުން (Disciplinary Procedures)',
          titleDhivehi: 'ފިޔަވަޅުއެޅުން',
          titleEnglish: 'Disciplinary Measures',
          content: 'ޤަވާޢިދާ ޚިލާފުވާ މެންބަރުންނާމެދު ނަސޭހަތްދިނުމާއި، ވަގުތީގޮތުން ސަސްޕެންޑްކުރުން ނުވަތަ މެންބަރުކަމުން ވަކިކުރުމުގެ އިޚްތިޔާރު ހިންގާ ކޮމިޓީއަށް ލިބިގެންވެއެވެ.',
          contentDhivehi: 'ޤަވާޢިދާ ޚިލާފުވާ މެންބަރުންނާމެދު ނަސޭހަތްދިނުމާއި، ވަގުތީގޮތުން ސަސްޕެންޑްކުރުން ނުވަތަ މެންބަރުކަމުން ވަކިކުރުމުގެ އިޚްތިޔާރު ހިންގާ ކޮމިޓީއަށް ލިބިގެންވެއެވެ.',
          contentEnglish: 'The EXCO holds the authority to issue warnings, temporary suspensions, or membership revocations for violations.'
        }
      ]
    }
  ]
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'arc_db.json');

// Salt & PIN hashing functions
export function hashPin(pin: string, providedSalt?: string): { hash: string; salt: string } {
  const salt = providedSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 1000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const newHash = crypto.pbkdf2Sync(pin, salt, 1000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
}

// Generate default permissions for Admin role
const ALL_MODULES: ModuleKey[] = [
  'dashboard', 'members', 'events_meetings', 'slideshow', 'content', 'vision_mission', 'contact',
  'social_media', 'exco_team', 'ramazan_quiz', 'quiz_participants',
  'quiz_winners', 'users', 'roles_permissions', 'audit_logs', 'settings', 'messages'
];

function createAdminPermissions(userId: string): ModulePermission[] {
  return ALL_MODULES.map((m, idx) => ({
    id: `perm_admin_${m}_${idx}`,
    userId,
    moduleKey: m,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canPublish: true,
    canApprove: true,
    canExport: true,
    canManageSettings: true
  }));
}

export interface DBData {
  users: Array<User & { pinHash: string; pinSalt: string }>;
  roles: Role[];
  slideshow: SlideshowItem[];
  settings: SiteSetting[];
  socialLinks: SocialLink[];
  contacts: Array<{
    id: string;
    type: string;
    label: string;
    value: string;
    displayOrder: number;
    status: 'active' | 'inactive';
  }>;
  excoMembers: ExcoMember[];
  quizQuestions: QuizQuestion[];
  quizSubmissions: QuizSubmission[];
  quizWinners: QuizWinner[];
  prizes?: QuizPrize[];
  sponsors?: QuizSponsor[];
  auditLogs: AuditLog[];
  events?: ClubEvent[];
  members?: ClubMember[];
  eventItems?: EventItem[];
  meetingItems?: MeetingItem[];
  messages?: InboxMessage[];
  notifications?: AppNotification[];
  sessions?: Array<{ token: string; userId: string; expiresAt: number }>;
  ineligibleParticipantIds?: string[];
  clubRules?: ClubRulesData;
}

// Default Seed State
function getDefaultSeed(): DBData {
  const adminSaltHash = hashPin('2613');
  const adminId = 'usr_admin_001';

  const defaultAdmin: User & { pinHash: string; pinSalt: string } = {
    id: adminId,
    fullName: 'System Administrator',
    username: 'admin',
    designation: 'Managing Director / Chief Admin',
    contactNumber: '+960 7771234',
    roleId: 'role_admin',
    roleName: 'Admin',
    status: 'active',
    requirePinChange: true,
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: 'Primary system administrator account',
    permissions: createAdminPermissions(adminId),
    pinHash: adminSaltHash.hash,
    pinSalt: adminSaltHash.salt
  };

  const defaultRoles: Role[] = [
    {
      id: 'role_admin',
      name: 'Admin',
      description: 'Full system control with unrestricted permissions.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: true, canCreate: true, canEdit: true, canDelete: true,
        canPublish: true, canApprove: true, canExport: true, canManageSettings: true
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'role_president',
      name: 'President',
      description: 'Executive overview, approval, content & quiz management.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: true, canCreate: m !== 'users', canEdit: true, canDelete: false,
        canPublish: true, canApprove: true, canExport: true, canManageSettings: m === 'settings'
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'role_vp',
      name: 'Vice President',
      description: 'Secondary executive, content & community operations.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: true, canCreate: true, canEdit: true, canDelete: false,
        canPublish: true, canApprove: false, canExport: true, canManageSettings: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'role_treasurer',
      name: 'Treasurer',
      description: 'Financial, prize distribution & winner management.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: true, canCreate: false, canEdit: m === 'quiz_winners', canDelete: false,
        canPublish: false, canApprove: false, canExport: true, canManageSettings: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'role_secretary',
      name: 'Secretary',
      description: 'Records, communications, EXCO list & submissions management.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: true, canCreate: true, canEdit: true, canDelete: false,
        canPublish: true, canApprove: false, canExport: true, canManageSettings: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'role_exco',
      name: 'EXCO Member',
      description: 'Executive committee member with operational and event management access.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: true, canCreate: false, canEdit: false, canDelete: false,
        canPublish: false, canApprove: false, canExport: false, canManageSettings: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'role_member',
      name: 'Club Member',
      description: 'Standard club member access to member dashboard and performance history.',
      isSystemRole: true,
      defaultPermissions: ALL_MODULES.map(m => ({
        moduleKey: m, canView: m === 'dashboard', canCreate: false, canEdit: false, canDelete: false,
        canPublish: false, canApprove: false, canExport: false, canManageSettings: false
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultSlideshow: SlideshowItem[] = [
    {
      id: 'slide_01',
      desktopImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80',
      title: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބަށް މަރުޙަބާ!',
      subtitle: 'އެއްބައިވަން، ހަރަކާތްތެރި އަދި އުފެއްދުންތެރި މުޖުތަމަޢެއް ބިނާކުރުމުގައި',
      buttonText: 'ރަމަޟާން ކުއިޒްގައި ބައިވެރިވެލައްވާ',
      buttonLink: '#quiz',
      textAlignment: 'center',
      overlayLevel: 45,
      displayOrder: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'slide_02',
      desktopImage: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1600&q=80',
      title: 'ރަމަޟާން 1447 ޚާއްޞަ ސުވާލު މުބާރާތް',
      subtitle: 'ދީނީ މައުލޫމާތު އިތުރުކޮށް، ކޮންމެ ދުވަހަކު އަގުހުރި އިނާމުތަކެއް ހޯއްދަވާ!',
      buttonText: 'ކުއިޒްގެ ތަފްޞީލް ބައްލަވާ',
      buttonLink: '#quiz',
      textAlignment: 'center',
      overlayLevel: 50,
      displayOrder: 2,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'slide_03',
      desktopImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1600&q=80',
      title: 'ޒުވާނުންނާއި އާއިލާތަކުގެ ކުރިއެރުމަށް',
      subtitle: 'ކުޅިވަރާއި އިޖުތިމާއީ އެކި ހަރަކާތްތައް ރޭވިގެން ކުރިއަށްދަނީ',
      buttonText: 'ހިންގާ ކޮމިޓީ ބައްލަވާ',
      buttonLink: '#team',
      textAlignment: 'left',
      overlayLevel: 40,
      displayOrder: 3,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const now = new Date();
  const pastOneHour = new Date(now.getTime() - 3600 * 1000).toISOString();
  const futureOneHour = new Date(now.getTime() + 3600 * 2000).toISOString();
  const futureTwoHours = new Date(now.getTime() + 3600 * 3000).toISOString();
  const futureThreeHours = new Date(now.getTime() + 3600 * 4000).toISOString();

  // Active quiz question
  const activeQuestionId = 'q_ramazan_01';
  const defaultQuestions: QuizQuestion[] = [
    {
      id: activeQuestionId,
      title: 'ރަމަޟާން ކުއިޒް 1447 - ދުވަސް 15',
      questionNumber: 15,
      questionText: 'ކީރިތި ޤުރުއާނުގެ ހިތުގެ ގޮތުގައި ނަންދެވިފައިވާ ސޫރަތަކީ ކޮބައި؟',
      questionImage: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=800&q=80',
      options: [
        { id: 'opt_15_a', questionId: activeQuestionId, optionLabel: 'ހ', optionText: 'ސޫރަތުލް ފާތިޙާ', displayOrder: 1 },
        { id: 'opt_15_b', questionId: activeQuestionId, optionLabel: 'ށ', optionText: 'ސޫރަތު ޔާސީން', displayOrder: 2 },
        { id: 'opt_15_c', questionId: activeQuestionId, optionLabel: 'ނ', optionText: 'ސޫރަތުލް ބަޤަރާ', displayOrder: 3 },
        { id: 'opt_15_d', questionId: activeQuestionId, optionLabel: 'ރ', optionText: 'ސޫރަތުލް މުލްކު', displayOrder: 4 }
      ],
      correctOptionId: 'opt_15_b',
      answerExplanation: 'ސޫރަތު ޔާސީން އަކީ ކީރިތި ޤުރުއާނުގެ 36 ވަނަ ސޫރަތެވެ. އިސްލާމީ ރިވާޔަތްތަކުގައި ސޫރަތު ޔާސީން އަށް ޤުރުއާނުގެ ހިތުގެ ނަމުން ނަންދެވިފައިވެއެވެ.',
      publishAt: pastOneHour,
      closeAt: futureOneHour,
      drawStartAt: futureOneHour,
      revealAt: futureTwoHours,
      rollingDurationSeconds: 12,
      winnerDisplayDurationSeconds: 30,
      prizeTitle: '1,500ރުފިޔާގެ ފައިސާގެ އިނާމު + ގިފްޓް ހެމްޕަރ',
      prizeDescription: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް އަދި ކޯރަލް ކޯސްޓް މާރޓްގެ ފަރާތުން',
      sponsorName: 'ކޯރަލް ކޯސްޓް މާރޓް',
      sponsorLogo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=200&q=80',
      status: 'open',
      displayOrder: 1,
      createdAt: pastOneHour,
      updatedAt: pastOneHour
    },
    {
      id: 'q_ramazan_14',
      title: 'ރަމަޟާން ކުއިޒް 1447 - ދުވަސް 14 (ނިމިފައި)',
      questionNumber: 14,
      questionText: 'ކީރިތި ޤުރުއާން އެންމެ ފުރަތަމަ ބާވައިލައްވަން ފެެއްޓެވީ ކޮން މަހެއްގައި؟',
      options: [
        { id: 'opt_14_a', questionId: 'q_ramazan_14', optionLabel: 'ހ', optionText: 'ރަޖަބު މަހު', displayOrder: 1 },
        { id: 'opt_14_b', questionId: 'q_ramazan_14', optionLabel: 'ށ', optionText: 'ޝަޢުބާން މަހު', displayOrder: 2 },
        { id: 'opt_14_c', questionId: 'q_ramazan_14', optionLabel: 'ނ', optionText: 'ރަމަޟާން މަހު', displayOrder: 3 },
        { id: 'opt_14_d', questionId: 'q_ramazan_14', optionLabel: 'ރ', optionText: 'ޝައްވާލު މަހު', displayOrder: 4 }
      ],
      correctOptionId: 'opt_14_c',
      answerExplanation: 'ކީރިތި ޤުރުއާން ބާވައިލެއްވީ ބަރަކާތްތެރި ރަމަޟާން މަހުގެ ليلة القدر ވިލޭރޭގައެވެ.',
      publishAt: new Date(now.getTime() - 86400 * 1000).toISOString(),
      closeAt: new Date(now.getTime() - 80000 * 1000).toISOString(),
      drawStartAt: new Date(now.getTime() - 75000 * 1000).toISOString(),
      revealAt: new Date(now.getTime() - 70000 * 1000).toISOString(),
      rollingDurationSeconds: 10,
      winnerDisplayDurationSeconds: 30,
      prizeTitle: '1,000ރުފިޔާގެ ފައިސާގެ ވައުޗަރ',
      prizeDescription: 'އައިލެންޑް ބްރީޒް ބޭކަރީގެ ފަރާތުން',
      sponsorName: 'އައިލެންޑް ބްރީޒް ބޭކަރީ',
      status: 'winner_announced',
      displayOrder: 2,
      createdAt: new Date(now.getTime() - 86400 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 70000 * 1000).toISOString()
    }
  ];

  // Sample Submissions for Day 15 active quiz
  const sampleSubmissions: QuizSubmission[] = Array.from({ length: 28 }).map((_, i) => {
    const num = i + 1;
    const pNum = `RQ-${num.toString().padStart(4, '0')}`;
    const idVal = `A${(250000 + i * 37).toString()}`;
    const phoneVal = `77${(10000 + i * 83).toString()}`;
    const isCorrect = i % 3 !== 0; // 2/3 are correct
    return {
      id: `sub_15_${num}`,
      questionId: activeQuestionId,
      participantNumber: pNum,
      normalizedIdNumber: idVal,
      contactNumber: phoneVal,
      maskedIdNumber: `${idVal.substring(0, 3)}***${idVal.slice(-2)}`,
      maskedContactNumber: `${phoneVal.substring(0, 2)}***${phoneVal.slice(-2)}`,
      selectedOptionId: isCorrect ? 'opt_15_b' : 'opt_15_a',
      isCorrect,
      isEligible: isCorrect,
      isInvalid: false,
      isDisqualified: false,
      submittedAt: new Date(now.getTime() - (28 - i) * 120000).toISOString(),
      updatedAt: new Date(now.getTime() - (28 - i) * 120000).toISOString(),
      selectedOptionLabel: isCorrect ? 'ށ' : 'ހ',
      selectedOptionText: isCorrect ? 'ސޫރަތު ޔާސީން' : 'ސޫރަތުލް ފާތިޙާ'
    };
  });

  // Previous winner for Day 14
  const sampleWinners: QuizWinner[] = [
    {
      id: 'win_14_01',
      questionId: 'q_ramazan_14',
      submissionId: 'sub_14_12',
      participantNumber: 'RQ-0012',
      maskedIdNumber: 'A28***41',
      maskedContactNumber: '79***11',
      fullName: 'ޢާއިޝަތު ނިއުމާ',
      contactNumber: '7984511',
      idNumber: 'A289141',
      prizeTitle: '1,000ރުފިޔާގެ ފައިސާގެ ވައުޗަރ',
      prizeDescription: 'އައިލެންޑް ބްރީޒް ބޭކަރީގެ ފަރާތުން',
      sponsorName: 'އައިލެންޑް ބްރީޒް ބޭކަރީ',
      eligibleCount: 42,
      selectedAt: new Date(now.getTime() - 70000 * 1000).toISOString(),
      selectedBy: 'system',
      selectionMethod: 'random',
      auditReference: 'AUD-DRAW-1447-14-992',
      contactedStatus: 'contacted',
      prizeCollectionStatus: 'collected',
      prizeCollectionDate: new Date(now.getTime() - 50000 * 1000).toISOString(),
      publicStatus: 'published',
      internalNotes: 'Prize delivered at ARC Club Headquarters.'
    }
  ];

  const defaultExcoMembers: ExcoMember[] = [
    {
      id: 'exco_01',
      fullName: 'ޙަސަން މުޙައްމަދު',
      designation: 'ރައީސް',
      idCardNumber: 'A100001',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      description: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބްގެ ހިންގުމާއި، ޒުވާނުންގެ ހަރަކާތްތައް އިސްވެ ބަލަހައްޓަވަނީ.',
      socialLink: 'https://facebook.com',
      displayOrder: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'exco_02',
      fullName: 'މަރްޔަމް ޝިފާ',
      designation: 'ނައިބު ރައީސް',
      idCardNumber: 'A100002',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
      description: 'އިޖުތިމާއީ ޕްރޮގްރާމްތަކާއި ސަގާފީ ހަރަކާތްތައް ރޭވުމުގައި އިސްކޮށް އުޅުއްވަނީ.',
      socialLink: 'https://instagram.com',
      displayOrder: 2,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'exco_03',
      fullName: 'އަޙްމަދު އިބްރާހީމް',
      designation: 'ޚަޒާންދާރު',
      idCardNumber: 'A100003',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      description: 'ކްލަބުގެ މާލީ ކަންކަމާއި ސުޕޮންސަރޝިޕް ކަންކަން ބަލަހައްޓަވަނީ.',
      displayOrder: 3,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'exco_04',
      fullName: 'ފާޠިމަތު ޒާހިޔާ',
      designation: 'ސެކްރެޓަރީ',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
      description: 'އިދާރީ ކަންކަމާއި ކްލަބުގެ މެންބަރުންގެ ރެކޯޑްތައް ބަލަހައްޓަވަނީ.',
      displayOrder: 4,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultContacts = [
    { id: 'cnt_01', type: 'email', label: 'އީމެއިލް އެޑްރެސް', value: 'info@arcclub.mv', displayOrder: 1, status: 'active' as const },
    { id: 'cnt_02', type: 'primary_phone', label: 'މައި ފޯނު ނަންބަރު', value: '+960 777 4321', displayOrder: 2, status: 'active' as const },
    { id: 'cnt_03', type: 'secondary_phone', label: 'އޮފީސް ފޯނު', value: '+960 330 1234', displayOrder: 3, status: 'active' as const },
    { id: 'cnt_04', type: 'whatsapp', label: 'ވައިބަރ / ވާޓްސްއެޕް', value: '+9607774321', displayOrder: 4, status: 'active' as const },
    { id: 'cnt_05', type: 'address', label: 'އޮފީސް އެޑްރެސް', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް، މަޖީދީމަގު، މާލެ، ދިވެހިރާއްޖެ', displayOrder: 5, status: 'active' as const },
    { id: 'cnt_06', type: 'working_hours', label: 'މަސައްކަތު ގަޑި', value: 'ހޮނިހިރު - ބުރާސްފަތި: 09:00 - 22:00', displayOrder: 6, status: 'active' as const }
  ];

  const defaultSocials: SocialLink[] = [
    { id: 'soc_01', platform: 'facebook', url: 'https://facebook.com/arcclub.official', displayOrder: 1, status: 'active', openInNewTab: true },
    { id: 'soc_02', platform: 'instagram', url: 'https://instagram.com/arcclub', displayOrder: 2, status: 'active', openInNewTab: true },
    { id: 'soc_03', platform: 'viber', url: 'https://viber.com/arcclub', displayOrder: 3, status: 'active', openInNewTab: true },
    { id: 'soc_04', platform: 'youtube', url: 'https://youtube.com/@arcclub', displayOrder: 4, status: 'active', openInNewTab: true }
  ];

  const defaultAuditLogs: AuditLog[] = [
    {
      id: 'aud_001',
      userId: adminId,
      username: 'admin',
      fullName: 'System Administrator',
      action: 'INITIALIZE_SYSTEM',
      module: 'system',
      recordId: 'system_root',
      newValue: { status: 'Database seeded with initial security parameters' },
      createdAt: new Date().toISOString()
    }
  ];

  const defaultPrizes: QuizPrize[] = [
    {
      id: 'prz_01',
      title: 'MVR 1,000 Cash Prize',
      description: 'First prize for daily question winner',
      sponsorName: 'Ooredoo Maldives',
      sponsorLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
      valueAmount: 'MVR 1,000',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prz_02',
      title: 'MVR 1,500 Cash & Gift Voucher',
      description: 'Special weekend question grand prize',
      sponsorName: 'Dhiraagu',
      sponsorLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
      valueAmount: 'MVR 1,500',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'prz_03',
      title: 'Smart Watch & MVR 500 Shopping Voucher',
      description: 'High-tech electronics prize bundle',
      sponsorName: 'Bank of Maldives',
      sponsorLogo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=120&q=80',
      valueAmount: 'MVR 2,000',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultSponsors: QuizSponsor[] = [
    {
      id: 'spn_01',
      name: 'Dhiraagu',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
      adText: 'Take your digital experience to the next level with Dhiraagu 5G & High-Speed Fibre Broadband!',
      specialProductImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
      websiteUrl: 'https://www.dhiraagu.com.mv',
      status: 'active',
      displayOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'spn_02',
      name: 'Ooredoo Maldives',
      logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
      adText: 'Upgrade your Ramazan with Ooredoo SuperNet & Win Mega Cash Prizes everyday!',
      specialProductImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=400&q=80',
      websiteUrl: 'https://www.ooredoo.mv',
      status: 'active',
      displayOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'spn_03',
      name: 'Bank of Maldives',
      logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=120&q=80',
      adText: 'BML Mobile Banking - Fast, Secure & Convenient banking anywhere in the Maldives.',
      specialProductImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=80',
      websiteUrl: 'https://www.bankofmaldives.com.mv',
      status: 'active',
      displayOrder: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultMembers: ClubMember[] = [
    { id: 'mem_01', memberNumber: 'ARC-M-001', fullName: 'Mohamed Ibrahim', idCardNumber: 'A100001', address: 'H. Sunrise, Henveiru, Male\'', phoneNumber: '+960 7771001', email: 'mohamed.ibrahim@arc.mv', memberType: 'exco', excoDesignation: 'President', status: 'active', joinedDate: '2022-01-10', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_02', memberNumber: 'ARC-M-002', fullName: 'Aisha Ali', idCardNumber: 'A100002', address: 'M. BlueSky, Maafannu, Male\'', phoneNumber: '+960 7771002', email: 'aisha.ali@arc.mv', memberType: 'exco', excoDesignation: 'Vice President', status: 'active', joinedDate: '2022-02-15', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_03', memberNumber: 'ARC-M-003', fullName: 'Ahmed Hassan', idCardNumber: 'A100003', address: 'Flat 402, Rehendhi Hiyaa, Hulhumale\'', phoneNumber: '+960 7771003', email: 'ahmed.hassan@arc.mv', memberType: 'exco', excoDesignation: 'Secretary', status: 'active', joinedDate: '2022-03-01', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_04', memberNumber: 'ARC-M-004', fullName: 'Mariyam Shareef', idCardNumber: 'A100004', address: 'G. GreenVilla, Galolhu, Male\'', phoneNumber: '+960 7771004', email: 'mariyam.s@arc.mv', memberType: 'exco', excoDesignation: 'Treasurer', status: 'active', joinedDate: '2022-04-12', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_05', memberNumber: 'ARC-M-005', fullName: 'Hussain Usman', idCardNumber: 'A100005', address: 'House 12, Villimale\'', phoneNumber: '+960 7771005', email: 'hussain.u@arc.mv', memberType: 'exco', excoDesignation: 'EXCO Member', status: 'active', joinedDate: '2022-05-20', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_06', memberNumber: 'ARC-M-006', fullName: 'Ibrahim Rasheed', idCardNumber: 'A100006', address: 'H. OceanView, Male\'', phoneNumber: '+960 7771006', email: 'ibrahim.r@gmail.com', memberType: 'standard', status: 'active', joinedDate: '2023-01-15', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_07', memberNumber: 'ARC-M-007', fullName: 'Aminath Zubaida', idCardNumber: 'A100007', address: 'Lot 10324, Hulhumale\' Phase 2', phoneNumber: '+960 7771007', email: 'aminath.z@outlook.com', memberType: 'standard', status: 'active', joinedDate: '2023-03-10', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_08', memberNumber: 'ARC-M-008', fullName: 'Hassan Zahir', idCardNumber: 'A100008', address: 'M. Orchid, Male\'', phoneNumber: '+960 7771008', email: 'hassan.zahir@gmail.com', memberType: 'standard', status: 'active', joinedDate: '2023-06-05', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_09', memberNumber: 'ARC-M-009', fullName: 'Fathimath Reema', idCardNumber: 'A100009', address: 'Ma. Daisy, Male\'', phoneNumber: '+960 7771009', email: 'reema.f@gmail.com', memberType: 'committee', status: 'active', joinedDate: '2023-09-01', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'mem_10', memberNumber: 'ARC-M-010', fullName: 'Yoosuf Niyaz', idCardNumber: 'A100010', address: 'G. Rose, Male\'', phoneNumber: '+960 7771010', email: 'yoosuf.n@gmail.com', memberType: 'standard', status: 'active', joinedDate: '2024-01-10', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];

  const defaultEventItems: EventItem[] = [
    {
      id: 'item_evt_01',
      title: 'ARC Sports Day & Family Carnival 2026',
      heldDate: '2026-03-10',
      startTime: '16:00',
      endTime: '22:00',
      venue: 'Male\' Ekuveni Sports Complex',
      summary: 'Annual sports day featuring track events, football tournament, and family carnival stalls for ARC members and families.',
      description: 'A full-day recreation event aimed at promoting sportsmanship and community bonding among members.',
      eventType: 'sports',
      status: 'completed',
      photoGallery: [
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80'
      ],
      attendance: [
        { memberId: 'mem_01', memberName: 'Mohamed Ibrahim', memberNumber: 'ARC-M-001', status: 'present' },
        { memberId: 'mem_02', memberName: 'Aisha Ali', memberNumber: 'ARC-M-002', status: 'present' },
        { memberId: 'mem_03', memberName: 'Ahmed Hassan', memberNumber: 'ARC-M-003', status: 'present' },
        { memberId: 'mem_04', memberName: 'Mariyam Shareef', memberNumber: 'ARC-M-004', status: 'present' },
        { memberId: 'mem_05', memberName: 'Hussain Usman', memberNumber: 'ARC-M-005', status: 'present' },
        { memberId: 'mem_06', memberName: 'Ibrahim Rasheed', memberNumber: 'ARC-M-006', status: 'present' },
        { memberId: 'mem_07', memberName: 'Aminath Zubaida', memberNumber: 'ARC-M-007', status: 'excused' },
        { memberId: 'mem_08', memberName: 'Hassan Zahir', memberNumber: 'ARC-M-008', status: 'present' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'item_evt_02',
      title: 'Hulhumale Community Beach Clean-up',
      heldDate: '2026-02-28',
      startTime: '07:00',
      endTime: '10:00',
      venue: 'Hulhumale Phase 1 Beach Area',
      summary: 'Environmental protection initiative led by ARC youth committee to keep local beach clean.',
      eventType: 'charity',
      status: 'completed',
      photoGallery: [
        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80'
      ],
      attendance: [
        { memberId: 'mem_01', memberName: 'Mohamed Ibrahim', memberNumber: 'ARC-M-001', status: 'present' },
        { memberId: 'mem_03', memberName: 'Ahmed Hassan', memberNumber: 'ARC-M-003', status: 'present' },
        { memberId: 'mem_06', memberName: 'Ibrahim Rasheed', memberNumber: 'ARC-M-006', status: 'present' },
        { memberId: 'mem_07', memberName: 'Aminath Zubaida', memberNumber: 'ARC-M-007', status: 'present' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultMeetingItems: MeetingItem[] = [
    {
      id: 'mtg_01',
      title: '1st EXCO Committee Meeting 2026',
      meetingType: 'exco',
      heldDate: '2026-01-15',
      startTime: '20:30',
      endTime: '22:00',
      venue: 'ARC Headquarters Meeting Room',
      summary: 'EXCO review of annual budget allocation, Ramazan Quiz 2026 roadmap, and committee appointments.',
      status: 'completed',
      attendance: [
        { memberId: 'mem_01', memberName: 'Mohamed Ibrahim', memberNumber: 'ARC-M-001', status: 'present' },
        { memberId: 'mem_02', memberName: 'Aisha Ali', memberNumber: 'ARC-M-002', status: 'present' },
        { memberId: 'mem_03', memberName: 'Ahmed Hassan', memberNumber: 'ARC-M-003', status: 'present' },
        { memberId: 'mem_04', memberName: 'Mariyam Shareef', memberNumber: 'ARC-M-004', status: 'present' },
        { memberId: 'mem_05', memberName: 'Hussain Usman', memberNumber: 'ARC-M-005', status: 'excused' }
      ],
      votings: [
        {
          id: 'vote_01',
          topic: 'Approval of Ramazan Quiz 2026 Budget & Grand Prizes',
          description: 'Resolution to approve MVR 50,000 for total quiz prizes and sponsor marketing.',
          status: 'finalized',
          votes: { inFavor: 4, against: 0, abstain: 0 },
          finalizedAction: 'Approved MVR 50,000 budget. Treasurer authorized to issue purchase orders.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'vote_02',
          topic: 'Establishment of Quiz Evaluation Panel',
          description: 'Motion to appoint 3-member independent panel for daily quiz verification.',
          status: 'finalized',
          votes: { inFavor: 4, against: 0, abstain: 0 },
          finalizedAction: 'Appointed Secretary Ahmed Hassan as Panel Chair with 2 assistants.',
          createdAt: new Date().toISOString()
        }
      ],
      finalizedActions: [
        'Approved MVR 50,000 budget. Treasurer authorized to issue purchase orders.',
        'Appointed Secretary Ahmed Hassan as Panel Chair with 2 assistants.'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'mtg_02',
      title: '2026 General Members Assembly',
      meetingType: 'general_members',
      heldDate: '2026-02-01',
      startTime: '20:00',
      endTime: '22:30',
      venue: 'Social Centre Seminar Hall',
      summary: 'Annual General Assembly for all club members to review 2025 performance report and vote on 2026 action plans.',
      status: 'completed',
      attendance: [
        { memberId: 'mem_01', memberName: 'Mohamed Ibrahim', memberNumber: 'ARC-M-001', status: 'present' },
        { memberId: 'mem_02', memberName: 'Aisha Ali', memberNumber: 'ARC-M-002', status: 'present' },
        { memberId: 'mem_03', memberName: 'Ahmed Hassan', memberNumber: 'ARC-M-003', status: 'present' },
        { memberId: 'mem_04', memberName: 'Mariyam Shareef', memberNumber: 'ARC-M-004', status: 'present' },
        { memberId: 'mem_05', memberName: 'Hussain Usman', memberNumber: 'ARC-M-005', status: 'present' },
        { memberId: 'mem_06', memberName: 'Ibrahim Rasheed', memberNumber: 'ARC-M-006', status: 'present' },
        { memberId: 'mem_07', memberName: 'Aminath Zubaida', memberNumber: 'ARC-M-007', status: 'present' },
        { memberId: 'mem_08', memberName: 'Hassan Zahir', memberNumber: 'ARC-M-008', status: 'present' },
        { memberId: 'mem_09', memberName: 'Fathimath Reema', memberNumber: 'ARC-M-009', status: 'present' },
        { memberId: 'mem_10', memberName: 'Yoosuf Niyaz', memberNumber: 'ARC-M-010', status: 'absent' }
      ],
      votings: [
        {
          id: 'vote_03',
          topic: 'Adoption of 2026 Annual Work Plan & Community Projects',
          description: 'Approval of planned events including Ramazan Quiz, Youth Football Cup, and Beach Clean-ups.',
          status: 'finalized',
          votes: { inFavor: 8, against: 1, abstain: 0 },
          finalizedAction: 'Adopted 2026 Annual Work Plan. Project teams assigned.',
          createdAt: new Date().toISOString()
        }
      ],
      finalizedActions: [
        'Adopted 2026 Annual Work Plan. Project teams assigned.'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  return {
    users: [defaultAdmin],
    roles: defaultRoles,
    slideshow: defaultSlideshow,
    settings: [
      { id: 'set_01', group: 'branding', key: 'clubName', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބް', updatedAt: new Date().toISOString() },
      { id: 'set_02', group: 'branding', key: 'clubAbbreviation', value: 'ARC', updatedAt: new Date().toISOString() },
      { id: 'set_03', group: 'branding', key: 'welcomeHeading', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބަށް މަރުޙަބާ!', updatedAt: new Date().toISOString() },
      { id: 'set_04', group: 'branding', key: 'welcomeMessage', value: 'އިޖުތިމާއީ ގުޅުން ބަދަހިކުރުމާއި، ޒުވާނުންނާއި ކުޅިވަރުގެ ކުރިއެރުމަށް މަސައްކަތްކުރާ ޖަމްޢިއްޔާއެއް.', updatedAt: new Date().toISOString() },
      { id: 'set_05', group: 'branding', key: 'aboutText', value: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބަކީ ރައްޔިތުންގެ މެދުގައި އެކުވެރިކަމާއި ކުޅިވަރާއި ދީނީ ރޫޙު އާލާކުރުމަށް އުފައްދާފައިވާ ޖަމްޢިއްޔާއެކެވެ.', updatedAt: new Date().toISOString() },
      { id: 'set_06', group: 'public_site', key: 'sectionOrder', value: ['slideshow', 'welcome', 'vision_mission', 'ramazan_quiz', 'exco_team', 'reach_us', 'social_links'], updatedAt: new Date().toISOString() },
      { id: 'set_07', group: 'public_site', key: 'sectionVisibility', value: { slideshow: true, welcome: true, vision_mission: true, ramazan_quiz: true, exco_team: true, reach_us: true, social_links: true }, updatedAt: new Date().toISOString() },
      { id: 'set_08', group: 'security', key: 'minPinLength', value: 4, updatedAt: new Date().toISOString() },
      { id: 'set_09', group: 'security', key: 'failedLoginLimit', value: 5, updatedAt: new Date().toISOString() },
      { id: 'set_10', group: 'security', key: 'lockoutMinutes', value: 15, updatedAt: new Date().toISOString() },
      { id: 'set_11', group: 'quiz', key: 'allowAnswerUpdate', value: false, updatedAt: new Date().toISOString() },
      { id: 'set_12', group: 'quiz', key: 'showParticipantTotals', value: true, updatedAt: new Date().toISOString() },
      { id: 'set_13', group: 'quiz', key: 'timezone', value: 'Indian/Maldives (GMT+5)', updatedAt: new Date().toISOString() }
    ],
    socialLinks: defaultSocials,
    contacts: defaultContacts,
    excoMembers: defaultExcoMembers,
    quizQuestions: defaultQuestions,
    quizSubmissions: sampleSubmissions,
    quizWinners: sampleWinners,
    prizes: defaultPrizes,
    sponsors: defaultSponsors,
    auditLogs: defaultAuditLogs,
    events: [
      {
        id: 'evt_01',
        title: 'އާނަންދާ ރަމަޟާން ކުއިޒް 2026 އިފްތިތާޙީ ޙަފްލާ',
        summary: 'މިއަހަރުގެ ރަމަޟާން މަހުގެ ޚާއްޞަ ސުވާލު މުބާރާތް އިފްތިތާޙު ކުރުމާއި، އިނާމުތައް އިޢުލާންކުރުމުގެ ރަސްމިއްޔާތު.',
        description: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުން އިންތިޒާމުކޮށްގެން ބާއްވާ ރަމަޟާން ކުއިޒް 2026 އިފްތިތާޙު ކުރުމުގެ ޚާއްޞަ ޙަފްލާ ބޭއްވިގެން ދިޔައީ ކްލަބް މަރުކަޒުގައެވެ. މި ހަފްލާގައި ކްލަބްގެ އިސްވެރިންނާއި، އިނާމު ސްޕޮންސަރުން ބައިވެރިވެވަޑައިގެންނެވިއެވެ.',
        eventDate: '2026-02-15',
        location: 'އާނަންދާ ކްލަބް މަރުކަޒު، މާލެ',
        coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
        photoAlbum: [
          'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'
        ],
        displayOrder: 1,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'evt_02',
        title: 'އާނަންދާ އިޖުތިމާއީ ޢާއިލީ ހަރަކާތް 2026',
        summary: 'ކްލަބް މެންބަރުންނާއި ޢާއިލާތަކަށް ޚާއްޞަކޮށްގެން ބޭއްވުނު އުފާވެރި އިޖުތިމާއީ ކުޅިވަރު ހަރަކާތް.',
        description: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ މެންބަރުންގެ މެދުގައި އެކުވެރިކަން އާލާކޮށް، ގުޅުން ބަދަހިކުރުމުގެ ގޮތުން ބޭއްވުނު އާއިލީ ހަރަކާތުގައި ގިނަ އަދަދެއްގެ މެންބަރުން ބައިވެރިވިއެވެ.',
        eventDate: '2026-01-20',
        location: 'ހުޅުމާލެ ސެންޓްރަލް ޕާކް',
        coverImage: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
        photoAlbum: [
          'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80'
        ],
        displayOrder: 2,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    sessions: [],
    ineligibleParticipantIds: [],
    members: defaultMembers,
    eventItems: defaultEventItems,
    meetingItems: defaultMeetingItems,
    clubRules: defaultClubRules
  };
}

class DatabaseStore {
  private data: DBData;

  constructor() {
    this.data = this.loadData();
    // Async background sync from Supabase on startup if Supabase has state
    this.initSupabaseSync();
  }

  private syncTimeout: NodeJS.Timeout | null = null;
  private isWritingToSupabase = false;

  private async initSupabaseSync() {
    try {
      if (pgPool) {
        await ensureTablesExist();
        const res = await pgPool.query("SELECT data FROM app_store WHERE id = 'store'");
        if (res && res.rows && res.rows.length > 0 && res.rows[0].data) {
          const cloudData = res.rows[0].data as Partial<DBData>;
          this.mergeCloudData(cloudData);
        } else {
          await this.flushToSupabase();
        }
      } else if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('app_store')
          .select('data')
          .eq('id', 'store')
          .maybeSingle();

        if (data && data.data) {
          this.mergeCloudData(data.data as Partial<DBData>);
        } else if (!error) {
          await this.flushToSupabase();
        }
      }
    } catch (err: any) {
      console.warn('Supabase sync notice: using persistent local database storage.', err?.message || err);
    }
  }

  private mergeCloudData(cloudData: Partial<DBData>) {
    if (!cloudData || !Array.isArray(cloudData.users) || cloudData.users.length === 0) return;

    const mergeById = <T extends { id: string }>(localArr: T[] = [], cloudArr: T[] = []): T[] => {
      const map = new Map<string, T>();
      for (const item of cloudArr) {
        if (item && item.id) map.set(item.id, item);
      }
      for (const item of localArr) {
        if (item && item.id) map.set(item.id, item);
      }
      return Array.from(map.values());
    };

    this.data = {
      ...this.data,
      ...cloudData,
      users: mergeById(this.data.users, cloudData.users),
      quizQuestions: mergeById(this.data.quizQuestions, cloudData.quizQuestions),
      quizSubmissions: mergeById(this.data.quizSubmissions, cloudData.quizSubmissions),
      quizWinners: mergeById(this.data.quizWinners, cloudData.quizWinners),
      prizes: mergeById(this.data.prizes || [], cloudData.prizes || []),
      sponsors: mergeById(this.data.sponsors || [], cloudData.sponsors || []),
      members: mergeById(this.data.members || [], cloudData.members || []),
      events: mergeById(this.data.events || [], cloudData.events || []),
      eventItems: mergeById(this.data.eventItems || [], cloudData.eventItems || []),
      meetingItems: mergeById(this.data.meetingItems || [], cloudData.meetingItems || []),
      excoMembers: mergeById(this.data.excoMembers || [], cloudData.excoMembers || []),
      contacts: mergeById(this.data.contacts || [], cloudData.contacts || []),
      socialLinks: mergeById(this.data.socialLinks || [], cloudData.socialLinks || []),
      slideshow: mergeById(this.data.slideshow || [], cloudData.slideshow || []),
      settings: mergeById(this.data.settings || [], cloudData.settings || []),
      auditLogs: mergeById(this.data.auditLogs || [], cloudData.auditLogs || []),
      messages: mergeById(this.data.messages || [], cloudData.messages || [])
    };
    this.saveLocalCache();
  }

  private loadData(): DBData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          if (!Array.isArray(parsed.sessions)) parsed.sessions = [];
          if (!Array.isArray(parsed.prizes) || parsed.prizes.length === 0) {
            parsed.prizes = getDefaultSeed().prizes;
          }
          if (!Array.isArray(parsed.sponsors) || parsed.sponsors.length === 0) {
            parsed.sponsors = getDefaultSeed().sponsors;
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading DB file, re-seeding:', err);
    }
    const seed = getDefaultSeed();
    this.saveLocalCache(seed);
    return seed;
  }

  private saveLocalCache(dataToSave?: DBData): void {
    if (dataToSave) {
      this.data = dataToSave;
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write persistent local DB file:', err);
    }
  }

  public saveData(dataToSave?: DBData): void {
    if (dataToSave) {
      this.data = dataToSave;
    }
    // Always persist to local disk instantly
    this.saveLocalCache();

    if (!supabaseClient && !pgPool) return;

    // Queue/Debounce Cloud Supabase sync so no edits are dropped
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.flushToSupabase();
    }, 1500);
  }

  private async flushToSupabase(): Promise<void> {
    if (this.isWritingToSupabase) return;
    this.isWritingToSupabase = true;

    try {
      if (pgPool) {
        await ensureTablesExist();
        await pgPool.query(
          `INSERT INTO app_store (id, data, updated_at) 
           VALUES ('store', $1, NOW()) 
           ON CONFLICT (id) 
           DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [JSON.stringify(this.data)]
        );
      } else if (supabaseClient) {
        await supabaseClient
          .from('app_store')
          .upsert({ id: 'store', data: this.data, updated_at: new Date().toISOString() });
      }
    } catch (err: any) {
      console.warn('Supabase write notice:', err?.message || err);
    } finally {
      this.isWritingToSupabase = false;
    }
  }

  public getData(): DBData {
    return this.data;
  }

  // Helper getters
  public getUsers() { return this.data.users; }
  public getRoles() { return this.data.roles; }
  public updateRole(id: string, updates: Partial<Role>): Role | null {
    const roles = this.getRoles();
    const idx = roles.findIndex(r => r.id === id);
    if (idx === -1) return null;
    roles[idx] = {
      ...roles[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData();
    return roles[idx];
  }
  public createRole(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Role {
    const roles = this.getRoles();
    const newRole: Role = {
      ...roleData,
      id: `role_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    roles.push(newRole);
    this.saveData();
    return newRole;
  }
  public getSlideshow() { return this.data.slideshow; }
  public getSettings() { return this.data.settings; }
  public getSocialLinks() { return this.data.socialLinks; }
  public getContacts() { return this.data.contacts; }
  public getExcoMembers() { return this.data.excoMembers; }
  public getQuizQuestions() { return this.data.quizQuestions; }
  public getQuizSubmissions() { return this.data.quizSubmissions; }
  public getQuizWinners() { return this.data.quizWinners; }
  public getPrizes() { return this.data.prizes || []; }
  public getSponsors() { return this.data.sponsors || []; }
  public getAuditLogs() { return this.data.auditLogs; }
  public getEvents(): ClubEvent[] { return this.data.events || []; }
  public getMessages(): InboxMessage[] {
    if (!this.data.messages || this.data.messages.length === 0) {
      this.data.messages = [
        {
          id: 'msg_public_01',
          senderName: 'Ahmed Zahir',
          contactInfo: '+960 7789012 / zahir.ahmed@gmail.com',
          subject: 'ކްލަބް މެންބަރަކަށް ވުމަށް އެދި (Membership Inquiry)',
          body: 'އައްސަލާމު އަލައިކުމް. އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ މެންބަރަކަށް ވުމަށް އެދޭ ފޯމު ނަގާނެ ގޮތާއި، މެންބަރޝިޕް ފީ ދައްކާނެ ގޮތުގެ ތަފްޞީލު ސާފުކޮށްލަން ބޭނުންވެއެވެ.',
          category: 'general',
          priority: 'high',
          status: 'resolved',
          readBy: ['admin_01'],
          actions: [
            {
              id: 'act_01',
              actionTaken: 'Replied via Email with Application Form',
              actionByUserId: 'usr_01',
              actionByName: 'Mohamed Ibrahim (President)',
              replyMethod: 'mail',
              replyDetails: 'Sent full membership guidelines, online application form link, and account details to zahir.ahmed@gmail.com.',
              createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
          id: 'msg_public_02',
          senderName: 'Hawwa Latheef',
          contactInfo: '+960 7912345',
          subject: 'ރަމަޟާން ކުއިޒް އިނާމު ހަވާލުކުރުން',
          body: 'ސަލާމް. ކުއިޒް #15 ގެ ނަސީބުވެރިޔާއަށް އިނާމު ހަވާލުކުރާނީ ކޮން ދުވަހަކު ކޮން ގަޑިއެއްގައިތޯ؟',
          category: 'quiz_alert',
          priority: 'normal',
          status: 'in_progress',
          readBy: ['admin_01'],
          actions: [
            {
              id: 'act_02',
              actionTaken: 'Phone Call Made',
              actionByUserId: 'usr_01',
              actionByName: 'Ahmed Hassan (Secretary)',
              replyMethod: 'call',
              replyDetails: 'Called Hawwa. Informed that the prize distribution ceremony will take place next Friday night at 20:30 at ARC Clubhouse.',
              createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
            }
          ],
          createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 'msg_public_03',
          senderName: 'Ali Rasheed',
          contactInfo: 'ali.rasheed@outlook.com',
          subject: 'އީވެންޓް ސްޕޮންސަރޝިޕް ފުރުޞަތު',
          body: 'ކްލަބުން ކުރިއަށްގެންދާ ކުޅިވަރު މުބާރާތްތަކަށް ސްޕޮންސަރ ދިނުމަށް ޝައުޤުވެރިވެއެވެ. ސްޕޮންސަރޝިޕް ޕެކޭޖްތަކުގެ މަޢުލޫމާތު ފޮނުވައިދެއްވުން އެދެމެވެ.',
          category: 'general',
          priority: 'urgent',
          status: 'pending',
          readBy: [],
          actions: [],
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ];
      this.saveData();
    }
    return this.data.messages;
  }

  public addMessageAction(
    messageId: string,
    actionData: {
      actionTaken: string;
      actionByUserId: string;
      actionByName: string;
      replyMethod: 'mail' | 'call' | 'message' | 'meeting' | 'other';
      replyDetails: string;
      status?: 'pending' | 'in_progress' | 'resolved' | 'archived';
    }
  ): InboxMessage | null {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    const newAction: MessageActionRecord = {
      id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actionTaken: actionData.actionTaken || 'Action Logged',
      actionByUserId: actionData.actionByUserId,
      actionByName: actionData.actionByName,
      replyMethod: actionData.replyMethod,
      replyDetails: actionData.replyDetails,
      createdAt: new Date().toISOString()
    };

    if (!messages[idx].actions) {
      messages[idx].actions = [];
    }

    messages[idx].actions.unshift(newAction);
    messages[idx].status = actionData.status || 'resolved';
    messages[idx].updatedAt = new Date().toISOString();

    this.saveData();
    return messages[idx];
  }

  public updateMessageStatus(
    messageId: string,
    status: 'pending' | 'in_progress' | 'resolved' | 'archived'
  ): InboxMessage | null {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return null;

    messages[idx].status = status;
    messages[idx].updatedAt = new Date().toISOString();

    this.saveData();
    return messages[idx];
  }

  public deleteMessage(id: string): boolean {
    const messages = this.getMessages();
    const idx = messages.findIndex(m => m.id === id);
    if (idx === -1) return false;
    messages.splice(idx, 1);
    this.saveData();
    return true;
  }
  public getNotifications(): AppNotification[] {
    if (!this.data.notifications) this.data.notifications = [];
    return this.data.notifications;
  }

  public createMessage(msgData: Omit<InboxMessage, 'id' | 'readBy' | 'archivedBy' | 'createdAt' | 'updatedAt'>): InboxMessage {
    if (!this.data.messages) this.data.messages = [];
    const newMsg: InboxMessage = {
      ...msgData,
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      readBy: [],
      archivedBy: [],
      status: msgData.status || 'pending',
      actions: msgData.actions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.messages.unshift(newMsg);
    this.saveData();
    return newMsg;
  }

  public createNotification(notifData: Omit<AppNotification, 'id' | 'readBy' | 'createdAt'>): AppNotification {
    if (!this.data.notifications) this.data.notifications = [];
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      readBy: [],
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(newNotif);
    this.saveData();
    return newNotif;
  }

  public createEvent(evtData: Omit<ClubEvent, 'id' | 'createdAt' | 'updatedAt'>): ClubEvent {
    if (!this.data.events) this.data.events = [];
    const newEvt: ClubEvent = {
      ...evtData,
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.events.push(newEvt);
    this.saveData();
    return newEvt;
  }

  public updateEvent(id: string, updates: Partial<ClubEvent>): ClubEvent | null {
    if (!this.data.events) this.data.events = [];
    const idx = this.data.events.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.data.events[idx] = {
      ...this.data.events[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData();
    return this.data.events[idx];
  }

  public deleteEvent(id: string): boolean {
    if (!this.data.events) this.data.events = [];
    const idx = this.data.events.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.data.events.splice(idx, 1);
    this.saveData();
    return true;
  }
  public getSessions() { return this.data.sessions || []; }
  public getIneligibleParticipantIds(): string[] {
    if (!Array.isArray(this.data.ineligibleParticipantIds)) {
      this.data.ineligibleParticipantIds = [];
    }
    return this.data.ineligibleParticipantIds;
  }
  public setIneligibleParticipantStatus(idNumber: string, isNotEligible: boolean): void {
    const normId = String(idNumber).trim().toUpperCase().replace(/\s+/g, '');
    if (!normId) return;
    const current = new Set(this.getIneligibleParticipantIds());
    if (isNotEligible) {
      current.add(normId);
    } else {
      current.delete(normId);
    }
    this.data.ineligibleParticipantIds = Array.from(current);
    this.saveData();
  }
  public saveSessions(sessions: Array<{ token: string; userId: string; expiresAt: number }>) {
    this.data.sessions = sessions;
    this.saveData();
  }

  // Log audit entry
  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.data.auditLogs.unshift(newLog);
    this.saveData();
    return newLog;
  }

  // --- MEMBERS METHODS ---
  public getMembers(): ClubMember[] {
    if (!Array.isArray(this.data.members)) this.data.members = [];
    return this.data.members;
  }
  public getMemberById(id: string): ClubMember | null {
    return this.getMembers().find(m => m.id === id) || null;
  }
  public createMember(memberData: Omit<ClubMember, 'id' | 'createdAt' | 'updatedAt'>): ClubMember {
    const members = this.getMembers();
    const newMember: ClubMember = {
      ...memberData,
      id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    members.unshift(newMember);
    this.saveData();
    return newMember;
  }
  public updateMember(id: string, updates: Partial<ClubMember>): ClubMember | null {
    const members = this.getMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) return null;
    members[idx] = {
      ...members[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData();
    return members[idx];
  }
  public deleteMember(id: string): boolean {
    const members = this.getMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) return false;
    members.splice(idx, 1);
    this.saveData();
    return true;
  }

  // --- EVENT ITEMS METHODS ---
  public getEventItems(): EventItem[] {
    if (!Array.isArray(this.data.eventItems)) this.data.eventItems = [];
    return this.data.eventItems;
  }
  public getEventItemById(id: string): EventItem | null {
    return this.getEventItems().find(e => e.id === id) || null;
  }
  public createEventItem(itemData: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'>): EventItem {
    const items = this.getEventItems();
    const newItem: EventItem = {
      ...itemData,
      id: `item_evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.unshift(newItem);
    this.saveData();
    return newItem;
  }
  public updateEventItem(id: string, updates: Partial<EventItem>): EventItem | null {
    const items = this.getEventItems();
    const idx = items.findIndex(e => e.id === id);
    if (idx === -1) return null;
    items[idx] = {
      ...items[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData();
    return items[idx];
  }
  public deleteEventItem(id: string): boolean {
    const items = this.getEventItems();
    const idx = items.findIndex(e => e.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    this.saveData();
    return true;
  }

  // --- MEETING ITEMS METHODS ---
  public getMeetingItems(): MeetingItem[] {
    if (!Array.isArray(this.data.meetingItems)) this.data.meetingItems = [];
    return this.data.meetingItems;
  }
  public getMeetingItemById(id: string): MeetingItem | null {
    return this.getMeetingItems().find(m => m.id === id) || null;
  }
  public createMeetingItem(itemData: Omit<MeetingItem, 'id' | 'createdAt' | 'updatedAt'>): MeetingItem {
    const items = this.getMeetingItems();
    const newItem: MeetingItem = {
      ...itemData,
      id: `mtg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.unshift(newItem);
    this.saveData();
    return newItem;
  }
  public updateMeetingItem(id: string, updates: Partial<MeetingItem>): MeetingItem | null {
    const items = this.getMeetingItems();
    const idx = items.findIndex(m => m.id === id);
    if (idx === -1) return null;
    items[idx] = {
      ...items[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData();
    return items[idx];
  }
  public deleteMeetingItem(id: string): boolean {
    const items = this.getMeetingItems();
    const idx = items.findIndex(m => m.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    this.saveData();
    return true;
  }

  // --- CLUB RULES METHODS ---
  public getClubRules(): ClubRulesData {
    if (!this.data.clubRules || !Array.isArray(this.data.clubRules.chapters)) {
      this.data.clubRules = defaultClubRules;
    }
    return this.data.clubRules;
  }

  public updateClubRules(updates: Partial<ClubRulesData>, updatedByName?: string): ClubRulesData {
    const current = this.getClubRules();
    this.data.clubRules = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      ...(updatedByName ? { updatedByName } : {})
    };
    this.saveData();
    return this.data.clubRules;
  }
}

export const db = new DatabaseStore();
