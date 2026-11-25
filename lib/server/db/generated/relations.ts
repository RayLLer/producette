import { relations } from "drizzle-orm/relations";
import { usersInAuth, accounts, profiles, feeSettings, panelUsers, auditLog, hostStripeAccounts } from "./schema";

export const accountsRelations = relations(accounts, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [accounts.id],
		references: [usersInAuth.id]
	}),
	account: one(accounts, {
		fields: [accounts.referredByHostId],
		references: [accounts.id],
		relationName: "accounts_referredByHostId_accounts_id"
	}),
	accounts: many(accounts, {
		relationName: "accounts_referredByHostId_accounts_id"
	}),
	profiles: many(profiles),
	feeSettings: many(feeSettings),
	panelUsers: many(panelUsers),
	auditLogs: many(auditLog),
	hostStripeAccounts: many(hostStripeAccounts),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	accounts: many(accounts),
}));

export const profilesRelations = relations(profiles, ({one}) => ({
	account: one(accounts, {
		fields: [profiles.userId],
		references: [accounts.id]
	}),
}));

export const feeSettingsRelations = relations(feeSettings, ({one}) => ({
	account: one(accounts, {
		fields: [feeSettings.createdBy],
		references: [accounts.id]
	}),
}));

export const panelUsersRelations = relations(panelUsers, ({one}) => ({
	account: one(accounts, {
		fields: [panelUsers.userId],
		references: [accounts.id]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	account: one(accounts, {
		fields: [auditLog.actorUserId],
		references: [accounts.id]
	}),
}));

export const hostStripeAccountsRelations = relations(hostStripeAccounts, ({one}) => ({
	account: one(accounts, {
		fields: [hostStripeAccounts.userId],
		references: [accounts.id]
	}),
}));