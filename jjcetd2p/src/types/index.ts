export type Role = "ADMIN" | "D2P_INCHARGE" | "LAB_STAFF" | "STUDENT";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ISSUED";
export type IssueStatus = "ACTIVE" | "PARTIALLY_RETURNED" | "RETURNED";
export type StockMovementType = "RECEIPT" | "ISSUE" | "RETURN" | "ADJUSTMENT";
export type NotificationType =
  | "REQUEST_SUBMITTED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "COMPONENT_ISSUED"
  | "RETURN_DUE_SOON"
  | "COMPONENT_OVERDUE"
  | "REQUEST_CANCELLED"
  | "LOW_STOCK_ALERT";

export interface User {
  id: string;
  email: string;
  fullName: string;
  rollNumber?: string | null;
  department?: string | null;
  phone?: string | null;
  isActive: boolean;
  roles: Role[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Component {
  id: string;
  code: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string | null;
  description?: string | null;
  unit: string;
  totalQuantity: number;
  availableQuantity: number;
  issuedQuantity: number;
  storageLocation?: string | null;
  minStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowingRequest {
  id: string;
  reference: string;
  studentId: string;
  studentName?: string;
  componentId: string;
  componentName?: string;
  componentCode?: string;
  quantity: number;
  purpose?: string | null;
  requestedReturnDate: string;
  status: RequestStatus;
  decisionById?: string | null;
  decisionByName?: string | null;
  decisionAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueRecord {
  id: string;
  reference: string;
  requestId: string;
  studentId: string;
  studentName?: string;
  componentId: string;
  componentName?: string;
  componentCode?: string;
  quantityIssued: number;
  issuedById: string;
  issuedByName?: string;
  issuedAt: string;
  expectedReturnDate: string;
  status: IssueStatus;
  totalReturned: number;
  outstanding: number;
}

export interface ReturnRecord {
  id: string;
  reference: string;
  issueId: string;
  quantity: number;
  returnedAt: string;
  receivedById: string;
  receivedByName?: string;
  notes?: string | null;
}

export interface StockMovement {
  id: string;
  reference: string;
  componentId: string;
  componentName?: string;
  type: StockMovementType;
  quantityDelta: number;
  reason: string;
  performedById: string;
  performedByName?: string;
  relatedIssueId?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: any;
  after?: any;
  correlationId?: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalComponents: number;
  totalAvailable: number;
  totalIssued: number;
  pendingRequests: number;
  approvedAwaitingIssue: number;
  activeTransactions: number;
  overdueTransactions: number;
  lowStockComponents: number;
  recentActivity: any[];
}
