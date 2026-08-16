/**
 * ARC Club API Client Service
 */

const TOKEN_KEY = 'arc_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401) {
    removeStoredToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected server error occurred.');
  }

  return data as T;
}

export const api = {
  // Public APIs
  getSystemTime: () => request<{ ok: boolean; serverTimeIso: string; serverEpoch: number; timezone: string }>('/api/public/time'),
  getPublicSiteData: () => request<any>('/api/public/site'),
  submitPublicContactMessage: (data: { fullName: string; contactInfo?: string; subject?: string; message: string }) =>
    request<any>('/api/public/contact-messages', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentQuiz: () => request<any>('/api/public/quiz/current'),
  submitQuiz: (body: any) => request<any>('/api/public/quiz/submit', { method: 'POST', body: JSON.stringify(body) }),
  getQuizResultsHistory: () => request<any>('/api/public/quiz/results'),
  getEligibleNumbers: (questionId: string) => request<any>(`/api/public/quiz/eligible-numbers/${questionId}`),

  // Auth APIs
  login: (credentials: { username: string; pin: string }) => request<any>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request<any>('/api/auth/me'),
  changePin: (body: { currentPin: string; newPin: string; confirmPin: string }) => request<any>('/api/auth/change-pin', { method: 'POST', body: JSON.stringify(body) }),
  updateProfile: (data: { fullName?: string; contactNumber?: string; designation?: string; profileImage?: string; notes?: string }) => request<any>('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  logout: () => request<any>('/api/auth/logout', { method: 'POST' }),

  // Portal APIs
  getDashboardStats: () => request<any>('/api/portal/dashboard/stats'),
  getSlideshow: () => request<any>('/api/portal/slideshow'),
  createSlide: (slide: any) => request<any>('/api/portal/slideshow', { method: 'POST', body: JSON.stringify(slide) }),
  updateSlide: (id: string, slide: any) => request<any>(`/api/portal/slideshow/${id}`, { method: 'PUT', body: JSON.stringify(slide) }),
  deleteSlide: (id: string) => request<any>(`/api/portal/slideshow/${id}`, { method: 'DELETE' }),

  getContentSettings: () => request<any>('/api/portal/content'),
  updateContentSettings: (settings: any[]) => request<any>('/api/portal/content', { method: 'PUT', body: JSON.stringify({ settings }) }),

  getContacts: () => request<any>('/api/portal/contacts'),
  createContact: (data: any) => request<any>('/api/portal/contacts', { method: 'POST', body: JSON.stringify(data) }),
  updateContact: (id: string, data: any) => request<any>(`/api/portal/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id: string) => request<any>(`/api/portal/contacts/${id}`, { method: 'DELETE' }),

  getSocialLinks: () => request<any>('/api/portal/social-media'),
  createSocialLink: (data: any) => request<any>('/api/portal/social-media', { method: 'POST', body: JSON.stringify(data) }),
  updateSocialLink: (id: string, data: any) => request<any>(`/api/portal/social-media/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSocialLink: (id: string) => request<any>(`/api/portal/social-media/${id}`, { method: 'DELETE' }),

  getExcoMembers: () => request<any>('/api/portal/exco-team'),
  createExcoMember: (member: any) => request<any>('/api/portal/exco-team', { method: 'POST', body: JSON.stringify(member) }),
  updateExcoMember: (id: string, member: any) => request<any>(`/api/portal/exco-team/${id}`, { method: 'PUT', body: JSON.stringify(member) }),
  deleteExcoMember: (id: string) => request<any>(`/api/portal/exco-team/${id}`, { method: 'DELETE' }),

  getEvents: () => request<any>('/api/portal/events'),
  createEvent: (data: any) => request<any>('/api/portal/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) => request<any>(`/api/portal/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => request<any>(`/api/portal/events/${id}`, { method: 'DELETE' }),

  getQuizQuestions: () => request<any>('/api/portal/ramazan-quiz'),
  createQuizQuestion: (question: any) => request<any>('/api/portal/ramazan-quiz', { method: 'POST', body: JSON.stringify(question) }),
  updateQuizQuestion: (id: string, question: any) => request<any>(`/api/portal/ramazan-quiz/${id}`, { method: 'PUT', body: JSON.stringify(question) }),
  deleteQuizQuestion: (id: string) => request<any>(`/api/portal/ramazan-quiz/${id}`, { method: 'DELETE' }),
  updateQuizStatus: (id: string, state: string) => request<any>(`/api/portal/ramazan-quiz/${id}/status`, { method: 'POST', body: JSON.stringify({ state }) }),
  triggerLuckyDraw: (id: string) => request<any>(`/api/portal/ramazan-quiz/${id}/draw`, { method: 'POST' }),

  getPrizes: () => request<any>('/api/portal/quiz-prizes'),
  createPrize: (data: any) => request<any>('/api/portal/quiz-prizes', { method: 'POST', body: JSON.stringify(data) }),
  updatePrize: (id: string, data: any) => request<any>(`/api/portal/quiz-prizes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePrize: (id: string) => request<any>(`/api/portal/quiz-prizes/${id}`, { method: 'DELETE' }),

  getSponsors: () => request<any>('/api/portal/quiz-sponsors'),
  createSponsor: (data: any) => request<any>('/api/portal/quiz-sponsors', { method: 'POST', body: JSON.stringify(data) }),
  updateSponsor: (id: string, data: any) => request<any>(`/api/portal/quiz-sponsors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSponsor: (id: string) => request<any>(`/api/portal/quiz-sponsors/${id}`, { method: 'DELETE' }),

  getParticipants: (params?: any) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any>(`/api/portal/quiz-participants${query ? `?${query}` : ''}`);
  },
  getQuizParticipants: (params?: any) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any>(`/api/portal/quiz-participants${query ? `?${query}` : ''}`);
  },
  disqualifyParticipant: (id: string, isDisqualified: boolean, reason: string) => 
    request<any>(`/api/portal/quiz-participants/${id}/disqualify`, { method: 'POST', body: JSON.stringify({ isDisqualified, reason }) }),

  getMasterParticipants: (params?: any) => {
    const query = new URLSearchParams(params || {}).toString();
    return request<any>(`/api/portal/master-participants${query ? `?${query}` : ''}`);
  },
  toggleMasterParticipantEligibility: (idNumber: string, isNotEligible: boolean, reason?: string) =>
    request<any>('/api/portal/master-participants/toggle-eligibility', { method: 'POST', body: JSON.stringify({ idNumber, isNotEligible, reason }) }),

  exportParticipantsCSV: async (questionId?: string): Promise<string> => {
    const token = getStoredToken();
    const query = questionId ? `?questionId=${questionId}` : '';
    const res = await fetch(`/api/portal/quiz-participants/export/csv${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to export CSV report');
    return res.text();
  },

  getWinners: () => request<any>('/api/portal/quiz-winners'),
  getQuizWinners: () => request<any>('/api/portal/quiz-winners'),
  updateWinner: (id: string, data: any) => request<any>(`/api/portal/quiz-winners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateWinnerStatus: (id: string, data: any) => request<any>(`/api/portal/quiz-winners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reselectWinner: (id: string, reason: string) => request<any>(`/api/portal/quiz-winners/${id}/reselect`, { method: 'POST', body: JSON.stringify({ reason }) }),

  getUsers: () => request<any>('/api/portal/users'),
  getUserPerformance: (userId: string) => request<any>(`/api/portal/users/${userId}/performance`),
  connectMember: (data: { query?: string; memberId?: string }) => request<any>('/api/portal/users/connect-member', { method: 'POST', body: JSON.stringify(data) }),
  disconnectMember: () => request<any>('/api/portal/users/disconnect-member', { method: 'POST' }),
  createUser: (user: any) => request<any>('/api/portal/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id: string, user: any) => request<any>(`/api/portal/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }),
  updateUserStatus: (id: string, data: any) => request<any>(`/api/portal/users/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  resetUserPin: (id: string, newPin: string) => request<any>(`/api/portal/users/${id}/reset-pin`, { method: 'POST', body: JSON.stringify({ newPin }) }),
  deleteUser: (id: string) => request<any>(`/api/portal/users/${id}`, { method: 'DELETE' }),

  getRoles: () => request<any>('/api/portal/roles'),
  createRole: (role: any) => request<any>('/api/portal/roles', { method: 'POST', body: JSON.stringify(role) }),
  updateRole: (id: string, role: any) => request<any>(`/api/portal/roles/${id}`, { method: 'PUT', body: JSON.stringify(role) }),
  syncDb: () => request<any>('/api/portal/sync-db', { method: 'POST' }),
  getDbTables: () => request<any>('/api/portal/db/tables'),
  exportDbBackup: async (): Promise<Blob> => {
    const token = getStoredToken();
    const res = await fetch('/api/portal/db/export', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Failed to download database backup snapshot.');
    return res.blob();
  },
  importDbSnapshot: (data: any) => request<any>('/api/portal/db/import', { method: 'POST', body: JSON.stringify({ data }) }),
  getAuditLogs: (params?: { search?: string; moduleKey?: string; module?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/api/portal/audit-logs${query ? `?${query}` : ''}`);
  },

  // Message Inbox & Notification API
  getMessages: () => request<{ inbox: any[]; messages?: any[]; sent?: any[]; unreadCount: number }>('/api/portal/messages'),
  recordMessageAction: (id: string, data: { actionTaken?: string; replyMethod: string; replyDetails: string; status?: string }) =>
    request<any>(`/api/portal/messages/${id}/action`, { method: 'POST', body: JSON.stringify(data) }),
  updateMessageStatus: (id: string, status: string) =>
    request<any>(`/api/portal/messages/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  sendMessage: (data: {
    recipientType?: 'all' | 'user' | 'role';
    recipientId?: string;
    recipientName?: string;
    subject: string;
    body: string;
    category?: string;
    priority?: string;
    replyToId?: string;
  }) => request<any>('/api/portal/messages', { method: 'POST', body: JSON.stringify(data) }),
  markMessageRead: (id: string) => request<any>(`/api/portal/messages/${id}/read`, { method: 'PUT' }),
  deleteMessage: (id: string) => request<any>(`/api/portal/messages/${id}`, { method: 'DELETE' }),

  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/api/portal/notifications'),
  markAllNotificationsRead: () => request<any>('/api/portal/notifications/mark-all-read', { method: 'PUT' }),
  markNotificationRead: (id: string) => request<any>(`/api/portal/notifications/${id}/read`, { method: 'PUT' }),
  broadcastNotification: (data: {
    title: string;
    message: string;
    type?: string;
    link?: string;
    sendAsMessage?: boolean;
  }) => request<any>('/api/portal/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),

  // --- Members API ---
  getMembers: (params?: { search?: string; memberType?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/api/portal/members${query ? `?${query}` : ''}`);
  },
  createMember: (data: any) => request<any>('/api/portal/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: any) => request<any>(`/api/portal/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string) => request<any>(`/api/portal/members/${id}`, { method: 'DELETE' }),

  // --- Events & Meetings API ---
  getEventItems: (params?: { search?: string; status?: string; eventType?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/api/portal/event-items${query ? `?${query}` : ''}`);
  },
  createEventItem: (data: any) => request<any>('/api/portal/event-items', { method: 'POST', body: JSON.stringify(data) }),
  updateEventItem: (id: string, data: any) => request<any>(`/api/portal/event-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEventItem: (id: string) => request<any>(`/api/portal/event-items/${id}`, { method: 'DELETE' }),
  saveEventAttendance: (id: string, attendance: any[]) => request<any>(`/api/portal/event-items/${id}/attendance`, { method: 'POST', body: JSON.stringify({ attendance }) }),

  getMeetingItems: (params?: { search?: string; status?: string; meetingType?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/api/portal/meeting-items${query ? `?${query}` : ''}`);
  },
  createMeetingItem: (data: any) => request<any>('/api/portal/meeting-items', { method: 'POST', body: JSON.stringify(data) }),
  updateMeetingItem: (id: string, data: any) => request<any>(`/api/portal/meeting-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMeetingItem: (id: string) => request<any>(`/api/portal/meeting-items/${id}`, { method: 'DELETE' }),
  saveMeetingAttendance: (id: string, attendance: any[]) => request<any>(`/api/portal/meeting-items/${id}/attendance`, { method: 'POST', body: JSON.stringify({ attendance }) }),
  addMeetingVoting: (id: string, data: any) => request<any>(`/api/portal/meeting-items/${id}/votings`, { method: 'POST', body: JSON.stringify(data) }),
  updateMeetingVoting: (id: string, votingId: string, data: any) => request<any>(`/api/portal/meeting-items/${id}/votings/${votingId}`, { method: 'PUT', body: JSON.stringify(data) }),

  getEventsMeetingsStats: () => request<any>('/api/portal/events-meetings/stats'),

  // --- Club Rules & Regulations API ---
  getClubRules: () => request<any>('/api/portal/club-rules'),
  updateClubRules: (data: any) => request<any>('/api/portal/club-rules', { method: 'PUT', body: JSON.stringify(data) }),

  // --- Budget Module API ---
  getBudgetStats: (year?: number) => {
    const query = year ? `?year=${year}` : '';
    return request<any>(`/api/portal/budget/stats${query}`);
  },
  getBankAccounts: () => request<any[]>('/api/portal/budget/accounts'),
  createBankAccount: (data: any) => request<any>('/api/portal/budget/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateBankAccount: (id: string, data: any) => request<any>(`/api/portal/budget/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBankAccount: (id: string) => request<any>(`/api/portal/budget/accounts/${id}`, { method: 'DELETE' }),
  transferAccountFunds: (data: any) => request<any>('/api/portal/budget/transfers', { method: 'POST', body: JSON.stringify(data) }),
  getAccountTransfers: () => request<any[]>('/api/portal/budget/transfers'),

  getIncomeRecords: (params?: { category?: string; accountId?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/api/portal/budget/income${query ? `?${query}` : ''}`);
  },
  createIncomeRecord: (data: any) => request<any>('/api/portal/budget/income', { method: 'POST', body: JSON.stringify(data) }),
  updateIncomeRecord: (id: string, data: any) => request<any>(`/api/portal/budget/income/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIncomeRecord: (id: string) => request<any>(`/api/portal/budget/income/${id}`, { method: 'DELETE' }),

  getExpenseRecords: (params?: { category?: string; accountId?: string; status?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/api/portal/budget/expenses${query ? `?${query}` : ''}`);
  },
  createExpenseRecord: (data: any) => request<any>('/api/portal/budget/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpenseRecord: (id: string, data: any) => request<any>(`/api/portal/budget/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpenseRecord: (id: string) => request<any>(`/api/portal/budget/expenses/${id}`, { method: 'DELETE' }),

  getContributionSettings: () => request<any>('/api/portal/budget/contributions/settings'),
  updateContributionSettings: (data: any) => request<any>('/api/portal/budget/contributions/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getMemberContributions: (params?: { year?: number; month?: number; memberId?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<any[]>(`/api/portal/budget/contributions${query ? `?${query}` : ''}`);
  },
  processContributionPayment: (data: any) => request<any>('/api/portal/budget/contributions/pay', { method: 'POST', body: JSON.stringify(data) }),

  getBudgetAllocations: (year?: number) => {
    const query = year ? `?year=${year}` : '';
    return request<any[]>(`/api/portal/budget/allocations${query}`);
  },
  saveBudgetAllocation: (data: any) => request<any>('/api/portal/budget/allocations', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudgetAllocation: (id: string) => request<any>(`/api/portal/budget/allocations/${id}`, { method: 'DELETE' }),

  // --- Executive Roles & Directives API ---
  getPresidentialDirectives: () => request<any[]>('/api/portal/executive/directives'),
  createPresidentialDirective: (data: any) => request<any>('/api/portal/executive/directives', { method: 'POST', body: JSON.stringify(data) }),
  updatePresidentialDirective: (id: string, data: any) => request<any>(`/api/portal/executive/directives/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePresidentialDirective: (id: string) => request<any>(`/api/portal/executive/directives/${id}`, { method: 'DELETE' }),

  getOfficialCirculars: () => request<any[]>('/api/portal/executive/circulars'),
  createOfficialCircular: (data: any) => request<any>('/api/portal/executive/circulars', { method: 'POST', body: JSON.stringify(data) }),
  updateOfficialCircular: (id: string, data: any) => request<any>(`/api/portal/executive/circulars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOfficialCircular: (id: string) => request<any>(`/api/portal/executive/circulars/${id}`, { method: 'DELETE' })
};
