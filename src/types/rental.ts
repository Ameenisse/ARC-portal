/**
 * ARC Rental Service & Inventory Types
 */

export type RentalUnitCondition = 'excellent' | 'good' | 'fair' | 'minor_damage' | 'damaged';

export type RentalUnitStatus = 
  | 'available' 
  | 'reserved' 
  | 'rented' 
  | 'returned_pending_inspection' 
  | 'maintenance' 
  | 'damaged' 
  | 'lost' 
  | 'retired';

export type StockMovementType = 
  | 'opening_stock' 
  | 'stock_added' 
  | 'adjustment' 
  | 'reserved' 
  | 'reservation_released' 
  | 'handover' 
  | 'return_received' 
  | 'return_completed' 
  | 'maintenance_out' 
  | 'maintenance_in' 
  | 'damaged' 
  | 'lost' 
  | 'retired';

export type RentalRequestStatus = 
  | 'requested' 
  | 'approved_payment_pending' 
  | 'payment_submitted' 
  | 'payment_verified' 
  | 'ready_for_collection' 
  | 'handed_over' 
  | 'active_rental' 
  | 'return_inspection_pending' 
  | 'additional_payment_required' 
  | 'additional_payment_submitted' 
  | 'completed' 
  | 'rejected' 
  | 'cancelled';

export type RentalBillType = 'initial_rental' | 'return_charges';
export type RentalBillStatus = 'issued' | 'payment_submitted' | 'paid' | 'cancelled' | 'void';

export type RentalPaymentType = 'rental_fee' | 'late_fine' | 'late_fee' | 'damage_charge' | 'return_charge' | 'other_return_charge';
export type RentalPaymentStatus = 'submitted' | 'approved' | 'rejected' | 'verified';

export interface AdditionalChargeItem {
  description: string;
  amount: number;
  type?: string;
  unitId?: string;
}

