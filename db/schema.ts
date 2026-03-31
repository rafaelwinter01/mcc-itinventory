import {
  boolean,
  date,
  datetime,
  decimal,
  int,
  json,
  mysqlTable,
  primaryKey,
  serial,
  text,
  uniqueIndex,
  varchar,
  mysqlEnum, 
  unique
} from "drizzle-orm/mysql-core";
import { relations, sql } from "drizzle-orm";

export const deviceType = mysqlTable(
  "device_type",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex("device_type_name_idx").on(table.name),
  })
);

export const status = mysqlTable(
  "status",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 50 }),
  },
  (table) => ({
    nameIdx: uniqueIndex("status_name_idx").on(table.name),
  })
);

export const department = mysqlTable("department", {
  id: serial("id").primaryKey(),
  name: text("name"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const user = mysqlTable(
  "user",
  {
    id: serial("id").primaryKey(),
    firstname: text("firstname").notNull(),
    lastname: text("lastname").notNull(),
    email: text("email"),
    departmentId: int("department_id").references(() => department.id),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_email_idx").on(table.email),
  })
);

export const location = mysqlTable("location", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  address: text("address"),
  managerId: int("manager_id"),
});

export const makeModel = mysqlTable("make_model", {
  id: serial("id").primaryKey(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  deviceTypeId: int("device_type_id").references(() => deviceType.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  description: text("description"),
});

export const device = mysqlTable("device", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  deviceTypeId: int("device_type_id").notNull(),
  locationId: int("location_id"),
  statusId: int("status_id"),
  makeModelId: int("make_model_id"),
  serialNumber: varchar("serial_number", { length: 150 }),
  productNumber: varchar("product_number", { length: 150 }),
  macAddress: varchar("mac_address", { length: 50 }),
  warrantyStart: date("warranty_start"),
  warrantyEnd: date("warranty_end"),
  warrantyType: varchar("warranty_type", { length: 50 }),
  warrantyLink: varchar("warranty_link", { length: 255 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  supportSite: text("support_site"),
  driversSite: text("drivers_site"),
  description: text("description"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const deviceLifecycle = mysqlTable("device_lifecycle", {
  id: serial("id").primaryKey(),
  deviceId: int("device_id")
    .notNull()
    .unique()
    .references(() => device.id, { onDelete: "cascade" }),

  purchaseDate: date("purchase_date"),
  endOfLife: date("end_of_life"),
  expectedReplacementYear: int("expected_replacement_year"),

  planDescription: varchar("plan_description", { length: 100 }),
  extraNotes: text("extra_notes"),

  billedTo: int("billed_to").references(() => department.id, {
    onDelete: "set null",
  }),
  costTo: int("cost_to").references(() => department.id, {
    onDelete: "set null",
  }),

  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const deviceComputer = mysqlTable("device_computer", {
  deviceId: int("device_id").primaryKey(),
  domain: varchar("domain", { length: 150 }),
  os: varchar("os", { length: 100 }).notNull(),
  config: json("config"),
});

export const userDevice = mysqlTable("user_device", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  deviceId: int("device_id").notNull(),
  dateAssignment: date("date_assignment"),
  assigned: boolean("assigned").default(true),
});

export const peripheral = mysqlTable("peripheral", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
});

export const workstation = mysqlTable("workstation", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  info: json("info"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const workstationUser = mysqlTable(
  "workstation_user",
  {
    id: serial("id").primaryKey(),

    workstationId: int("workstation_id")
      .notNull()
      .references(() => workstation.id, { onDelete: "cascade" }),

    userId: int("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueWorkstationUser: unique().on(
      table.workstationId,
      table.userId
    ),
  })
);

export const workstationDevice = mysqlTable(
  "workstation_device",
  {
    deviceId: int("device_id").notNull(),
    workstationId: int("workstation_id").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.deviceId, table.workstationId] }),
  })
);

export const workstationPeripherical = mysqlTable(
  "workstation_peripheral",
  {
    workstationId: int("workstation_id").notNull(),
    peripheralId: int("peripheral_id").notNull(),
    quantity: int("quantity").default(1),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.workstationId, table.peripheralId] }),
  })
);

