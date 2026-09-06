import { firestore } from './firebase';
import { db } from './db';
import {
  RentalItem,
  RentalUnit,
  RentalStockMovement,
  RentalCustomer,
  RentalRequest,
  RentalReservation,
  RentalBill,
  RentalPayment,
  RentalReceipt,
  RentalHandover,
  RentalReturn,
  RentalRule,
  RentalSettings,
  RentalDashboardStats,
  StockMovementType,
  RentalUnitCondition,
  RentalUnitStatus,
  RentalRequestStatus,
  BankAccount
} from '../types';

export class RentalDatabase {
  // -------------------------------------------------------------
  // COUNTERS (Safe atomic transaction counters)
  // -------------------------------------------------------------
  async getNextCounterNumber(counterName: string, prefix: string, padLength = 4, includeYear = true): Promise<string> {
    const year = new Date().getFullYear();
    const docRef = firestore.collection('counters').doc(counterName);

    return await firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      let currentVal = 0;
      if (snap.exists) {
        currentVal = snap.data().current || 0;
      }
      const nextVal = currentVal + 1;
      transaction.set(docRef, { current: nextVal, updatedAt: new Date().toISOString() }, { merge: true });

      const padded = String(nextVal).padStart(padLength, '0');
      if (includeYear) {
        return `${prefix}-${year}-${padded}`;
      }
      return `${prefix}-${padded}`;
    });
  }

  // -------------------------------------------------------------
  // SETTINGS & RULES
  // -------------------------------------------------------------
  async getRentalSettings(): Promise<RentalSettings> {
    const docRef = firestore.collection('rentalSettings').doc('current');
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as RentalSettings;
    }

    // Default settings fallback
    const bankAccounts = await db.getBankAccounts();
    const defaultAccId = bankAccounts[0]?.id || 'acc_primary_001';

    const defaultSettings: RentalSettings = {
      id: 'current',
      publicRentalEnabled: true,
      defaultPaymentAccountId: defaultAccId,
      pickupLocation: 'ARC Club Headquarters, Boduthakurufaanu Magu, Male, Maldives',
      pickupContactNumber: '+960 7771234',
      defaultGracePeriodHours: 2,
      defaultLateFeePer24Hours: 50,
      minimumAdvanceBookingHours: 12,
      defaultMinimumRentalDays: 1,
      defaultMaximumRentalDays: 14,
      allowCustomerCancellation: true,
      cancellationCutoffHours: 24,
      requireIdCardNumber: true,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(defaultSettings);
    return defaultSettings;
  }

  async updateRentalSettings(updates: Partial<RentalSettings>, userId?: string): Promise<RentalSettings> {
    const docRef = firestore.collection('rentalSettings').doc('current');
    const existing = await this.getRentalSettings();
    const updated: RentalSettings = {
      ...existing,
      ...updates,
      id: 'current',
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updated, { merge: true });
    return updated;
  }

  async getRentalRules(): Promise<RentalRule[]> {
    const snap = await firestore.collection('rentalRules').get();
    let rules = snap.docs.map(d => d.data() as RentalRule);
    if (rules.length === 0) {
      const defaultRule: RentalRule = {
        id: 'rule_v1',
        version: 'v1.0',
        titleEnglish: 'ARC Official Rental Service Regulations',
        titleDhivehi: 'އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ ތަކެތި ކުއްޔަށް ދޫކުރުމުގެ ޤަވާޢިދު',
        contentEnglish: 'All rental equipment remains the sole property of Aanandha Recreation Club (ARC). Renters are fully responsible for safe operation, timely return, and preservation of condition.',
        contentDhivehi: 'ކުއްޔަށް ދޫކުރެވޭ ހުރިހާ ތަކެއްޗަކީ އާނަންދާ ރީކްރިއޭޝަން ކްލަބުގެ މިލްކެކެވެ. ތަކެތި ޙަވާލުވާ ފަރާތުން އެތަކެތި ރައްކާތެރިކަމާއެކު ބެލެހެއްޓުމަށާއި ވަގުތަށް އަނބުރާ ޙަވާލުކުރުމަށް ޒިންމާވާންޖެހޭނެއެވެ.',
        pickupLocation: 'ARC Club Headquarters, Boduthakurufaanu Magu, Male',
        pickupInstructions: 'Present your National ID Card and verified booking receipt during collection hours (09:00 - 18:00).',
        minimumRentalDays: 1,
        maximumRentalDays: 14,
        gracePeriodHours: 2,
        defaultLateFeePer24Hours: 50,
        cancellationPolicy: 'Cancellations made 24 hours prior to scheduled collection are eligible for full credit.',
        damagePolicy: 'Any damage, tears, broken poles or missing components discovered during return inspection will be billed at actual repair or replacement cost.',
        lostItemPolicy: 'Total loss of equipment will be billed at current replacement retail value.',
        paymentPolicy: 'Full rental fee must be settled via verified BML bank transfer prior to equipment collection.',
        handoverPolicy: 'Both renter and ARC representative must inspect and sign digital condition check before handover.',
        returnPolicy: 'Equipment must be returned clean and dry. A return inspection report will be completed immediately upon return.',
        status: 'active',
        effectiveDate: '2026-01-01',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await firestore.collection('rentalRules').doc(defaultRule.id).set(defaultRule);
      return [defaultRule];
    }
    return rules.sort((a, b) => (b.version > a.version ? 1 : -1));
  }

  async saveRentalRule(rule: Partial<RentalRule>, userId?: string): Promise<RentalRule> {
    const id = rule.id || `rule_${Date.now()}`;
    const docRef = firestore.collection('rentalRules').doc(id);
    const existing = (await docRef.get()).data() as RentalRule | undefined;

    const record: RentalRule = {
      id,
      version: rule.version || (existing?.version || 'v1.0'),
      titleEnglish: rule.titleEnglish || '',
      titleDhivehi: rule.titleDhivehi || '',
      contentEnglish: rule.contentEnglish || '',
      contentDhivehi: rule.contentDhivehi || '',
      pickupLocation: rule.pickupLocation || '',
      pickupInstructions: rule.pickupInstructions || '',
      minimumRentalDays: Number(rule.minimumRentalDays || 1),
      maximumRentalDays: Number(rule.maximumRentalDays || 14),
      gracePeriodHours: Number(rule.gracePeriodHours || 2),
      defaultLateFeePer24Hours: Number(rule.defaultLateFeePer24Hours || 50),
      cancellationPolicy: rule.cancellationPolicy || '',
      damagePolicy: rule.damagePolicy || '',
      lostItemPolicy: rule.lostItemPolicy || '',
      paymentPolicy: rule.paymentPolicy || '',
      handoverPolicy: rule.handoverPolicy || '',
      returnPolicy: rule.returnPolicy || '',
      status: rule.status || 'active',
      effectiveDate: rule.effectiveDate || new Date().toISOString().split('T')[0],
      createdBy: existing?.createdBy || userId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await docRef.set(record, { merge: true });
    return record;
  }

  // -------------------------------------------------------------
  // RENTAL ITEMS (CATALOG)
  // -------------------------------------------------------------
  async getRentalItems(includeInactive = false): Promise<RentalItem[]> {
    const snap = await firestore.collection('rentalItems').get();
    let items = snap.docs.map(d => d.data() as RentalItem);
    if (!includeInactive) {
      items = items.filter(i => i.status === 'active');
    }
    return items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async getRentalItemById(id: string): Promise<RentalItem | null> {
    const doc = await firestore.collection('rentalItems').doc(id).get();
    return doc.exists ? (doc.data() as RentalItem) : null;
  }

  async createRentalItem(data: Partial<RentalItem>, userId?: string): Promise<RentalItem> {
    const id = data.id || `rnt_item_${Date.now()}`;
    const itemCode = data.itemCode || `ARC-RNT-${String(Date.now()).slice(-3)}`;
    const newItem: RentalItem = {
      id,
      itemCode,
      name: data.name || 'Unnamed Item',
      nameDh: data.nameDh || '',
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      features: Array.isArray(data.features) ? data.features : [],
      coverImageUrl: data.coverImageUrl || '',
      galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
      pricePer24Hours: Number(data.pricePer24Hours || 0),
      lateFeePer24Hours: Number(data.lateFeePer24Hours || 50),
      useCustomLateFee: Boolean(data.useCustomLateFee),
      minimumRentalDays: Number(data.minimumRentalDays || 1),
      maximumRentalDays: Number(data.maximumRentalDays || 14),
      publicActive: data.publicActive !== undefined ? data.publicActive : true,
      requestEnabled: data.requestEnabled !== undefined ? data.requestEnabled : true,
      totalStock: Number(data.totalStock || 0),
      status: data.status || 'active',
      pickupInstructions: data.pickupInstructions || '',
      conditionChecklistTemplate: Array.isArray(data.conditionChecklistTemplate)
        ? data.conditionChecklistTemplate
        : ['Main Body / Fabric', 'Frame & Poles', 'Accessories & Fasteners', 'Carrying Bag'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      updatedBy: userId
    };

    await firestore.collection('rentalItems').doc(id).set(newItem);
    return newItem;
  }

  async updateRentalItem(id: string, updates: Partial<RentalItem>, userId?: string): Promise<RentalItem> {
    const docRef = firestore.collection('rentalItems').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Rental item not found');

    const cleanUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };
    await docRef.set(cleanUpdates, { merge: true });
    const refreshed = await docRef.get();
    return refreshed.data() as RentalItem;
  }

  async deleteRentalItem(id: string): Promise<void> {
    // Check if there are active requests or units
    const units = await this.getRentalUnits(id);
    if (units.some(u => u.status === 'rented' || u.status === 'reserved')) {
      throw new Error('Cannot delete item with rented or reserved units.');
    }
    await firestore.collection('rentalItems').doc(id).delete();
  }

  // -------------------------------------------------------------
  // RENTAL UNITS (SERIALIZED INVENTORY)
  // -------------------------------------------------------------
  async getRentalUnits(itemId?: string): Promise<RentalUnit[]> {
    const snap = await firestore.collection('rentalUnits').get();
    let units = snap.docs.map(d => d.data() as RentalUnit);
    if (itemId) {
      units = units.filter(u => u.itemId === itemId);
    }
    return units.sort((a, b) => a.assetTag.localeCompare(b.assetTag));
  }

  async getRentalUnitById(id: string): Promise<RentalUnit | null> {
    const doc = await firestore.collection('rentalUnits').doc(id).get();
    return doc.exists ? (doc.data() as RentalUnit) : null;
  }

  async createRentalUnit(data: Partial<RentalUnit>, userId = 'system', userName = 'Staff'): Promise<RentalUnit> {
    const id = data.id || `rnt_unit_${Date.now()}`;
    const itemId = data.itemId;
    if (!itemId) throw new Error('itemId is required for rental unit');

    const item = await this.getRentalItemById(itemId);
    if (!item) throw new Error('Associated rental item not found');

    const unit: RentalUnit = {
      id,
      itemId,
      itemCode: item.itemCode,
      itemName: item.name,
      assetTag: data.assetTag || `UNIT-${String(Date.now()).slice(-4)}`,
      serialNumber: data.serialNumber || '',
      purchaseDate: data.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(data.purchaseCost || 0),
      condition: data.condition || 'excellent',
      status: data.status || 'available',
      currentRequestId: null,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestore.collection('rentalUnits').doc(id).set(unit);

    // Update item totalStock
    const allUnits = await this.getRentalUnits(itemId);
    await firestore.collection('rentalItems').doc(itemId).update({
      totalStock: allUnits.length,
      updatedAt: new Date().toISOString()
    });

    // Record stock movement
    await this.recordStockMovement({
      itemId,
      unitId: id,
      assetTag: unit.assetTag,
      movementType: 'stock_added',
      previousStatus: 'none',
      newStatus: unit.status,
      conditionBefore: 'new',
      conditionAfter: unit.condition,
      quantity: 1,
      reason: `New inventory unit added: ${unit.assetTag}`,
      performedBy: userId,
      performedByName: userName
    });

    return unit;
  }

  async updateRentalUnit(
    id: string,
    updates: Partial<RentalUnit>,
    userId = 'system',
    userName = 'Staff',
    reason = 'Inventory status update'
  ): Promise<RentalUnit> {
    const docRef = firestore.collection('rentalUnits').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Rental unit not found');
    const existing = snap.data() as RentalUnit;

    const previousStatus = existing.status;
    const previousCondition = existing.condition;

    const cleanUpdates = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(cleanUpdates, { merge: true });

    const refreshed = (await docRef.get()).data() as RentalUnit;

    // If status or condition changed, log stock movement
    if (
      (updates.status && updates.status !== previousStatus) ||
      (updates.condition && updates.condition !== previousCondition)
    ) {
      await this.recordStockMovement({
        itemId: existing.itemId,
        unitId: existing.id,
        assetTag: existing.assetTag,
        movementType: 'adjustment',
        previousStatus,
        newStatus: refreshed.status,
        conditionBefore: previousCondition,
        conditionAfter: refreshed.condition,
        quantity: 1,
        reason,
        notes: updates.notes,
        performedBy: userId,
        performedByName: userName
      });
    }

    return refreshed;
  }

  // -------------------------------------------------------------
  // STOCK MOVEMENTS (PERMANENT AUDIT LOG)
  // -------------------------------------------------------------
  async recordStockMovement(data: Omit<RentalStockMovement, 'id' | 'createdAt'>): Promise<RentalStockMovement> {
    const id = `rnt_mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const movement: RentalStockMovement = {
      id,
      ...data,
      createdAt: new Date().toISOString()
    };
    await firestore.collection('rentalStockMovements').doc(id).set(movement);
    return movement;
  }

  async getStockMovements(filter?: { itemId?: string; unitId?: string; requestId?: string; limit?: number }): Promise<RentalStockMovement[]> {
    const snap = await firestore.collection('rentalStockMovements').get();
    let movements = snap.docs.map(d => d.data() as RentalStockMovement);
    if (filter?.itemId) movements = movements.filter(m => m.itemId === filter.itemId);
    if (filter?.unitId) movements = movements.filter(m => m.unitId === filter.unitId);
    if (filter?.requestId) movements = movements.filter(m => m.requestId === filter.requestId);

    movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (filter?.limit) movements = movements.slice(0, filter.limit);
    return movements;
  }

  // -------------------------------------------------------------
  // CUSTOMER PROFILES (GOOGLE AUTHENTICATED)
  // -------------------------------------------------------------
  async getCustomerByUid(uid: string): Promise<RentalCustomer | null> {
    const doc = await firestore.collection('rentalCustomers').doc(uid).get();
    return doc.exists ? (doc.data() as RentalCustomer) : null;
  }

  async saveCustomerProfile(uid: string, data: Partial<RentalCustomer>): Promise<RentalCustomer> {
    const docRef = firestore.collection('rentalCustomers').doc(uid);
    const snap = await docRef.get();
    const now = new Date().toISOString();

    if (snap.exists) {
      const existing = snap.data() as RentalCustomer;
      const updated: RentalCustomer = {
        ...existing,
        ...data,
        uid,
        updatedAt: now
      };
      await docRef.set(updated, { merge: true });
      return updated;
    } else {
      const created: RentalCustomer = {
        uid,
        googleEmail: data.googleEmail || '',
        googleName: data.googleName || '',
        googlePhotoUrl: data.googlePhotoUrl || '',
        fullName: data.fullName || data.googleName || '',
        phoneNumber: data.phoneNumber || '',
        idCardNumber: data.idCardNumber || '',
        address: data.address || '',
        island: data.island || 'Male',
        status: 'active',
        rulesAcceptedVersion: data.rulesAcceptedVersion || '',
        rulesAcceptedAt: data.rulesAcceptedAt || now,
        createdAt: now,
        updatedAt: now
      };
      await docRef.set(created);
      return created;
    }
  }

  async getAllCustomers(): Promise<RentalCustomer[]> {
    const snap = await firestore.collection('rentalCustomers').get();
    return snap.docs.map(d => d.data() as RentalCustomer);
  }

  // -------------------------------------------------------------
  // AVAILABILITY ENGINE & CONFLICT DETECTION
  // -------------------------------------------------------------
  async checkAvailability(
    itemId: string,
    requestedStartAt: string,
    requestedEndAt: string,
    requestedQuantity: number
  ): Promise<{
    available: boolean;
    totalUnits: number;
    operableUnits: number;
    reservedCount: number;
    availableCount: number;
    candidateUnits: RentalUnit[];
  }> {
    const item = await this.getRentalItemById(itemId);
    if (!item || item.status !== 'active') {
      return { available: false, totalUnits: 0, operableUnits: 0, reservedCount: 0, availableCount: 0, candidateUnits: [] };
    }

    // 1. Get all units for this item that are operable (not damaged, lost, or retired)
    const allUnits = await this.getRentalUnits(itemId);
    const operableUnits = allUnits.filter(u =>
      u.status !== 'damaged' &&
      u.status !== 'lost' &&
      u.status !== 'retired' &&
      u.status !== 'maintenance'
    );

    // 2. Fetch all active reservations for this item
    const resSnap = await firestore.collection('rentalReservations').get();
    const activeReservations = resSnap.docs
      .map(d => d.data() as RentalReservation)
      .filter(r => r.itemId === itemId && r.status === 'active');

    // 3. Find overlapping reservations: (startA < endB) && (endA > startB)
    const reqStartMs = new Date(requestedStartAt).getTime();
    const reqEndMs = new Date(requestedEndAt).getTime();

    const conflictingUnitIds = new Set<string>();
    for (const res of activeReservations) {
      const resStartMs = new Date(res.startAt).getTime();
      const resEndMs = new Date(res.endAt).getTime();

      if (resStartMs < reqEndMs && resEndMs > reqStartMs) {
        (res.unitIds || []).forEach(uid => conflictingUnitIds.add(uid));
      }
    }

    // Units not in conflicting reservations
    const candidateUnits = operableUnits.filter(u => !conflictingUnitIds.has(u.id));
    const availableCount = candidateUnits.length;
    const available = availableCount >= requestedQuantity;

    return {
      available,
      totalUnits: allUnits.length,
      operableUnits: operableUnits.length,
      reservedCount: conflictingUnitIds.size,
      availableCount,
      candidateUnits: candidateUnits.slice(0, requestedQuantity)
    };
  }

  // -------------------------------------------------------------
  // RENTAL REQUESTS WORKFLOW
  // -------------------------------------------------------------
  async createRentalRequest(data: {
    customerUid: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerIdCard: string;
    itemId: string;
    requestedQuantity: number;
    requestedStartAt: string;
    requestedEndAt: string;
    rulesVersionAccepted?: string;
  }): Promise<RentalRequest> {
    const item = await this.getRentalItemById(data.itemId);
    if (!item) throw new Error('Selected rental item does not exist.');
    if (!item.publicActive || !item.requestEnabled) {
      throw new Error('This item is currently not accepting rental requests.');
    }

    const startMs = new Date(data.requestedStartAt).getTime();
    const endMs = new Date(data.requestedEndAt).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      throw new Error('Please provide valid start and end dates.');
    }

    // Calculate rental duration in 24-hour blocks (minimum 1 day)
    const durationHours = (endMs - startMs) / (1000 * 60 * 60);
    const rentalDays = Math.max(1, Math.ceil(durationHours / 24));

    if (rentalDays < item.minimumRentalDays) {
      throw new Error(`Minimum rental period for ${item.name} is ${item.minimumRentalDays} day(s).`);
    }
    if (rentalDays > item.maximumRentalDays) {
      throw new Error(`Maximum rental period for ${item.name} is ${item.maximumRentalDays} day(s).`);
    }

    // Check availability
    const avail = await this.checkAvailability(
      data.itemId,
      data.requestedStartAt,
      data.requestedEndAt,
      data.requestedQuantity
    );
    if (!avail.available) {
      throw new Error(`Insufficient inventory available for requested dates. Only ${avail.availableCount} unit(s) available.`);
    }

    const requestNumber = await this.getNextCounterNumber('rentalRequests', 'ARC-RNT', 5, false);
    const id = `req_${Date.now()}`;
    const pricePer24HoursSnapshot = item.pricePer24Hours;
    const estimatedRentalAmount = pricePer24HoursSnapshot * data.requestedQuantity * rentalDays;

    const request: RentalRequest = {
      id,
      requestNumber,
      customerUid: data.customerUid,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      customerIdCard: data.customerIdCard,
      itemId: data.itemId,
      itemCode: item.itemCode,
      itemName: item.name,
      requestedQuantity: data.requestedQuantity,
      requestedStartAt: data.requestedStartAt,
      requestedEndAt: data.requestedEndAt,
      rentalDays,
      pricePer24HoursSnapshot,
      estimatedRentalAmount,
      status: 'requested',
      paymentStatus: 'unpaid',
      assignedUnitIds: [],
      rulesVersionAccepted: data.rulesVersionAccepted || 'v1.0',
      rulesAcceptedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestore.collection('rentalRequests').doc(id).set(request);

    // Save/sync customer profile
    await this.saveCustomerProfile(data.customerUid, {
      fullName: data.customerName,
      phoneNumber: data.customerPhone,
      idCardNumber: data.customerIdCard,
      googleEmail: data.customerEmail,
      rulesAcceptedVersion: data.rulesVersionAccepted,
      rulesAcceptedAt: new Date().toISOString()
    });

    return request;
  }

  async getRentalRequests(filter?: { customerUid?: string; status?: string }): Promise<RentalRequest[]> {
    const snap = await firestore.collection('rentalRequests').get();
    let list = snap.docs.map(d => d.data() as RentalRequest);
    if (filter?.customerUid) list = list.filter(r => r.customerUid === filter.customerUid);
    if (filter?.status) list = list.filter(r => r.status === filter.status);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getRentalRequestById(id: string): Promise<RentalRequest | null> {
    const doc = await firestore.collection('rentalRequests').doc(id).get();
    return doc.exists ? (doc.data() as RentalRequest) : null;
  }

  // -------------------------------------------------------------
  // APPROVE REQUEST -> ALLOCATE UNITS -> CREATE BILL
  // -------------------------------------------------------------
  async approveRentalRequest(
    requestId: string,
    staffId: string,
    staffName: string,
    notes?: string
  ): Promise<{ request: RentalRequest; bill: RentalBill; reservation: RentalReservation }> {
    const request = await this.getRentalRequestById(requestId);
    if (!request) throw new Error('Rental request not found');
    if (request.status !== 'requested') {
      throw new Error(`Request cannot be approved in its current status: ${request.status}`);
    }

    const item = await this.getRentalItemById(request.itemId);
    if (!item) throw new Error('Associated rental item not found');

    // 1. Check availability and select candidate units
    const avail = await this.checkAvailability(
      request.itemId,
      request.requestedStartAt,
      request.requestedEndAt,
      request.requestedQuantity
    );

    if (!avail.available || avail.candidateUnits.length < request.requestedQuantity) {
      throw new Error('Not enough available units for this booking period.');
    }

    const assignedUnits = avail.candidateUnits.slice(0, request.requestedQuantity);
    const assignedUnitIds = assignedUnits.map(u => u.id);

    // 2. Create Reservation
    const reservationId = `res_${Date.now()}`;
    const reservation: RentalReservation = {
      id: reservationId,
      requestId,
      itemId: request.itemId,
      unitIds: assignedUnitIds,
      startAt: request.requestedStartAt,
      endAt: request.requestedEndAt,
      quantity: request.requestedQuantity,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    await firestore.collection('rentalReservations').doc(reservationId).set(reservation);

    // 3. Mark units as reserved and record stock movements
    for (const unit of assignedUnits) {
      await firestore.collection('rentalUnits').doc(unit.id).update({
        status: 'reserved',
        currentRequestId: requestId,
        updatedAt: new Date().toISOString()
      });

      await this.recordStockMovement({
        itemId: request.itemId,
        unitId: unit.id,
        assetTag: unit.assetTag,
        requestId,
        movementType: 'reserved',
        previousStatus: unit.status,
        newStatus: 'reserved',
        quantity: 1,
        reason: `Reserved for Request #${request.requestNumber}`,
        performedBy: staffId,
        performedByName: staffName
      });
    }

    // 4. Create Initial Rental Bill
    const billNumber = await this.getNextCounterNumber('rentalBills', 'ARC-RB', 4, true);
    const billId = `bill_${Date.now()}`;

    // Get default bank account snapshot from budgetAccounts
    const settings = await this.getRentalSettings();
    const bankAccounts = await db.getBankAccounts();
    const bankAcc = bankAccounts.find(a => a.id === settings.defaultPaymentAccountId) || bankAccounts[0] || {
      id: 'acc_primary_001',
      accountName: 'Aanandha Recreation Club',
      accountNumber: '7730000123456',
      bankName: 'Bank of Maldives (BML)',
      currency: 'MVR'
    };

    const unitPrice = request.pricePer24HoursSnapshot;
    const lineTotal = unitPrice * request.requestedQuantity * request.rentalDays;

    const bill: RentalBill = {
      id: billId,
      billNumber,
      requestId,
      customerUid: request.customerUid,
      billType: 'initial_rental',
      lineItems: [
        {
          description: `${item.name} (${request.requestedQuantity} unit(s) x ${request.rentalDays} day(s))`,
          quantity: request.requestedQuantity,
          unitPrice: unitPrice * request.rentalDays,
          total: lineTotal
        }
      ],
      subtotal: lineTotal,
      discount: 0,
      lateFine: 0,
      damageCharge: 0,
      otherCharge: 0,
      totalAmount: lineTotal,
      amountPaid: 0,
      balanceDue: lineTotal,
      status: 'issued',
      paymentAccountId: bankAcc.id,
      paymentAccountSnapshot: {
        bankName: bankAcc.bankName,
        accountName: bankAcc.accountName,
        accountNumber: bankAcc.accountNumber,
        currency: bankAcc.currency || 'MVR'
      },
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalBills').doc(billId).set(bill);

    // 5. Update Request Status
    const updatedRequest: RentalRequest = {
      ...request,
      status: 'approved_payment_pending',
      providerDecision: 'approved',
      approvedQuantity: request.requestedQuantity,
      approvedStartAt: request.requestedStartAt,
      approvedEndAt: request.requestedEndAt,
      approvedBy: staffId,
      approvedAt: new Date().toISOString(),
      billId,
      paymentStatus: 'unpaid',
      assignedUnitIds,
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalRequests').doc(requestId).set(updatedRequest);

    return { request: updatedRequest, bill, reservation };
  }

  async rejectRentalRequest(
    requestId: string,
    staffId: string,
    staffName: string,
    reason: string
  ): Promise<RentalRequest> {
    const request = await this.getRentalRequestById(requestId);
    if (!request) throw new Error('Rental request not found');
    if (request.status !== 'requested') {
      throw new Error(`Cannot reject request with status: ${request.status}`);
    }

    const updated: RentalRequest = {
      ...request,
      status: 'rejected',
      providerDecision: 'rejected',
      rejectedBy: staffId,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalRequests').doc(requestId).set(updated);
    return updated;
  }

  async cancelRentalRequest(requestId: string, canceledByUid: string, reason = 'Customer requested cancellation'): Promise<RentalRequest> {
    const request = await this.getRentalRequestById(requestId);
    if (!request) throw new Error('Rental request not found');

    if (request.status === 'handed_over' || request.status === 'active_rental' || request.status === 'completed') {
      throw new Error('Cannot cancel an active or completed rental.');
    }

    // Release any reserved units
    if (request.assignedUnitIds && request.assignedUnitIds.length > 0) {
      for (const uid of request.assignedUnitIds) {
        await firestore.collection('rentalUnits').doc(uid).update({
          status: 'available',
          currentRequestId: null,
          updatedAt: new Date().toISOString()
        });

        await this.recordStockMovement({
          itemId: request.itemId,
          unitId: uid,
          requestId,
          movementType: 'reservation_released',
          previousStatus: 'reserved',
          newStatus: 'available',
          quantity: 1,
          reason: `Reservation released due to cancellation: ${reason}`,
          performedBy: canceledByUid,
          performedByName: 'Customer / Portal'
        });
      }
    }

    // Cancel reservation record
    const resSnap = await firestore.collection('rentalReservations').get();
    const existingRes = resSnap.docs.map(d => d.data() as RentalReservation).find(r => r.requestId === requestId && r.status === 'active');
    if (existingRes) {
      await firestore.collection('rentalReservations').doc(existingRes.id).update({
        status: 'cancelled',
        releasedAt: new Date().toISOString()
      });
    }

    // Void any issued bill
    if (request.billId) {
      await firestore.collection('rentalBills').doc(request.billId).update({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
    }

    const updated: RentalRequest = {
      ...request,
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalRequests').doc(requestId).set(updated);
    return updated;
  }

  // -------------------------------------------------------------
  // BILLS & CUSTOMER PAYMENTS
  // -------------------------------------------------------------
  async getRentalBillById(id: string): Promise<RentalBill | null> {
    const doc = await firestore.collection('rentalBills').doc(id).get();
    return doc.exists ? (doc.data() as RentalBill) : null;
  }

  async getRentalBills(filter?: { requestId?: string; customerUid?: string; status?: string }): Promise<RentalBill[]> {
    const snap = await firestore.collection('rentalBills').get();
    let bills = snap.docs.map(d => d.data() as RentalBill);
    if (filter?.requestId) bills = bills.filter(b => b.requestId === filter.requestId);
    if (filter?.customerUid) bills = bills.filter(b => b.customerUid === filter.customerUid);
    if (filter?.status) bills = bills.filter(b => b.status === filter.status);

    return bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async submitRentalPayment(data: {
    billId: string;
    requestId: string;
    customerUid: string;
    amount: number;
    method: 'bank_transfer' | 'cash' | 'other';
    bankAccountId?: string;
    transferReference?: string;
    slipStoragePath?: string;
    slipUrl?: string;
    paymentType?: 'rental_fee' | 'late_fine' | 'damage_charge' | 'return_charge';
  }): Promise<RentalPayment> {
    const bill = await this.getRentalBillById(data.billId);
    if (!bill) throw new Error('Bill not found');
    if (bill.status === 'paid' || bill.balanceDue <= 0) {
      throw new Error('This bill has already been fully paid.');
    }

    const paymentNumber = await this.getNextCounterNumber('rentalPayments', 'ARC-RP', 4, true);
    const id = `pay_${Date.now()}`;

    const payment: RentalPayment = {
      id,
      paymentNumber,
      requestId: data.requestId,
      billId: data.billId,
      customerUid: data.customerUid,
      paymentType: data.paymentType || (bill.billType === 'return_charges' ? 'return_charge' : 'rental_fee'),
      amount: Number(data.amount),
      method: data.method || 'bank_transfer',
      bankAccountId: data.bankAccountId || bill.paymentAccountId,
      bankAccountSnapshot: bill.paymentAccountSnapshot,
      transferReference: data.transferReference || '',
      slipStoragePath: data.slipStoragePath || '',
      slipUrl: data.slipUrl || '',
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await firestore.collection('rentalPayments').doc(id).set(payment);

    // Update bill status
    await firestore.collection('rentalBills').doc(data.billId).update({
      status: 'payment_submitted',
      updatedAt: new Date().toISOString()
    });

    // Update request status
    const req = await this.getRentalRequestById(data.requestId);
    if (req) {
      const nextStatus: RentalRequestStatus =
        req.status === 'additional_payment_required'
          ? 'additional_payment_submitted'
          : 'payment_submitted';

      await firestore.collection('rentalRequests').doc(data.requestId).update({
        status: nextStatus,
        paymentStatus: 'payment_submitted',
        updatedAt: new Date().toISOString()
      });
    }

    return payment;
  }

  async getRentalPayments(filter?: { requestId?: string; customerUid?: string; status?: string }): Promise<RentalPayment[]> {
    const snap = await firestore.collection('rentalPayments').get();
    let list = snap.docs.map(d => d.data() as RentalPayment);
    if (filter?.requestId) list = list.filter(p => p.requestId === filter.requestId);
    if (filter?.customerUid) list = list.filter(p => p.customerUid === filter.customerUid);
    if (filter?.status) list = list.filter(p => p.status === filter.status);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getRentalPaymentById(id: string): Promise<RentalPayment | null> {
    const doc = await firestore.collection('rentalPayments').doc(id).get();
    return doc.exists ? (doc.data() as RentalPayment) : null;
  }

  // -------------------------------------------------------------
  // APPROVE PAYMENT -> ATOMIC SYNC WITH BUDGET & FINANCE + RECEIPT
  // -------------------------------------------------------------
  async approveRentalPayment(
    paymentId: string,
    staffId: string,
    staffName: string
  ): Promise<{ payment: RentalPayment; bill: RentalBill; receipt: RentalReceipt }> {
    const payment = await this.getRentalPaymentById(paymentId);
    if (!payment) throw new Error('Payment record not found');

    // Idempotency check: if already approved, return without duplicating finance record
    if (payment.status === 'approved' && payment.receiptId) {
      const bill = (await this.getRentalBillById(payment.billId))!;
      const rSnap = await firestore.collection('rentalReceipts').doc(payment.receiptId).get();
      return { payment, bill, receipt: rSnap.data() as RentalReceipt };
    }

    const bill = await this.getRentalBillById(payment.billId);
    if (!bill) throw new Error('Associated bill not found');

    const request = await this.getRentalRequestById(payment.requestId);
    if (!request) throw new Error('Associated rental request not found');

    // 1. Create Income Record in EXISTING Budget & Finance module
    const incomeTitle = `Rental Service - ${request.itemName} - ${request.requestNumber}`;
    const budgetIncomeRecord = await db.createIncomeRecord({
      title: incomeTitle,
      amount: payment.amount,
      category: 'rental_service' as any,
      date: new Date().toISOString(),
      accountId: payment.bankAccountId || bill.paymentAccountId,
      paymentMethod: payment.method === 'cash' ? 'cash' : 'bank_transfer',
      referenceNumber: payment.paymentNumber,
      receivedFrom: request.customerName,
      sourceModule: 'rental_service',
      sourceRequestId: request.id,
      sourcePaymentId: payment.id,
      sourceBillId: bill.id,
      incomeSubcategory: payment.paymentType === 'late_fine' || payment.paymentType === 'late_fee'
        ? 'late_fee'
        : payment.paymentType === 'damage_charge'
        ? 'damage_charge'
        : payment.paymentType === 'return_charge' || payment.paymentType === 'other_return_charge'
        ? 'other_return_charge'
        : 'rental_fee',
      notes: `Approved payment for ${request.itemName} (${request.requestNumber}) by ${staffName}`
    });

    // 2. Generate Official Printable Receipt
    const receiptNumber = await this.getNextCounterNumber('rentalReceipts', 'ARC-RR', 4, true);
    const receiptId = `rcpt_${Date.now()}`;
    const receipt: RentalReceipt = {
      id: receiptId,
      receiptNumber,
      paymentId: payment.id,
      billId: bill.id,
      requestId: request.id,
      customerUid: request.customerUid,
      customerName: request.customerName,
      amount: payment.amount,
      paymentMethod: payment.method === 'cash' ? 'Cash' : 'Bank Transfer (BML)',
      referenceNumber: payment.transferReference || payment.paymentNumber,
      receivedAt: new Date().toISOString(),
      receivedBy: staffName,
      paidStatus: 'PAID',
      createdAt: new Date().toISOString()
    };
    await firestore.collection('rentalReceipts').doc(receiptId).set(receipt);

    // 3. Update Payment record
    const updatedPayment: RentalPayment = {
      ...payment,
      status: 'approved',
      approvedBy: staffId,
      approvedByName: staffName,
      approvedAt: new Date().toISOString(),
      budgetIncomeId: budgetIncomeRecord.id,
      receiptId,
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalPayments').doc(payment.id).set(updatedPayment);

    // 4. Update Bill amounts
    const newAmountPaid = (bill.amountPaid || 0) + payment.amount;
    const newBalanceDue = Math.max(0, bill.totalAmount - newAmountPaid);
    const newBillStatus = newBalanceDue <= 0 ? 'paid' : 'issued';

    const updatedBill: RentalBill = {
      ...bill,
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      status: newBillStatus,
      paidAt: newBillStatus === 'paid' ? new Date().toISOString() : bill.paidAt,
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalBills').doc(bill.id).set(updatedBill);

    // 5. Update Request Status
    let nextReqStatus: RentalRequestStatus = request.status;
    if (bill.billType === 'initial_rental') {
      if (newBalanceDue <= 0) {
        nextReqStatus = 'ready_for_collection';
      }
    } else if (bill.billType === 'return_charges') {
      if (newBalanceDue <= 0) {
        // Return charges fully paid: transition to return_inspection_pending or can finalize
        nextReqStatus = 'return_inspection_pending';
      }
    }

    await firestore.collection('rentalRequests').doc(request.id).update({
      status: nextReqStatus,
      paymentStatus: newBalanceDue <= 0 ? 'paid' : 'payment_submitted',
      updatedAt: new Date().toISOString()
    });

    return { payment: updatedPayment, bill: updatedBill, receipt };
  }

  async rejectRentalPayment(
    paymentId: string,
    staffId: string,
    staffName: string,
    reason: string
  ): Promise<RentalPayment> {
    const payment = await this.getRentalPaymentById(paymentId);
    if (!payment) throw new Error('Payment record not found');

    const updated: RentalPayment = {
      ...payment,
      status: 'rejected',
      rejectedBy: staffId,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalPayments').doc(payment.id).set(updated);

    // Revert bill status to issued
    await firestore.collection('rentalBills').doc(payment.billId).update({
      status: 'issued',
      updatedAt: new Date().toISOString()
    });

    // Revert request status
    const req = await this.getRentalRequestById(payment.requestId);
    if (req) {
      const prevStatus: RentalRequestStatus =
        req.status === 'additional_payment_submitted'
          ? 'additional_payment_required'
          : 'approved_payment_pending';

      await firestore.collection('rentalRequests').doc(payment.requestId).update({
        status: prevStatus,
        paymentStatus: 'unpaid',
        updatedAt: new Date().toISOString()
      });
    }

    return updated;
  }

  // -------------------------------------------------------------
  // HANDOVER WORKFLOW (DISPATCH & SIGNATURE)
  // -------------------------------------------------------------
  async executeHandover(data: {
    requestId: string;
    conditionChecks: Array<{
      unitId: string;
      assetTag: string;
      condition: RentalUnitCondition;
      checklist: Record<string, 'Good' | 'Existing Damage' | 'Missing' | 'Not Applicable'>;
      notes?: string;
    }>;
    accessories: string[];
    conditionPhotos: string[];
    notes?: string;
    customerSignatureUrl: string;
    handedOverBy: string;
    handedOverByName: string;
    staffSignatureName?: string;
  }): Promise<RentalHandover> {
    const request = await this.getRentalRequestById(data.requestId);
    if (!request) throw new Error('Rental request not found');

    if (request.status !== 'ready_for_collection' && request.status !== 'payment_verified') {
      throw new Error(`Cannot perform handover for request in status: ${request.status}. Payment must be verified first.`);
    }

    const handoverNumber = await this.getNextCounterNumber('rentalHandovers', 'ARC-RH', 4, true);
    const handoverId = `ho_${Date.now()}`;
    const handoverDateTime = new Date().toISOString();

    const handover: RentalHandover = {
      id: handoverId,
      handoverNumber,
      requestId: request.id,
      customerUid: request.customerUid,
      customerName: request.customerName,
      itemId: request.itemId,
      unitIds: request.assignedUnitIds,
      handoverDateTime,
      dueDateTime: request.approvedEndAt || request.requestedEndAt,
      conditionChecks: data.conditionChecks,
      accessories: data.accessories || [],
      notes: data.notes || '',
      conditionPhotos: data.conditionPhotos || [],
      handedOverBy: data.handedOverBy,
      handedOverByName: data.handedOverByName,
      customerSignatureUrl: data.customerSignatureUrl,
      customerSignedAt: handoverDateTime,
      staffSignatureName: data.staffSignatureName || data.handedOverByName,
      rulesVersion: request.rulesVersionAccepted || 'v1.0',
      status: 'finalized',
      createdAt: handoverDateTime
    };

    await firestore.collection('rentalHandovers').doc(handoverId).set(handover);

    // Atomically transition units to 'rented' and record stock movements
    for (const check of data.conditionChecks) {
      await firestore.collection('rentalUnits').doc(check.unitId).update({
        status: 'rented',
        condition: check.condition,
        currentRequestId: request.id,
        updatedAt: handoverDateTime
      });

      await this.recordStockMovement({
        itemId: request.itemId,
        unitId: check.unitId,
        assetTag: check.assetTag,
        requestId: request.id,
        movementType: 'handover',
        previousStatus: 'reserved',
        newStatus: 'rented',
        conditionBefore: check.condition,
        conditionAfter: check.condition,
        quantity: 1,
        reason: `Handover #${handoverNumber} signed and released to ${request.customerName}`,
        performedBy: data.handedOverBy,
        performedByName: data.handedOverByName
      });
    }

    // Update Request status
    await firestore.collection('rentalRequests').doc(request.id).update({
      status: 'active_rental',
      handoverId,
      updatedAt: handoverDateTime
    });

    return handover;
  }

  async getRentalHandoverById(id: string): Promise<RentalHandover | null> {
    const doc = await firestore.collection('rentalHandovers').doc(id).get();
    return doc.exists ? (doc.data() as RentalHandover) : null;
  }

  // -------------------------------------------------------------
  // RETURN INSPECTION & FINALIZATION
  // -------------------------------------------------------------
  async submitReturnInspection(data: {
    requestId: string;
    actualReturnAt: string;
    unitInspections: Array<{
      unitId: string;
      assetTag: string;
      handoverCondition: string;
      returnCondition: RentalUnitCondition;
      finding: 'No Change' | 'New Damage' | 'Missing Accessory' | 'Major Damage' | 'Lost Item';
      notes?: string;
      chargeAmount?: number;
      photoUrl?: string;
      actionOutcome: 'available' | 'maintenance' | 'damaged' | 'lost';
    }>;
    damageCharges: Array<{ description: string; amount: number; unitId?: string }>;
    missingItemCharges: Array<{ description: string; amount: number }>;
    otherCharges: Array<{ description: string; amount: number }>;
    inspectedBy: string;
    inspectedByName: string;
    waiveCharges?: boolean;
    waiveReason?: string;
  }): Promise<{ returnRecord: RentalReturn; additionalBill?: RentalBill }> {
    const request = await this.getRentalRequestById(data.requestId);
    if (!request) throw new Error('Rental request not found');

    const item = await this.getRentalItemById(request.itemId);
    if (!item) throw new Error('Associated item not found');

    const settings = await this.getRentalSettings();
    const returnNumber = await this.getNextCounterNumber('rentalReturns', 'ARC-RT', 4, true);
    const returnId = `ret_${Date.now()}`;

    // 1. Calculate Overdue & Late Fines
    const dueTimeMs = new Date(request.approvedEndAt || request.requestedEndAt).getTime();
    const returnTimeMs = new Date(data.actualReturnAt).getTime();
    const diffHours = Math.max(0, (returnTimeMs - dueTimeMs) / (1000 * 60 * 60));
    const graceHours = settings.defaultGracePeriodHours || 2;

    let lateHours = 0;
    let lateBillingBlocks = 0;
    let lateFine = 0;

    if (diffHours > graceHours) {
      lateHours = Math.round(diffHours * 10) / 10;
      // Charged in 24-hour blocks
      lateBillingBlocks = Math.ceil(diffHours / 24);
      const lateRate = item.useCustomLateFee ? item.lateFeePer24Hours : settings.defaultLateFeePer24Hours;
      lateFine = lateBillingBlocks * lateRate * (request.approvedQuantity || request.requestedQuantity);
    }

    // 2. Sum damage & item charges
    const totalDamageCharges = (data.damageCharges || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalMissingCharges = (data.missingItemCharges || []).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
    const totalOtherCharges = (data.otherCharges || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    let totalAdditionalCharge = lateFine + totalDamageCharges + totalMissingCharges + totalOtherCharges;
    if (data.waiveCharges) {
      totalAdditionalCharge = 0;
    }

    let additionalBill: RentalBill | undefined = undefined;
    let additionalPaymentStatus: RentalReturn['additionalPaymentStatus'] = 'none_required';

    if (totalAdditionalCharge > 0) {
      additionalPaymentStatus = 'unpaid';
      const billNumber = await this.getNextCounterNumber('rentalBills', 'ARC-RB', 4, true);
      const billId = `bill_ret_${Date.now()}`;

      const bankAccounts = await db.getBankAccounts();
      const bankAcc = bankAccounts.find(a => a.id === settings.defaultPaymentAccountId) || bankAccounts[0] || {
        id: 'acc_primary_001',
        accountName: 'Aanandha Recreation Club',
        accountNumber: '7730000123456',
        bankName: 'Bank of Maldives (BML)',
        currency: 'MVR'
      };

      const lineItems: any[] = [];
      if (lateFine > 0) {
        lineItems.push({
          description: `Late Overdue Fine (${lateHours} hours overdue - ${lateBillingBlocks} block(s))`,
          quantity: lateBillingBlocks,
          unitPrice: lateFine / lateBillingBlocks,
          total: lateFine
        });
      }
      (data.damageCharges || []).forEach(d => {
        if (d.amount > 0) {
          lineItems.push({ description: `Damage Charge: ${d.description}`, quantity: 1, unitPrice: d.amount, total: d.amount });
        }
      });
      (data.missingItemCharges || []).forEach(m => {
        if (m.amount > 0) {
          lineItems.push({ description: `Missing Item Charge: ${m.description}`, quantity: 1, unitPrice: m.amount, total: m.amount });
        }
      });
      (data.otherCharges || []).forEach(o => {
        if (o.amount > 0) {
          lineItems.push({ description: `Return Charge: ${o.description}`, quantity: 1, unitPrice: o.amount, total: o.amount });
        }
      });

      additionalBill = {
        id: billId,
        billNumber,
        requestId: request.id,
        customerUid: request.customerUid,
        billType: 'return_charges',
        lineItems,
        subtotal: totalAdditionalCharge,
        discount: 0,
        lateFine,
        damageCharge: totalDamageCharges,
        otherCharge: totalMissingCharges + totalOtherCharges,
        totalAmount: totalAdditionalCharge,
        amountPaid: 0,
        balanceDue: totalAdditionalCharge,
        status: 'issued',
        paymentAccountId: bankAcc.id,
        paymentAccountSnapshot: {
          bankName: bankAcc.bankName,
          accountName: bankAcc.accountName,
          accountNumber: bankAcc.accountNumber,
          currency: bankAcc.currency || 'MVR'
        },
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await firestore.collection('rentalBills').doc(billId).set(additionalBill);
    } else if (data.waiveCharges) {
      additionalPaymentStatus = 'waived';
    }

    const returnRecord: RentalReturn = {
      id: returnId,
      returnNumber,
      requestId: request.id,
      handoverId: request.handoverId || '',
      customerUid: request.customerUid,
      actualReturnAt: data.actualReturnAt,
      inspectedBy: data.inspectedBy,
      inspectedByName: data.inspectedByName,
      unitInspections: data.unitInspections,
      lateHours,
      lateBillingBlocks,
      lateFine,
      damageCharges: data.damageCharges || [],
      missingItemCharges: data.missingItemCharges || [],
      otherCharges: data.otherCharges || [],
      totalAdditionalCharge,
      additionalBillId: additionalBill?.id,
      additionalPaymentStatus,
      status: totalAdditionalCharge > 0 ? 'inspection_completed' : 'finalized',
      finalizedAt: totalAdditionalCharge === 0 ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalReturns').doc(returnId).set(returnRecord);

    // If no additional charges, finalize everything immediately!
    if (totalAdditionalCharge === 0) {
      await this.finalizeReturnExecution(request, data.unitInspections, data.inspectedBy, data.inspectedByName, returnNumber);
    } else {
      // Set request status to additional payment required
      await firestore.collection('rentalRequests').doc(request.id).update({
        status: 'additional_payment_required',
        returnId,
        updatedAt: new Date().toISOString()
      });
    }

    return { returnRecord, additionalBill };
  }

  async finalizeReturnExecution(
    request: RentalRequest,
    unitInspections: any[],
    inspectedBy: string,
    inspectedByName: string,
    returnNumber: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // 1. Update unit status based on inspection action outcome
    for (const ins of unitInspections) {
      const newStatus: RentalUnitStatus = ins.actionOutcome || 'available';
      await firestore.collection('rentalUnits').doc(ins.unitId).update({
        status: newStatus,
        condition: ins.returnCondition,
        currentRequestId: null,
        updatedAt: now
      });

      await this.recordStockMovement({
        itemId: request.itemId,
        unitId: ins.unitId,
        assetTag: ins.assetTag,
        requestId: request.id,
        movementType: 'return_completed',
        previousStatus: 'rented',
        newStatus,
        conditionBefore: ins.handoverCondition,
        conditionAfter: ins.returnCondition,
        quantity: 1,
        reason: `Return finalized #${returnNumber}. Unit condition: ${ins.returnCondition}, status: ${newStatus}`,
        performedBy: inspectedBy,
        performedByName: inspectedByName
      });
    }

    // 2. Mark reservation completed
    const resSnap = await firestore.collection('rentalReservations').get();
    const res = resSnap.docs.map(d => d.data() as RentalReservation).find(r => r.requestId === request.id && r.status === 'active');
    if (res) {
      await firestore.collection('rentalReservations').doc(res.id).update({
        status: 'completed',
        releasedAt: now
      });
    }

    // 3. Mark request completed
    await firestore.collection('rentalRequests').doc(request.id).update({
      status: 'completed',
      updatedAt: now
    });
  }

  async finalizeReturnAfterPayment(returnId: string, staffId: string, staffName: string): Promise<RentalReturn> {
    const doc = await firestore.collection('rentalReturns').doc(returnId).get();
    if (!doc.exists) throw new Error('Return record not found');
    const ret = doc.data() as RentalReturn;

    if (ret.status === 'finalized') return ret;

    const request = await this.getRentalRequestById(ret.requestId);
    if (!request) throw new Error('Associated request not found');

    if (ret.additionalBillId) {
      const bill = await this.getRentalBillById(ret.additionalBillId);
      if (bill && bill.status !== 'paid' && bill.balanceDue > 0 && ret.additionalPaymentStatus !== 'waived') {
        throw new Error(`Additional charges bill #${bill.billNumber} has balance due MVR ${bill.balanceDue}. Payment must be approved first.`);
      }
    }

    await this.finalizeReturnExecution(request, ret.unitInspections, staffId, staffName, ret.returnNumber);

    const updated: RentalReturn = {
      ...ret,
      status: 'finalized',
      finalizedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('rentalReturns').doc(returnId).set(updated);
    return updated;
  }

  async getRentalReturnById(id: string): Promise<RentalReturn | null> {
    const doc = await firestore.collection('rentalReturns').doc(id).get();
    return doc.exists ? (doc.data() as RentalReturn) : null;
  }

  async getRentalReceiptById(id: string): Promise<RentalReceipt | null> {
    const doc = await firestore.collection('rentalReceipts').doc(id).get();
    return doc.exists ? (doc.data() as RentalReceipt) : null;
  }

  // -------------------------------------------------------------
  // DASHBOARD & REPORTS
  // -------------------------------------------------------------
  async getRentalDashboardStats(): Promise<RentalDashboardStats> {
    const [items, units, requests, payments] = await Promise.all([
      this.getRentalItems(true),
      this.getRentalUnits(),
      this.getRentalRequests(),
      this.getRentalPayments()
    ]);

    const activeRentalItems = items.filter(i => i.status === 'active').length;
    const totalInventoryUnits = units.length;
    const availableNow = units.filter(u => u.status === 'available').length;
    const reserved = units.filter(u => u.status === 'reserved').length;
    const currentlyRented = units.filter(u => u.status === 'rented').length;
    const maintenanceOrDamaged = units.filter(u => u.status === 'maintenance' || u.status === 'damaged' || u.status === 'lost').length;

    const pendingRequests = requests.filter(r => r.status === 'requested').length;
    const pendingPayments = payments.filter(p => p.status === 'submitted').length;
    const readyForHandover = requests.filter(r => r.status === 'ready_for_collection').length;

    // Overdue rentals
    const nowMs = Date.now();
    let overdueRentals = 0;
    let dueToday = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    requests.filter(r => r.status === 'active_rental').forEach(r => {
      const endMs = new Date(r.approvedEndAt || r.requestedEndAt).getTime();
      const endDateStr = (r.approvedEndAt || r.requestedEndAt || '').split('T')[0];
      if (endMs < nowMs) overdueRentals++;
      if (endDateStr === todayStr) dueToday++;
    });

    const returnInspectionsPending = requests.filter(r => r.status === 'return_inspection_pending' || r.status === 'additional_payment_required').length;

    // Rental Income this month and all-time
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const approvedPayments = payments.filter(p => p.status === 'approved');
    const approvedPaymentsThisMonth = approvedPayments.filter(p =>
      new Date(p.approvedAt || p.submittedAt).getTime() >= startOfMonth
    );
    const rentalIncomeThisMonth = approvedPaymentsThisMonth.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalRevenue = approvedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;
    const damagedUnits = units.filter(u => u.status === 'damaged' || u.status === 'lost').length;

    return {
      activeRentalItems,
      totalInventoryUnits,
      availableNow,
      reserved,
      currentlyRented,
      maintenanceOrDamaged,
      pendingRequests,
      pendingPayments,
      readyForHandover,
      dueToday,
      overdueRentals,
      returnInspectionsPending,
      rentalIncomeThisMonth,
      // Metric aliases for frontend dashboard
      totalItems: items.length,
      totalUnits: totalInventoryUnits,
      availableUnits: availableNow,
      rentedUnits: currentlyRented,
      activeRentals: currentlyRented,
      maintenanceUnits,
      damagedUnits,
      monthlyRevenue: rentalIncomeThisMonth,
      totalRevenue,
      pendingPaymentRequests: pendingPayments,
      overdueReturns: overdueRentals
    };
  }

  // -------------------------------------------------------------
  // SEED DEFAULT TEST SCENARIO (PICNIC TENT)
  // -------------------------------------------------------------
  async ensureRentalSeedData(): Promise<void> {
    try {
      const items = await this.getRentalItems(true);
      const picnicTent = items.find(i => i.itemCode === 'ARC-RNT-001' || i.name.toLowerCase().includes('picnic tent'));

      let tentItemId = picnicTent?.id;

      if (!picnicTent) {
        console.log('[Rental Seed] Creating initial Picnic Tent catalog item...');
        const createdItem = await this.createRentalItem({
          itemCode: 'ARC-RNT-001',
          name: 'Picnic Tent',
          nameDh: 'ޕިކްނިކް ޓެންޓް',
          shortDescription: 'Heavy-duty 4-6 person camping and beach picnic tent with sun shade and waterproof floor.',
          description: 'Spacious high-quality outdoor tent ideal for island beach camping, community events, and family picnics. Easy 10-minute setup with aluminum poles, weather-resistant fabric, double-layer rainfly, and ventilated mesh windows.',
          features: [
            'Capacity: 4 to 6 Persons',
            'Waterproof PU 3000mm Rainfly',
            'UV Protection Silver Coating',
            'Reinforced Aluminum Alloy Poles',
            'Ground Pegs & High-Tensile Wind Ropes',
            'Compact Carrying Duffle Bag'
          ],
          coverImageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
          galleryImages: [
            'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1478860409698-8707f313ee8b?auto=format&fit=crop&w=1200&q=80'
          ],
          pricePer24Hours: 250,
          lateFeePer24Hours: 50,
          useCustomLateFee: false,
          minimumRentalDays: 1,
          maximumRentalDays: 14,
          publicActive: true,
          requestEnabled: true,
          totalStock: 3,
          status: 'active',
          pickupInstructions: 'Collect from ARC Headquarters, Boduthakurufaanu Magu, Male. Please present your national ID card and booking receipt.',
          conditionChecklistTemplate: [
            'Tent fabric & zipper condition',
            'Aluminum poles & connectors',
            'Ground pegs (12 pieces)',
            'High-tensile wind ropes (6 pieces)',
            'Waterproof ground sheet',
            'Carrying storage bag'
          ]
        }, 'system');
        tentItemId = createdItem.id;
      }

      if (tentItemId) {
        const units = await this.getRentalUnits(tentItemId);
        if (units.length === 0) {
          console.log('[Rental Seed] Initializing 3 serialized units for Picnic Tent...');
          const unitTags = ['TENT-001', 'TENT-002', 'TENT-003'];
          for (let i = 0; i < unitTags.length; i++) {
            await this.createRentalUnit({
              itemId: tentItemId,
              assetTag: unitTags[i],
              serialNumber: `ARC-PT-${2026}-00${i + 1}`,
              purchaseDate: '2026-01-10',
              purchaseCost: 2200,
              condition: 'excellent',
              status: 'available',
              notes: 'Brand new condition ready for rental.'
            }, 'system', 'System Init');
          }
        }
      }

      // Ensure settings & rules
      await this.getRentalSettings();
      await this.getRentalRules();
    } catch (err) {
      console.warn('[Rental Seed] Notice during seed initialization:', err);
    }
  }
}

export const rentalDb = new RentalDatabase();
