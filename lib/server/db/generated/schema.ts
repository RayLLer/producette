import { pgTable, pgSchema, uniqueIndex, index, check, uuid, varchar, timestamp, jsonb, boolean, text, smallint, foreignKey, unique, pgPolicy, integer, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const auth = pgSchema("auth");
export const aalLevelInAuth = auth.enum("aal_level", ['aal1', 'aal2', 'aal3'])
export const codeChallengeMethodInAuth = auth.enum("code_challenge_method", ['s256', 'plain'])
export const factorStatusInAuth = auth.enum("factor_status", ['unverified', 'verified'])
export const factorTypeInAuth = auth.enum("factor_type", ['totp', 'webauthn', 'phone', 'recovery_code'])
export const oauthAuthorizationStatusInAuth = auth.enum("oauth_authorization_status", ['pending', 'approved', 'denied', 'expired'])
export const oauthClientTypeInAuth = auth.enum("oauth_client_type", ['public', 'confidential'])
export const oauthRegistrationTypeInAuth = auth.enum("oauth_registration_type", ['dynamic', 'manual'])
export const oauthResponseTypeInAuth = auth.enum("oauth_response_type", ['code'])
export const oneTimeTokenTypeInAuth = auth.enum("one_time_token_type", ['confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token'])

export const refreshTokensIdSeqInAuth = auth.sequence("refresh_tokens_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const usersInAuth = auth.table("users", {
	instanceId: uuid("instance_id"),
	id: uuid().notNull(),
	aud: varchar({ length: 255 }),
	role: varchar({ length: 255 }),
	email: varchar({ length: 255 }),
	encryptedPassword: varchar("encrypted_password", { length: 255 }),
	emailConfirmedAt: timestamp("email_confirmed_at", { withTimezone: true, mode: 'string' }),
	invitedAt: timestamp("invited_at", { withTimezone: true, mode: 'string' }),
	confirmationToken: varchar("confirmation_token", { length: 255 }),
	confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true, mode: 'string' }),
	recoveryToken: varchar("recovery_token", { length: 255 }),
	recoverySentAt: timestamp("recovery_sent_at", { withTimezone: true, mode: 'string' }),
	emailChangeTokenNew: varchar("email_change_token_new", { length: 255 }),
	emailChange: varchar("email_change", { length: 255 }),
	emailChangeSentAt: timestamp("email_change_sent_at", { withTimezone: true, mode: 'string' }),
	lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: 'string' }),
	rawAppMetaData: jsonb("raw_app_meta_data"),
	rawUserMetaData: jsonb("raw_user_meta_data"),
	isSuperAdmin: boolean("is_super_admin"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	phone: text().default(sql`NULL`),
	phoneConfirmedAt: timestamp("phone_confirmed_at", { withTimezone: true, mode: 'string' }),
	phoneChange: text("phone_change").default(''),
	phoneChangeToken: varchar("phone_change_token", { length: 255 }).default(''),
	phoneChangeSentAt: timestamp("phone_change_sent_at", { withTimezone: true, mode: 'string' }),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }).generatedAlwaysAs(sql`LEAST(email_confirmed_at, phone_confirmed_at)`),
	emailChangeTokenCurrent: varchar("email_change_token_current", { length: 255 }).default(''),
	emailChangeConfirmStatus: smallint("email_change_confirm_status").default(0),
	bannedUntil: timestamp("banned_until", { withTimezone: true, mode: 'string' }),
	reauthenticationToken: varchar("reauthentication_token", { length: 255 }).default(''),
	reauthenticationSentAt: timestamp("reauthentication_sent_at", { withTimezone: true, mode: 'string' }),
	isSsoUser: boolean("is_sso_user").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	isAnonymous: boolean("is_anonymous").default(false).notNull(),
}, (table) => [
	uniqueIndex("confirmation_token_idx").using("btree", table.confirmationToken.asc().nullsLast().op("text_ops")).where(sql`((confirmation_token)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("email_change_token_current_idx").using("btree", table.emailChangeTokenCurrent.asc().nullsLast().op("text_ops")).where(sql`((email_change_token_current)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("email_change_token_new_idx").using("btree", table.emailChangeTokenNew.asc().nullsLast().op("text_ops")).where(sql`((email_change_token_new)::text !~ '^[0-9 ]*$'::text)`),
	index("idx_users_created_at_desc").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_last_sign_in_at_desc").using("btree", table.lastSignInAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_users_name").using("btree", sql`((raw_user_meta_data ->> 'name'::text))`).where(sql`((raw_user_meta_data ->> 'name'::text) IS NOT NULL)`),
	uniqueIndex("reauthentication_token_idx").using("btree", table.reauthenticationToken.asc().nullsLast().op("text_ops")).where(sql`((reauthentication_token)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("recovery_token_idx").using("btree", table.recoveryToken.asc().nullsLast().op("text_ops")).where(sql`((recovery_token)::text !~ '^[0-9 ]*$'::text)`),
	uniqueIndex("users_email_partial_key").using("btree", table.email.asc().nullsLast().op("text_ops")).where(sql`(is_sso_user = false)`),
	index("users_instance_id_email_idx").using("btree", sql`instance_id`, sql`lower((email)::text)`),
	index("users_instance_id_idx").using("btree", table.instanceId.asc().nullsLast().op("uuid_ops")),
	index("users_is_anonymous_idx").using("btree", table.isAnonymous.asc().nullsLast().op("bool_ops")),
	check("users_email_change_confirm_status_check", sql`(email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)`),
]);

export const accounts = pgTable("accounts", {
	id: uuid().primaryKey().notNull(),
	preferredLocale: text("preferred_locale").default('es').notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	referredByHostId: uuid("referred_by_host_id"),
	anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("accounts_referred_by_host_id_idx").using("btree", table.referredByHostId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.id],
			foreignColumns: [usersInAuth.id],
			name: "accounts_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.referredByHostId],
			foreignColumns: [table.id],
			name: "accounts_referred_by_host_id_fkey"
		}).onDelete("restrict"),
	unique("accounts_stripe_customer_id_key").on(table.stripeCustomerId),
	pgPolicy("accounts: cada usuario actualiza la suya", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(id = ( SELECT auth.uid() AS uid))`, withCheck: sql`(id = ( SELECT auth.uid() AS uid))`  }),
	pgPolicy("accounts: cada usuario lee la suya", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("accounts_preferred_locale_check", sql`preferred_locale = ANY (ARRAY['es'::text, 'en'::text])`),
]);