export const license = mysqlTable("license", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  billingFrequency: varchar("billing_frequency", { length: 50 }),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const userLicense = mysqlTable(
  "user_license",
  {
    userId: int("user_id").notNull(),
    licenseId: int("license_id").notNull(),
    createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
    cost: decimal("cost", { precision: 10, scale: 2 }),
    billingFrequency: varchar("billing_frequency", { length: 50 }),
    active: boolean("active"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.licenseId] }),
  })
);

export const attribute = mysqlTable("attribute", {
  id: serial("id").primaryKey(),
  deviceId: int("device_id"),
  key: varchar("key", { length: 100 }),
  value: text("value"),
});

export const departmentRelations = relations(department, ({ many }) => ({
  users: many(user),
  billedDeviceLifecycles: many(deviceLifecycle, { relationName: "billedTo" }),
  costDeviceLifecycles: many(deviceLifecycle, { relationName: "costTo" }),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  department: one(department, {
    fields: [user.departmentId],
    references: [department.id],
  }),
  managedLocations: many(location),
  workstations: many(workstation),
  deviceAssignments: many(userDevice),
  licenseAssignments: many(userLicense),
  systemUser: one(systemUser, {
    fields: [user.id],
    references: [systemUser.userId],
  }),
}));

export const locationRelations = relations(location, ({ one, many }) => ({
  manager: one(user, {
    fields: [location.managerId],
    references: [user.id],
  }),
  devices: many(device),
}));

export const deviceRelations = relations(device, ({ one, many }) => ({
  type: one(deviceType, {
    fields: [device.deviceTypeId],
    references: [deviceType.id],
  }),
  status: one(status, {
    fields: [device.statusId],
    references: [status.id],
  }),
  location: one(location, {
    fields: [device.locationId],
    references: [location.id],
  }),
  makeModel: one(makeModel, {
    fields: [device.makeModelId],
    references: [makeModel.id],
  }),
  computer: one(deviceComputer, {
    fields: [device.id],
    references: [deviceComputer.deviceId],
  }),
  userLinks: many(userDevice),
  workstationLinks: many(workstationDevice),
  attributes: many(attribute),
  lifecycle: one(deviceLifecycle),
}));

export const licenseRelations = relations(license, ({ many }) => ({
  userLicenses: many(userLicense),
}));

export const deviceLifecycleRelations = relations(deviceLifecycle, ({ one }) => ({
  device: one(device, {
    fields: [deviceLifecycle.deviceId],
    references: [device.id],
  }),
  billedToDepartment: one(department, {
    fields: [deviceLifecycle.billedTo],
    references: [department.id],
    relationName: "billedTo",
  }),
  costToDepartment: one(department, {
    fields: [deviceLifecycle.costTo],
    references: [department.id],
    relationName: "costTo",
  }),
}));

export const workstationRelations = relations(workstation, ({ many }) => ({
  devices: many(workstationDevice),
  periphericals: many(workstationPeripherical),
  users: many(workstationUser),
}));

export const history = mysqlTable("history", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  action: varchar("action", { length: 255 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }).notNull(),
  description: text("description"),
  entityId: int("entity_id"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const systemUser = mysqlTable("system_user", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().unique(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  invitationHash: varchar("invitation_hash", { length: 64 }),
  role: mysqlEnum("role", ["admin", "common"]).default("common"),
  isActive: int("is_active").default(1),
  preferences: json("preferences").default(sql`(JSON_OBJECT())`),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: datetime("last_login_at"),
});

export const session = mysqlTable("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  systemUserId: int("system_user_id").notNull(),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const systemUserRelations = relations(systemUser, ({ one, many }) => ({
  user: one(user, {
    fields: [systemUser.userId],
    references: [user.id],
  }),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  systemUser: one(systemUser, {
    fields: [session.systemUserId],
    references: [systemUser.id],
  }),
}));