import { Request, Response } from 'express';
import EventEmitter from 'events';

export interface RealtimeTableEvent {
  table: string;
  action: 'create' | 'update' | 'delete' | 'sync' | 'bulk_update';
  id?: string;
  data?: any;
  timestamp: number;
  actorId?: string;
  actorName?: string;
}

class RealtimeBroadcaster extends EventEmitter {
  private clients: Set<{ id: string; res: Response; userId?: string }> = new Set();
  private eventHistory: RealtimeTableEvent[] = [];
  private readonly MAX_HISTORY = 50;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private tableVersions: Record<string, number> = {};

  constructor() {
    super();
    this.setMaxListeners(200);
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 15000);
  }

  private sendHeartbeat() {
    const payload = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now(), clientCount: this.clients.size })}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.removeClient(client);
      }
    }
  }

  public addClient(req: Request, res: Response, userId?: string) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientObj = { id: clientId, res, userId };
    this.clients.add(clientObj);

    console.log(`[Realtime SSE] Client connected: ${clientId}. Total active clients: ${this.clients.size}`);

    // Send initial connection packet
    const initPayload = {
      type: 'connected',
      clientId,
      serverTime: Date.now(),
      clientCount: this.clients.size,
      tableVersions: this.tableVersions
    };
    res.write(`event: connected\ndata: ${JSON.stringify(initPayload)}\n\n`);

    // Clean up on disconnect
    req.on('close', () => {
      this.removeClient(clientObj);
    });

    req.on('error', () => {
      this.removeClient(clientObj);
    });
  }

  private removeClient(client: { id: string; res: Response }) {
    if (this.clients.has(client)) {
      this.clients.delete(client);
      console.log(`[Realtime SSE] Client disconnected: ${client.id}. Remaining: ${this.clients.size}`);
    }
  }

  // Normalize table names to handle plural, snake_case, camelCase aliases
  private getTableAliases(rawTable: string): string[] {
    const norm = rawTable.toLowerCase().replace(/[-_]/g, '');
    const map: Record<string, string[]> = {
      member: ['members', 'member', 'dashboard'],
      members: ['members', 'member', 'dashboard'],
      clubmember: ['members', 'member', 'dashboard'],
      clubmembers: ['members', 'member', 'dashboard'],

      user: ['users', 'user', 'roles', 'permissions', 'dashboard'],
      users: ['users', 'user', 'roles', 'permissions', 'dashboard'],
      role: ['roles', 'role', 'users', 'permissions'],
      roles: ['roles', 'role', 'users', 'permissions'],

      sitesetting: ['site_settings', 'settings', 'content', 'branding', 'public_site', 'dashboard'],
      sitesettings: ['site_settings', 'settings', 'content', 'branding', 'public_site', 'dashboard'],
      settings: ['site_settings', 'settings', 'content', 'branding', 'public_site', 'dashboard'],
      content: ['content', 'slideshow', 'contacts', 'social_links', 'exco_members', 'site_settings', 'public_site'],
      branding: ['branding', 'site_settings', 'settings', 'public_site'],

      slideshow: ['slideshow', 'content', 'public_site'],
      slideshowitem: ['slideshow', 'content', 'public_site'],
      contact: ['contacts', 'contact', 'content', 'public_site'],
      contacts: ['contacts', 'contact', 'content', 'public_site'],
      sociallink: ['social_links', 'social_media', 'content', 'public_site'],
      sociallinks: ['social_links', 'social_media', 'content', 'public_site'],
      socialmedia: ['social_links', 'social_media', 'content', 'public_site'],
      excomember: ['exco_members', 'exco_team', 'content', 'public_site', 'members'],
      excomembers: ['exco_members', 'exco_team', 'content', 'public_site', 'members'],
      excoteam: ['exco_members', 'exco_team', 'content', 'public_site', 'members'],

      event: ['events', 'event', 'event_items', 'events_meetings', 'public_site', 'dashboard'],
      events: ['events', 'event', 'event_items', 'events_meetings', 'public_site', 'dashboard'],
      clubevent: ['events', 'event', 'event_items', 'events_meetings', 'public_site', 'dashboard'],
      eventitem: ['event_items', 'events', 'events_meetings', 'dashboard'],
      eventitems: ['event_items', 'events', 'events_meetings', 'dashboard'],
      meetingitem: ['meeting_items', 'meetings', 'events_meetings', 'dashboard'],
      meetingitems: ['meeting_items', 'meetings', 'events_meetings', 'dashboard'],
      eventsmeetings: ['events_meetings', 'events', 'event_items', 'meeting_items', 'dashboard'],

      quizquestion: ['quiz_questions', 'quiz', 'ramazan_quiz', 'public_quiz', 'dashboard'],
      quizquestions: ['quiz_questions', 'quiz', 'ramazan_quiz', 'public_quiz', 'dashboard'],
      quiz: ['quiz_questions', 'quiz_submissions', 'quiz_winners', 'quiz_prizes', 'quiz_sponsors', 'ramazan_quiz', 'public_quiz', 'dashboard'],
      ramazanquiz: ['quiz_questions', 'quiz_submissions', 'quiz_winners', 'quiz_prizes', 'quiz_sponsors', 'ramazan_quiz', 'public_quiz', 'dashboard'],
      quizsubmission: ['quiz_submissions', 'quiz_participants', 'quiz', 'ramazan_quiz', 'dashboard'],
      quizsubmissions: ['quiz_submissions', 'quiz_participants', 'quiz', 'ramazan_quiz', 'dashboard'],
      quizparticipants: ['quiz_submissions', 'quiz_participants', 'quiz', 'ramazan_quiz', 'dashboard'],
      quizwinner: ['quiz_winners', 'quiz', 'ramazan_quiz', 'public_quiz', 'dashboard'],
      quizwinners: ['quiz_winners', 'quiz', 'ramazan_quiz', 'public_quiz', 'dashboard'],
      quizprize: ['quiz_prizes', 'quiz', 'ramazan_quiz', 'public_quiz'],
      quizprizes: ['quiz_prizes', 'quiz', 'ramazan_quiz', 'public_quiz'],
      quizsponsor: ['quiz_sponsors', 'quiz', 'ramazan_quiz', 'public_quiz'],
      quizsponsors: ['quiz_sponsors', 'quiz', 'ramazan_quiz', 'public_quiz'],
      ineligibleparticipant: ['ineligible_participants', 'master_participants', 'quiz_participants', 'ramazan_quiz'],
      ineligibleparticipants: ['ineligible_participants', 'master_participants', 'quiz_participants', 'ramazan_quiz'],
      masterparticipants: ['ineligible_participants', 'master_participants', 'quiz_participants', 'ramazan_quiz'],

      bankaccount: ['bank_accounts', 'budget', 'dashboard'],
      bankaccounts: ['bank_accounts', 'budget', 'dashboard'],
      income: ['incomes', 'budget', 'dashboard'],
      incomes: ['incomes', 'budget', 'dashboard'],
      incomerecord: ['incomes', 'budget', 'dashboard'],
      expense: ['expenses', 'budget', 'dashboard'],
      expenses: ['expenses', 'budget', 'dashboard'],
      expenserecord: ['expenses', 'budget', 'dashboard'],
      accounttransfer: ['transfers', 'budget', 'dashboard'],
      accounttransfers: ['transfers', 'budget', 'dashboard'],
      transfer: ['transfers', 'budget', 'dashboard'],
      transfers: ['transfers', 'budget', 'dashboard'],
      membercontribution: ['contributions', 'fund_manager', 'budget', 'members'],
      membercontributions: ['contributions', 'fund_manager', 'budget', 'members'],
      contributions: ['contributions', 'fund_manager', 'budget', 'members'],
      contributionsetting: ['contribution_settings', 'fund_manager', 'budget'],
      contributionsettings: ['contribution_settings', 'fund_manager', 'budget'],
      categorybudgetallocation: ['budget_allocations', 'budget', 'dashboard'],
      budgetallocations: ['budget_allocations', 'budget', 'dashboard'],
      budget: ['budget', 'bank_accounts', 'incomes', 'expenses', 'transfers', 'contributions', 'budget_allocations', 'invoices', 'dashboard'],
      invoice: ['invoices', 'budget', 'dashboard'],
      invoices: ['invoices', 'budget', 'dashboard'],

      inboxmessage: ['messages', 'inbox', 'dashboard'],
      inboxmessages: ['messages', 'inbox', 'dashboard'],
      message: ['messages', 'inbox', 'dashboard'],
      messages: ['messages', 'inbox', 'dashboard'],
      inbox: ['messages', 'inbox', 'dashboard'],
      contactmessage: ['messages', 'inbox', 'dashboard'],
      contactmessages: ['messages', 'inbox', 'dashboard'],

      notification: ['notifications', 'dashboard'],
      notifications: ['notifications', 'dashboard'],
      appnotification: ['notifications', 'dashboard'],

      auditlog: ['audit_logs', 'dashboard'],
      auditlogs: ['audit_logs', 'dashboard'],

      clubrules: ['club_rules', 'rules', 'dashboard'],
      clubrulesdata: ['club_rules', 'rules', 'dashboard'],

      presidentialdirective: ['directives', 'dashboard'],
      presidentialdirectives: ['directives', 'dashboard'],
      officialcircular: ['circulars', 'dashboard'],
      officialcirculars: ['circulars', 'dashboard']
    };

    return map[norm] || [rawTable];
  }

  public broadcastTableChange(
    table: string,
    action: RealtimeTableEvent['action'],
    id?: string,
    data?: any,
    actor?: { id?: string; name?: string }
  ) {
    const timestamp = Date.now();
    const event: RealtimeTableEvent = {
      table,
      action,
      id,
      data,
      timestamp,
      actorId: actor?.id,
      actorName: actor?.name
    };

    // Update version tracking
    this.tableVersions[table] = (this.tableVersions[table] || 0) + 1;
    const aliases = this.getTableAliases(table);
    for (const a of aliases) {
      this.tableVersions[a] = (this.tableVersions[a] || 0) + 1;
    }

    // Keep bounded history
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.pop();
    }

    // Emit internally
    this.emit('table_change', event);
    for (const alias of aliases) {
      this.emit(`table:${alias}`, event);
    }

    // Broadcast to SSE clients
    const payload = `event: table_change\ndata: ${JSON.stringify({ ...event, aliases, version: this.tableVersions[table] })}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.removeClient(client);
      }
    }

    console.log(`[Realtime Sync] Broadcasted "${table}:${action}" (id: ${id || 'N/A'}) to ${this.clients.size} connected clients.`);
  }

  public broadcast(
    table: string,
    action: RealtimeTableEvent['action'],
    dataOrId?: any,
    actor?: { id?: string; name?: string }
  ) {
    const id = typeof dataOrId === 'string' ? dataOrId : dataOrId?.id;
    const data = typeof dataOrId === 'object' ? dataOrId : undefined;
    return this.broadcastTableChange(table, action, id, data, actor);
  }

  public broadcastSyncAll(reason: string = 'manual_or_system_sync') {
    const timestamp = Date.now();
    const event: RealtimeTableEvent = {
      table: '*',
      action: 'sync',
      timestamp,
      data: { reason, tableVersions: this.tableVersions }
    };

    const payload = `event: sync_all\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.removeClient(client);
      }
    }

    console.log(`[Realtime Sync] Broadcasted full sync_all (${reason}) to ${this.clients.size} clients.`);
  }

  public getStatus() {
    return {
      activeClientsCount: this.clients.size,
      lastEvents: this.eventHistory.slice(0, 10),
      tableVersions: this.tableVersions,
      serverTime: Date.now(),
      uptimeSeconds: Math.floor(process.uptime())
    };
  }
}

export const realtimeBroadcaster = new RealtimeBroadcaster();