export const profiles = pgTable("profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	segment: text().notNull(),
	displayName: text("display_name"),
	bio: text(),
	hostFeeBps: integer("host_fee_bps"),
	founderNumber: integer("founder_number"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("profiles_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [accounts.id],
			name: "profiles_user_id_fkey"
		}).onDelete("restrict"),
	unique("profiles_user_id_segment_key").on(table.userId, table.segment),
	unique("profiles_founder_number_key").on(table.founderNumber),
	pgPolicy("profiles: cada usuario actualiza los suyos", { as: "permissive", for: "update", to: ["authenticated"], using: sql`(user_id = ( SELECT auth.uid() AS uid))`, withCheck: sql`(user_id = ( SELECT auth.uid() AS uid))`  }),
	pgPolicy("profiles: cada usuario lee los suyos", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("profiles_check", sql`(segment = 'host'::text) OR ((host_fee_bps IS NULL) AND (founder_number IS NULL))`),
	check("profiles_founder_number_check", sql`founder_number > 0`),
	check("profiles_host_fee_bps_check", sql`(host_fee_bps >= 0) AND (host_fee_bps <= 10000)`),
	check("profiles_segment_check", sql`segment = ANY (ARRAY['client'::text, 'host'::text])`),
]);

export const feeSettings = pgTable("fee_settings", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "fee_settings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	providerBps: integer("provider_bps").notNull(),
	clientBps: integer("client_bps").notNull(),
	founderBps: integer("founder_bps").notNull(),
	referralBps: integer("referral_bps").notNull(),
	effectiveFrom: timestamp("effective_from", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("fee_settings_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	index("fee_settings_effective_from_idx").using("btree", table.effectiveFrom.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [accounts.id],
			name: "fee_settings_created_by_fkey"
		}).onDelete("restrict"),
	check("fee_settings_client_bps_check", sql`(client_bps >= 0) AND (client_bps <= 10000)`),
	check("fee_settings_founder_bps_check", sql`(founder_bps >= 0) AND (founder_bps <= 10000)`),
	check("fee_settings_provider_bps_check", sql`(provider_bps >= 0) AND (provider_bps <= 10000)`),
	check("fee_settings_referral_bps_check", sql`(referral_bps >= 0) AND (referral_bps <= 10000)`),
]);

export const panelUsers = pgTable("panel_users", {
	userId: uuid("user_id").primaryKey().notNull(),
	role: text().notNull(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [accounts.id],
			name: "panel_users_user_id_fkey"
		}).onDelete("restrict"),
	check("panel_users_role_check", sql`role = ANY (ARRAY['admin'::text, 'soporte'::text, 'finanzas'::text])`),
]);

export const auditLog = pgTable("audit_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "audit_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	actorUserId: uuid("actor_user_id").notNull(),
	actorRole: text("actor_role").notNull(),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id"),
	reason: text().notNull(),
	data: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_log_actor_user_id_idx").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	index("audit_log_entity_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [accounts.id],
			name: "audit_log_actor_user_id_fkey"
		}).onDelete("restrict"),
	check("audit_log_actor_role_check", sql`actor_role = ANY (ARRAY['admin'::text, 'soporte'::text, 'finanzas'::text, 'system'::text])`),
	check("audit_log_reason_check", sql`length(TRIM(BOTH FROM reason)) > 0`),
]);
