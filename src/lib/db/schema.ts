import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────
export const roleEnum = pgEnum("role", [
  "ADMIN",
  "D2P_INCHARGE",
  "LAB_STAFF",
  "STUDENT",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "ISSUED",
]);

export const issueStatusEnum = pgEnum("issue_status", [
  "ACTIVE",
  "PARTIALLY_RETURNED",
  "RETURNED",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "RECEIPT",
  "ISSUE",
  "RETURN",
  "ADJUSTMENT",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "REQUEST_SUBMITTED",
  "REQUEST_APPROVED",
  "REQUEST_REJECTED",
  "COMPONENT_ISSUED",
  "RETURN_DUE_SOON",
  "COMPONENT_OVERDUE",
  "REQUEST_CANCELLED",
  "LOW_STOCK_ALERT",
]);

// ─── Profiles ────────────────────────────────────────────
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    rollNumber: varchar("roll_number", { length: 50 }),
    department: varchar("department", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    passwordHash: varchar("password_hash", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("profiles_auth_user_id_idx").on(t.authUserId)]
);

// ─── User Roles ──────────────────────────────────────────
export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("user_roles_user_role_idx").on(t.userId, t.role)]
);

// ─── Categories ──────────────────────────────────────────
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Components ──────────────────────────────────────────
export const components = pgTable(
  "components",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    unit: varchar("unit", { length: 30 }).notNull().default("pcs"),
    totalQuantity: integer("total_quantity").notNull().default(0),
    availableQuantity: integer("available_quantity").notNull().default(0),
    issuedQuantity: integer("issued_quantity").notNull().default(0),
    storageLocation: varchar("storage_location", { length: 100 }),
    imageUrl: varchar("image_url", { length: 500 }),
    minStockThreshold: integer("min_stock_threshold").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("components_category_id_idx").on(t.categoryId),
    index("components_code_idx").on(t.code),
    index("components_name_idx").on(t.name),
  ]
);

// ─── Borrowing Requests ──────────────────────────────────
export const borrowingRequests = pgTable(
  "borrowing_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    purpose: text("purpose"),
    requestedReturnDate: timestamp("requested_return_date", {
      withTimezone: true,
    }).notNull(),
    status: requestStatusEnum("status").notNull().default("PENDING"),
    decisionById: uuid("decision_by_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    decisionAt: timestamp("decision_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("br_student_id_idx").on(t.studentId),
    index("br_component_id_idx").on(t.componentId),
    index("br_status_idx").on(t.status),
    index("br_created_at_idx").on(t.createdAt),
  ]
);

// ─── Issue Records ───────────────────────────────────────
export const issueRecords = pgTable(
  "issue_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    requestId: uuid("request_id")
      .notNull()
      .unique()
      .references(() => borrowingRequests.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    quantityIssued: integer("quantity_issued").notNull(),
    issuedById: uuid("issued_by_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expectedReturnDate: timestamp("expected_return_date", {
      withTimezone: true,
    }).notNull(),
    status: issueStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ir_student_id_idx").on(t.studentId),
    index("ir_component_id_idx").on(t.componentId),
    index("ir_status_idx").on(t.status),
    index("ir_expected_return_idx").on(t.expectedReturnDate),
  ]
);

// ─── Return Records ──────────────────────────────────────
export const returnRecords = pgTable(
  "return_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issueRecords.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    receivedById: uuid("received_by_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("rr_issue_id_idx").on(t.issueId)]
);

// ─── Stock Movements (append-only) ───────────────────────
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => components.id, { onDelete: "restrict" }),
    type: stockMovementTypeEnum("type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    reason: text("reason").notNull(),
    performedById: uuid("performed_by_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    relatedIssueId: uuid("related_issue_id").references(
      () => issueRecords.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("sm_component_id_idx").on(t.componentId),
    index("sm_type_idx").on(t.type),
    index("sm_created_at_idx").on(t.createdAt),
  ]
);

// ─── Notifications ───────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    relatedEntityType: varchar("related_entity_type", { length: 50 }),
    relatedEntityId: uuid("related_entity_id"),
    isRead: boolean("is_read").notNull().default(false),
    dedupeKey: varchar("dedupe_key", { length: 255 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notif_recipient_idx").on(t.recipientId),
    index("notif_is_read_idx").on(t.isRead),
    index("notif_created_at_idx").on(t.createdAt),
  ]
);

// ─── Audit Logs (append-only) ────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before_state"),
    after: jsonb("after_state"),
    correlationId: varchar("correlation_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorId),
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_created_at_idx").on(t.createdAt),
  ]
);

// ─── App Settings ────────────────────────────────────────
export const appSettings = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Relations ───────────────────────────────────────────
export const profilesRelations = relations(profiles, ({ many }) => ({
  roles: many(userRoles),
  notifications: many(notifications),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(profiles, { fields: [userRoles.userId], references: [profiles.id] }),
}));

export const componentsRelations = relations(components, ({ one, many }) => ({
  category: one(categories, {
    fields: [components.categoryId],
    references: [categories.id],
  }),
  stockMovements: many(stockMovements),
}));

export const borrowingRequestsRelations = relations(
  borrowingRequests,
  ({ one }) => ({
    student: one(profiles, {
      fields: [borrowingRequests.studentId],
      references: [profiles.id],
    }),
    component: one(components, {
      fields: [borrowingRequests.componentId],
      references: [components.id],
    }),
    decisionBy: one(profiles, {
      fields: [borrowingRequests.decisionById],
      references: [profiles.id],
    }),
  })
);

export const issueRecordsRelations = relations(issueRecords, ({ one, many }) => ({
  request: one(borrowingRequests, {
    fields: [issueRecords.requestId],
    references: [borrowingRequests.id],
  }),
  student: one(profiles, {
    fields: [issueRecords.studentId],
    references: [profiles.id],
  }),
  component: one(components, {
    fields: [issueRecords.componentId],
    references: [components.id],
  }),
  issuedBy: one(profiles, {
    fields: [issueRecords.issuedById],
    references: [profiles.id],
  }),
  returns: many(returnRecords),
}));
