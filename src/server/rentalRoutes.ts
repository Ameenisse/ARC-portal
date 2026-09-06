import { Express, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth, bucket } from './firebase';
import { db } from './db';
import { rentalDb } from './rentalDb';
import { realtimeBroadcaster } from './realtime';

export function registerRentalRoutes(
  app: Express,
  authenticateSession: (req: Request, res: Response, next: NextFunction) => void,
  requirePermission: (moduleKey: any, actionKey?: any) => (req: Request, res: Response, next: NextFunction) => void
) {
  // -------------------------------------------------------------
  // CUSTOMER AUTHENTICATION MIDDLEWARE
  // -------------------------------------------------------------
  async function authenticateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Customer unauthorized. Please log in with Google.' });
      }
      const token = authHeader.substring(7);

      // Support for dev preview token
      if (token.startsWith('dev_cust_')) {
        const parts = token.split('__');
        const uid = parts[1] || 'dev_customer_123';
        const email = parts[2] || 'customer.demo@arc.mv';
        const name = parts[3] || 'Demo Customer';
        (req as any).customer = { uid, email, name, picture: '' };
        return next();
      }

      // Verify Firebase ID token with Firebase Admin Auth
      const decoded = await adminAuth.verifyIdToken(token);
      (req as any).customer = {
        uid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || '',
        picture: decoded.picture || ''
      };
      next();
    } catch (err: any) {
      console.warn('Customer token verification warning:', err.message);
      return res.status(401).json({ error: 'Customer authentication failed or expired. Please sign in again.' });
    }
  }

  // Upload helper
  async function handleFileUpload(req: Request, res: Response, defaultFolder = 'rental') {
    try {
      const { fileName, fileType, fileData, folder = defaultFolder } = req.body;
      if (!fileData) return res.status(400).json({ error: 'fileData is required' });

      if (bucket && bucket.name) {
        try {
          const cleanFileName = `${Date.now()}_${(fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `${folder}/${cleanFileName}`;
          const file = bucket.file(filePath);

          const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
          const buffer = Buffer.from(base64Data, 'base64');

          await file.save(buffer, {
            metadata: { contentType: fileType || 'application/octet-stream' },
            resumable: false
          });

          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          return res.json({ url: publicUrl, fileName: cleanFileName, storage: 'firebase-storage' });
        } catch (storageErr) {
          console.warn('[Storage] Upload to bucket skipped, returning data URI:', storageErr);
        }
      }
      return res.json({ url: fileData, fileName: fileName || 'file', storage: 'inline' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // =============================================================
  // PUBLIC RENTAL ROUTES
  // =============================================================

  app.get('/api/public/rental/items', async (req: Request, res: Response) => {
    try {
      const items = await rentalDb.getRentalItems(false);
      return res.json(items.filter(i => i.publicActive));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/public/rental/items/:id', async (req: Request, res: Response) => {
    try {
      const item = await rentalDb.getRentalItemById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Rental item not found' });
      return res.json(item);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/public/rental/availability', async (req: Request, res: Response) => {
    try {
      const { itemId, startAt, endAt, quantity = '1' } = req.query;
      if (!itemId || !startAt || !endAt) {
        return res.status(400).json({ error: 'itemId, startAt, and endAt are required query parameters.' });
      }
      const avail = await rentalDb.checkAvailability(
        String(itemId),
        String(startAt),
        String(endAt),
        Number(quantity)
      );
      return res.json(avail);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/public/rental/rules', async (req: Request, res: Response) => {
    try {
      const rules = await rentalDb.getRentalRules();
      return res.json(rules);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/public/rental/settings', async (req: Request, res: Response) => {
    try {
      const settings = await rentalDb.getRentalSettings();
      // Mask internal default account details if necessary, but return pickup instructions
      return res.json({
        publicRentalEnabled: settings.publicRentalEnabled,
        pickupLocation: settings.pickupLocation,
        pickupContactNumber: settings.pickupContactNumber,
        defaultGracePeriodHours: settings.defaultGracePeriodHours,
        defaultLateFeePer24Hours: settings.defaultLateFeePer24Hours,
        defaultMinimumRentalDays: settings.defaultMinimumRentalDays,
        defaultMaximumRentalDays: settings.defaultMaximumRentalDays,
        allowCustomerCancellation: settings.allowCustomerCancellation,
        cancellationCutoffHours: settings.cancellationCutoffHours
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // =============================================================
  // CUSTOMER AUTH & PORTAL ROUTES
  // =============================================================

  // Dev test login for iframe previews where third-party popups may be blocked
  app.post('/api/customer/dev-auth', async (req: Request, res: Response) => {
    try {
      const { email = 'customer.demo@arc.mv', name = 'Demo Customer' } = req.body;
      const uid = `cust_${crypto.createHash('md5').update(email).digest('hex').substring(0, 10)}`;
      const token = `dev_cust___${uid}__${email}__${name}`;
      const customer = await rentalDb.saveCustomerProfile(uid, {
        googleEmail: email,
        googleName: name,
        fullName: name,
        phoneNumber: '7788990',
        idCardNumber: 'A123456',
        address: 'H. Oceanic Breeze, 3rd Floor',
        island: 'Male',
        rulesAcceptedVersion: 'v1.0',
        rulesAcceptedAt: new Date().toISOString()
      });
      return res.json({ token, customer });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customer/profile', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const profile = await rentalDb.getCustomerByUid(customerAuth.uid);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/profile', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const profile = await rentalDb.saveCustomerProfile(customerAuth.uid, {
        ...req.body,
        googleEmail: customerAuth.email,
        googleName: customerAuth.name
      });
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/customer/profile', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const profile = await rentalDb.saveCustomerProfile(customerAuth.uid, req.body);
      return res.json(profile);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/upload', authenticateCustomer, async (req: Request, res: Response) => {
    return handleFileUpload(req, res, 'rental/payments');
  });

  app.post('/api/customer/rental/requests', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const {
        itemId,
        customerName,
        customerPhone,
        customerIdCard,
        requestedQuantity = 1,
        requestedStartAt,
        requestedEndAt,
        rulesVersionAccepted
      } = req.body;

      if (!itemId || !customerName || !customerPhone || !customerIdCard || !requestedStartAt || !requestedEndAt) {
        return res.status(400).json({ error: 'All booking fields are required.' });
      }

      const request = await rentalDb.createRentalRequest({
        customerUid: customerAuth.uid,
        customerEmail: customerAuth.email,
        customerName,
        customerPhone,
        customerIdCard,
        itemId,
        requestedQuantity: Number(requestedQuantity),
        requestedStartAt,
        requestedEndAt,
        rulesVersionAccepted
      });

      realtimeBroadcaster.broadcast('rental_requests' as any, 'create', request);
      return res.status(201).json(request);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/customer/rental/requests', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const requests = await rentalDb.getRentalRequests({ customerUid: customerAuth.uid });
      return res.json(requests);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customer/rental/requests/:id', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const request = await rentalDb.getRentalRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized to view this request.' });
      }
      return res.json(request);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/rental/requests/:id/cancel', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const request = await rentalDb.getRentalRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized to cancel this request.' });
      }
      const updated = await rentalDb.cancelRentalRequest(req.params.id, customerAuth.uid, req.body.reason);
      realtimeBroadcaster.broadcast('rental_requests' as any, 'update', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/customer/rental/bills/:id', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const bill = await rentalDb.getRentalBillById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      if (bill.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized to view this bill.' });
      }
      return res.json(bill);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/rental/bills/:id/payment', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const bill = await rentalDb.getRentalBillById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      if (bill.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized to pay this bill.' });
      }

      const { amount, transferReference, slipUrl, method = 'bank_transfer' } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'A valid payment amount is required.' });
      }
      if (method === 'bank_transfer' && !transferReference && !slipUrl) {
        return res.status(400).json({ error: 'Please provide the bank transfer reference or upload the transaction slip.' });
      }

      const payment = await rentalDb.submitRentalPayment({
        billId: bill.id,
        requestId: bill.requestId,
        customerUid: customerAuth.uid,
        amount: Number(amount),
        method,
        transferReference,
        slipUrl
      });

      realtimeBroadcaster.broadcast('rental_payments' as any, 'create', payment);
      return res.status(201).json(payment);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/customer/rental/receipts/:id', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const receipt = await rentalDb.getRentalReceiptById(req.params.id);
      if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
      if (receipt.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
      return res.json(receipt);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customer/rental/handovers/:id', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const handover = await rentalDb.getRentalHandoverById(req.params.id);
      if (!handover) return res.status(404).json({ error: 'Handover record not found' });
      if (handover.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
      return res.json(handover);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customer/rental/returns/:id', authenticateCustomer, async (req: Request, res: Response) => {
    try {
      const customerAuth = (req as any).customer;
      const ret = await rentalDb.getRentalReturnById(req.params.id);
      if (!ret) return res.status(404).json({ error: 'Return record not found' });
      if (ret.customerUid !== customerAuth.uid) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
      return res.json(ret);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // =============================================================
  // PORTAL STAFF / ADMIN ROUTES (Protected by RBAC)
  // =============================================================

  // Rental Dashboard & Stats
  const getStatsHandler = async (req: Request, res: Response) => {
    try {
      const stats = await rentalDb.getRentalDashboardStats();
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };
  app.get('/api/portal/rental/dashboard', authenticateSession, requirePermission('rental_service', 'canView'), getStatsHandler);
  app.get('/api/portal/rental/stats', authenticateSession, requirePermission('rental_service', 'canView'), getStatsHandler);

  // Items CRUD
  app.get('/api/portal/rental/items', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const items = await rentalDb.getRentalItems(true);
      return res.json(items);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/items', authenticateSession, requirePermission('rental_service', 'canCreate'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const item = await rentalDb.createRentalItem(req.body, user.id);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'CREATE_RENTAL_ITEM',
        module: 'rental_service' as any,
        recordId: item.id,
        notes: `Created rental item: ${item.name} (${item.itemCode})`
      });
      return res.status(201).json(item);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/portal/rental/items/:id', authenticateSession, requirePermission('rental_service', 'canEdit'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const updated = await rentalDb.updateRentalItem(req.params.id, req.body, user.id);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'UPDATE_RENTAL_ITEM',
        module: 'rental_service' as any,
        recordId: req.params.id,
        notes: `Updated rental item: ${updated.name}`
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/portal/rental/items/:id', authenticateSession, requirePermission('rental_service', 'canDelete'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      await rentalDb.deleteRentalItem(req.params.id);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'DELETE_RENTAL_ITEM',
        module: 'rental_service' as any,
        recordId: req.params.id
      });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Serialized Units CRUD
  app.get('/api/portal/rental/units', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const units = await rentalDb.getRentalUnits(req.query.itemId as string | undefined);
      return res.json(units);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/units', authenticateSession, requirePermission('rental_service', 'canCreate'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const unit = await rentalDb.createRentalUnit(req.body, user.id, user.fullName);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'CREATE_RENTAL_UNIT',
        module: 'rental_service' as any,
        recordId: unit.id,
        notes: `Created inventory unit ${unit.assetTag} for item ${unit.itemName}`
      });
      return res.status(201).json(unit);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/portal/rental/units/:id', authenticateSession, requirePermission('rental_service', 'canEdit'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const updated = await rentalDb.updateRentalUnit(
        req.params.id,
        req.body,
        user.id,
        user.fullName,
        req.body.reason || 'Unit details updated'
      );
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Item Units Sub-resource
  app.get('/api/portal/rental/items/:itemId/units', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const units = await rentalDb.getRentalUnits(req.params.itemId);
      return res.json(units);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/items/:itemId/units', authenticateSession, requirePermission('rental_service', 'canCreate'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const unit = await rentalDb.createRentalUnit({ ...req.body, itemId: req.params.itemId }, user.id, user.fullName);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'CREATE_RENTAL_UNIT',
        module: 'rental_service' as any,
        recordId: unit.id,
        notes: `Created inventory unit ${unit.assetTag} for item ${unit.itemName}`
      });
      return res.status(201).json(unit);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Unit status update
  app.put('/api/portal/rental/units/:id/status', authenticateSession, requirePermission('rental_service', 'canEdit'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { newStatus, newCondition, reason } = req.body;
      const updated = await rentalDb.updateRentalUnit(
        req.params.id,
        { status: newStatus, condition: newCondition },
        user.id,
        user.fullName,
        reason || 'Unit status updated'
      );
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Stock Movements & Adjustments
  const getMovementsHandler = async (req: Request, res: Response) => {
    try {
      const movements = await rentalDb.getStockMovements({
        itemId: req.query.itemId as string | undefined,
        unitId: req.query.unitId as string | undefined,
        requestId: req.query.requestId as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : 100
      });
      return res.json(movements);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };
  app.get('/api/portal/rental/stock-movements', authenticateSession, requirePermission('rental_service', 'canView'), getMovementsHandler);
  app.get('/api/portal/rental/movements', authenticateSession, requirePermission('rental_service', 'canView'), getMovementsHandler);

  app.post('/api/portal/rental/units/adjust-stock', authenticateSession, requirePermission('rental_service', 'canEdit'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { unitId, newStatus, newCondition, reason, notes } = req.body;
      if (!unitId || !reason) {
        return res.status(400).json({ error: 'unitId and mandatory reason are required for manual stock adjustment.' });
      }
      const updated = await rentalDb.updateRentalUnit(
        unitId,
        { status: newStatus, condition: newCondition, notes },
        user.id,
        user.fullName,
        reason
      );
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'MANUAL_STOCK_ADJUSTMENT',
        module: 'rental_service' as any,
        recordId: unitId,
        reason
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Requests Management
  app.get('/api/portal/rental/requests', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const requests = await rentalDb.getRentalRequests({
        status: req.query.status as string | undefined,
        customerUid: req.query.customerUid as string | undefined
      });
      return res.json(requests);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portal/rental/requests/:id', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const request = await rentalDb.getRentalRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      return res.json(request);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/requests/:id/approve', authenticateSession, requirePermission('rental_service', 'canApprove'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const result = await rentalDb.approveRentalRequest(req.params.id, user.id, user.fullName, req.body.notes);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'APPROVE_RENTAL_REQUEST',
        module: 'rental_service' as any,
        recordId: req.params.id,
        notes: `Approved request #${result.request.requestNumber}, allocated units: ${result.request.assignedUnitIds.join(', ')}`
      });
      realtimeBroadcaster.broadcast('rental_requests' as any, 'update', result.request);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/requests/:id/reject', authenticateSession, requirePermission('rental_service', 'canApprove'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ error: 'A rejection reason is required.' });

      const updated = await rentalDb.rejectRentalRequest(req.params.id, user.id, user.fullName, reason);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'REJECT_RENTAL_REQUEST',
        module: 'rental_service' as any,
        recordId: req.params.id,
        reason
      });
      realtimeBroadcaster.broadcast('rental_requests' as any, 'update', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/requests/:id/cancel', authenticateSession, requirePermission('rental_service', 'canEdit'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const updated = await rentalDb.cancelRentalRequest(req.params.id, user.id, req.body.reason || 'Cancelled by staff');
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'CANCEL_RENTAL_REQUEST',
        module: 'rental_service' as any,
        recordId: req.params.id
      });
      realtimeBroadcaster.broadcast('rental_requests' as any, 'update', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Bills Management
  app.get('/api/portal/rental/bills', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const bills = await rentalDb.getRentalBills({
        requestId: req.query.requestId as string | undefined,
        customerUid: req.query.customerUid as string | undefined,
        status: req.query.status as string | undefined
      });
      return res.json(bills);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/portal/rental/bills/:id', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const bill = await rentalDb.getRentalBillById(req.params.id);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      return res.json(bill);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Payments Management (Approval syncs atomically with Budget & Finance)
  app.get('/api/portal/rental/payments', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const payments = await rentalDb.getRentalPayments({
        requestId: req.query.requestId as string | undefined,
        status: req.query.status as string | undefined
      });
      return res.json(payments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/payments/:id/approve', authenticateSession, requirePermission('rental_service', 'canApprove'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const result = await rentalDb.approveRentalPayment(req.params.id, user.id, user.fullName);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'APPROVE_RENTAL_PAYMENT',
        module: 'rental_service' as any,
        recordId: req.params.id,
        notes: `Approved payment #${result.payment.paymentNumber} of MVR ${result.payment.amount}. Created Income record & receipt #${result.receipt.receiptNumber}`
      });
      realtimeBroadcaster.broadcast('rental_payments' as any, 'update', result.payment);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/payments/:id/reject', authenticateSession, requirePermission('rental_service', 'canApprove'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ error: 'A rejection reason is required.' });

      const updated = await rentalDb.rejectRentalPayment(req.params.id, user.id, user.fullName, reason);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'REJECT_RENTAL_PAYMENT',
        module: 'rental_service' as any,
        recordId: req.params.id,
        reason
      });
      realtimeBroadcaster.broadcast('rental_payments' as any, 'update', updated);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Handover Execution
  const executeHandoverHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const requestId = req.params.id || req.body.requestId;
      const request = await rentalDb.getRentalRequestById(requestId);
      if (!request) return res.status(404).json({ error: 'Rental request not found' });

      const customerSignatureUrl = req.body.customerSignatureUrl;
      if (!requestId || !customerSignatureUrl) {
        return res.status(400).json({ error: 'requestId and customerSignatureUrl are required.' });
      }

      // Format condition checks if called from either tab structure
      const conditionChecks = Array.isArray(req.body.conditionChecks) && req.body.conditionChecks.length > 0
        ? req.body.conditionChecks
        : (request.assignedUnitIds || []).map((uId: string) => ({
            unitId: uId,
            assetTag: uId,
            condition: 'good' as any,
            checklist: req.body.checklist || {},
            notes: req.body.existingDefectsNotes || ''
          }));

      const handover = await rentalDb.executeHandover({
        requestId,
        conditionChecks,
        accessories: req.body.accessories || [],
        conditionPhotos: req.body.conditionPhotos || [],
        notes: req.body.existingDefectsNotes || req.body.notes || '',
        customerSignatureUrl,
        handedOverBy: user.id,
        handedOverByName: user.fullName,
        staffSignatureName: req.body.staffSignatureName || user.fullName
      });

      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'EXECUTE_RENTAL_HANDOVER',
        module: 'rental_service' as any,
        recordId: handover.id,
        notes: `Handover #${handover.handoverNumber} completed with customer signature for request ${requestId}`
      });

      return res.status(201).json(handover);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  };

  app.post('/api/portal/rental/handover', authenticateSession, requirePermission('rental_service', 'canEdit'), executeHandoverHandler);
  app.post('/api/portal/rental/requests/:id/handover', authenticateSession, requirePermission('rental_service', 'canEdit'), executeHandoverHandler);

  // Return Inspection & Finalization
  const returnInspectionHandler = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const requestId = req.params.id || req.body.requestId;
      const {
        actualReturnAt = new Date().toISOString(),
        inspectionNotes,
        unitOutcomes,
        unitInspections,
        additionalCharges,
        damageCharges,
        missingItemCharges,
        otherCharges,
        isChargesWaived,
        waiverReason,
        waiveCharges,
        waiveReason
      } = req.body;

      if (!requestId) {
        return res.status(400).json({ error: 'requestId is required.' });
      }

      const formattedInspections = Array.isArray(unitInspections) && unitInspections.length > 0
        ? unitInspections
        : (unitOutcomes || []).map((u: any) => ({
            unitId: u.unitId,
            assetTag: u.unitId,
            conditionBefore: 'good' as any,
            conditionAfter: u.condition || 'good',
            outcome: u.status === 'maintenance' ? 'send_to_maintenance' : u.status === 'damaged' ? 'mark_damaged' : 'return_to_available',
            notes: u.notes || inspectionNotes || ''
          }));

      const result = await rentalDb.submitReturnInspection({
        requestId,
        actualReturnAt,
        unitInspections: formattedInspections,
        damageCharges: damageCharges || additionalCharges?.filter((c: any) => c.type === 'damage') || [],
        missingItemCharges: missingItemCharges || additionalCharges?.filter((c: any) => c.type === 'missing') || [],
        otherCharges: otherCharges || additionalCharges?.filter((c: any) => c.type === 'late' || c.type === 'other') || additionalCharges || [],
        inspectedBy: user.id,
        inspectedByName: user.fullName,
        waiveCharges: Boolean(isChargesWaived ?? waiveCharges),
        waiveReason: waiverReason || waiveReason
      });

      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'SUBMIT_RETURN_INSPECTION',
        module: 'rental_service' as any,
        recordId: result.returnRecord.id,
        notes: `Return #${result.returnRecord.returnNumber} inspected. Additional charges: MVR ${result.returnRecord.totalAdditionalCharge}`
      });

      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  };

  app.post('/api/portal/rental/return-inspection', authenticateSession, requirePermission('rental_service', 'canEdit'), returnInspectionHandler);
  app.post('/api/portal/rental/requests/:id/return', authenticateSession, requirePermission('rental_service', 'canEdit'), returnInspectionHandler);

  app.post('/api/portal/rental/return/:id/finalize', authenticateSession, requirePermission('rental_service', 'canApprove'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const finalized = await rentalDb.finalizeReturnAfterPayment(req.params.id, user.id, user.fullName);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'FINALIZE_RENTAL_RETURN',
        module: 'rental_service' as any,
        recordId: req.params.id,
        notes: `Return #${finalized.returnNumber} finalized after payment settled.`
      });
      return res.json(finalized);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Customers Directory
  app.get('/api/portal/rental/customers', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const customers = await rentalDb.getAllCustomers();
      return res.json(customers);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Settings & Rules Management
  app.get('/api/portal/rental/settings', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const settings = await rentalDb.getRentalSettings();
      return res.json(settings);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/portal/rental/settings', authenticateSession, requirePermission('rental_service', 'canManageSettings' as any), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const updated = await rentalDb.updateRentalSettings(req.body, user.id);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'UPDATE_RENTAL_SETTINGS',
        module: 'rental_service' as any
      });
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/portal/rental/rules', authenticateSession, requirePermission('rental_service', 'canView'), async (req: Request, res: Response) => {
    try {
      const rules = await rentalDb.getRentalRules();
      return res.json(rules);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/portal/rental/rules', authenticateSession, requirePermission('rental_service', 'canManageSettings' as any), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const saved = await rentalDb.saveRentalRule(req.body, user.id);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'CREATE_RENTAL_RULE_VERSION',
        module: 'rental_service' as any,
        recordId: saved.id
      });
      return res.status(201).json(saved);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/portal/rental/rules/:id', authenticateSession, requirePermission('rental_service', 'canManageSettings' as any), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const saved = await rentalDb.saveRentalRule({ ...req.body, id: req.params.id }, user.id);
      await db.logAudit({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        action: 'UPDATE_RENTAL_RULE_VERSION',
        module: 'rental_service' as any,
        recordId: saved.id
      });
      return res.json(saved);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });
}