export interface RentalItem {
  id: string;
  itemCode: string; // e.g. ARC-RNT-001
  name: string;
  nameDh?: string;
  category?: string;
  shortDescription: string;
  description: string;
  features: string[];
  coverImageUrl: string;
  galleryImages: string[];
  pricePer24Hours: number;
  depositAmount?: number;
  lateFeePer24Hours: number;
  useCustomLateFee: boolean;
  minimumRentalDays: number;
  maximumRentalDays: number;
  publicActive: boolean;
  requestEnabled: boolean;
  totalStock: number;
  status: 'active' | 'inactive' | 'archived';
  pickupInstructions?: string;
  conditionChecklistTemplate: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface RentalUnit {
  id: string;
  itemId: string;
  unitNumber?: string;
  itemCode?: string;
  itemName?: string;
  assetTag: string; // e.g. TENT-001
  serialNumber?: string;
  barcode?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  condition: RentalUnitCondition;
  status: RentalUnitStatus;
  currentRequestId?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalStockMovement {
  id: string;
  itemId: string;
  itemName?: string;
  unitId?: string;
  unitNumber?: string;
  assetTag?: string;
  requestId?: string;
  movementType: StockMovementType;
  previousStatus: string;
  newStatus: string;
  conditionBefore?: string;
  conditionAfter?: string;
  quantity: number;
  reason: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface RentalCustomer {
  uid: string; // Firebase Auth UID
  googleEmail: string;
  googleName?: string;
  googlePhotoUrl?: string;
  fullName: string;
  phoneNumber: string;
  idCardNumber: string;
  address: string;
  island: string;
  status: 'active' | 'suspended';
  rulesAcceptedVersion?: string;
  rulesAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalReservation {
  id: string;
  requestId: string;
  itemId: string;
  unitIds: string[];
  startAt: string;
  endAt: string;
  quantity: number;
  status: 'active' | 'released' | 'cancelled' | 'completed';
  createdAt: string;
  releasedAt?: string;
}

export interface RentalRequest {
  id: string;
  requestNumber: string; // ARC-RNT-00001
  customerUid: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerIdCard: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requestedQuantity: number;
  requestedStartAt: string;
  requestedEndAt: string;
  rentalDays: number;
  pricePer24HoursSnapshot: number;
  estimatedRentalAmount: number;
  status: RentalRequestStatus;
  providerDecision?: 'approved' | 'rejected';
  approvedQuantity?: number;
  approvedStartAt?: string;
  approvedEndAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  billId?: string;
  paymentStatus?: 'unpaid' | 'payment_submitted' | 'paid';
  assignedUnitIds: string[];
  handoverId?: string;
  returnId?: string;
  rulesVersionAccepted?: string;
  rulesAcceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalBillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface RentalBill {
  id: string;
  billNumber: string; // ARC-RB-2026-0001
  requestId: string;
  customerUid: string;
  customerName?: string;
  customerPhone?: string;
  billType: RentalBillType;
  lineItems: RentalBillLineItem[];
  subtotal: number;
  discount: number;
  lateFine: number;
  damageCharge: number;
  otherCharge: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: RentalBillStatus;
  paymentStatus?: string;
  paymentAccountId: string;
  paymentAccountSnapshot: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
  };
  issuedAt: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalPayment {
  id: string;
  paymentNumber: string; // ARC-RP-2026-0001
  requestId: string;
  billId: string;
  customerUid: string;
  customerName?: string;
  customerPhone?: string;
  paymentType: RentalPaymentType;
  amount: number;
  method: 'bank_transfer' | 'cash' | 'other';
  bankAccountId: string;
  bankAccountSnapshot: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
  };
  transferReference?: string;
  slipStoragePath?: string;
  slipUrl?: string;
  status: RentalPaymentStatus;
  submittedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  budgetIncomeId?: string;
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalReceipt {
  id: string;
  receiptNumber: string; // ARC-RR-2026-0001
  paymentId: string;
  billId: string;
  requestId: string;
  customerUid: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  receivedAt: string;
  receivedBy: string;
  paidStatus: 'PAID';
  createdAt: string;
}

export interface RentalHandoverUnitCheck {
  unitId: string;
  assetTag: string;
  condition: RentalUnitCondition;
  checklist: Record<string, 'Good' | 'Existing Damage' | 'Missing' | 'Not Applicable'>;
  notes?: string;
}

export interface RentalHandover {
  id: string;
  handoverNumber: string; // ARC-RH-2026-0001
  requestId: string;
  customerUid: string;
  customerName: string;
  itemId: string;
  unitIds: string[];
  handoverDateTime: string;
  dueDateTime: string;
  conditionChecks: RentalHandoverUnitCheck[];
  accessories: string[];
  notes?: string;
  conditionPhotos: string[];
  handedOverBy: string;
  handedOverByName: string;
  customerSignatureUrl: string;
  customerSignedAt: string;
  staffSignatureName: string;
  rulesVersion: string;
  status: 'finalized';
  createdAt: string;
}

export interface RentalReturnUnitInspection {
  unitId: string;
  assetTag: string;
  handoverCondition: string;
  returnCondition: RentalUnitCondition;
  finding: 'No Change' | 'New Damage' | 'Missing Accessory' | 'Major Damage' | 'Lost Item';
  notes?: string;
  chargeAmount?: number;
  photoUrl?: string;
  actionOutcome: 'available' | 'maintenance' | 'damaged' | 'lost';
}

export interface RentalReturn {
  id: string;
  returnNumber: string; // ARC-RT-2026-0001
  requestId: string;
  handoverId: string;
  customerUid: string;
  actualReturnAt: string;
  inspectedBy: string;
  inspectedByName: string;
  unitInspections: RentalReturnUnitInspection[];
  lateHours: number;
  lateBillingBlocks: number;
  lateFine: number;
  damageCharges: Array<{ description: string; amount: number; unitId?: string }>;
  missingItemCharges: Array<{ description: string; amount: number }>;
  otherCharges: Array<{ description: string; amount: number }>;
  totalAdditionalCharge: number;
  additionalBillId?: string;
  additionalPaymentStatus?: 'none_required' | 'unpaid' | 'payment_submitted' | 'paid' | 'waived';
  status: 'inspection_completed' | 'finalized';
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalRule {
  id: string;
  version: string;
  titleEnglish: string;
  titleDhivehi: string;
  contentEnglish: string;
  contentDhivehi: string;
  pickupLocation: string;
  pickupInstructions: string;
  minimumRentalDays: number;
  maximumRentalDays: number;
  gracePeriodHours: number;
  defaultLateFeePer24Hours: number;
  cancellationPolicy: string;
  damagePolicy: string;
  lostItemPolicy: string;
  paymentPolicy: string;
  handoverPolicy: string;
  returnPolicy: string;
  status: 'active' | 'archived';
  effectiveDate: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalSettings {
  id: string;
  publicRentalEnabled: boolean;
  defaultPaymentAccountId: string;
  pickupLocation: string;
  pickupContactNumber: string;
  defaultGracePeriodHours: number;
  defaultLateFeePer24Hours: number;
  minimumAdvanceBookingHours: number;
  defaultMinimumRentalDays: number;
  defaultMaximumRentalDays: number;
  allowCustomerCancellation: boolean;
  cancellationCutoffHours: number;
  requireIdCardNumber: boolean;
  bmlBankName?: string;
  bmlAccountName?: string;
  bmlAccountNumber?: string;
  handoverLocation?: string;
  contactHotline?: string;
  gracePeriodHours?: number;
  termsAndConditionsText?: string;
  termsAndConditionsTextDh?: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface RentalDashboardStats {
  activeRentalItems: number;
  totalInventoryUnits: number;
  availableNow: number;
  reserved: number;
  currentlyRented: number;
  maintenanceOrDamaged: number;
  pendingRequests: number;
  pendingPayments: number;
  readyForHandover: number;
  dueToday: number;
  overdueRentals: number;
  returnInspectionsPending: number;
  rentalIncomeThisMonth: number;

  // Metric aliases
  totalItems?: number;
  totalUnits?: number;
  availableUnits?: number;
  rentedUnits?: number;
  activeRentals?: number;
  maintenanceUnits?: number;
  damagedUnits?: number;
  monthlyRevenue?: number;
  totalRevenue?: number;
  pendingPaymentRequests?: number;
  overdueReturns?: number;
}

export type RentalStats = RentalDashboardStats;
