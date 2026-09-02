import { relations } from 'drizzle-orm';
import { accounts, guestCodes, users } from './auth';
import { bet5Events, bet5Tickets, betGroups, bets } from './bets';
import { events } from './events';
import { forecasts } from './forecasts';
import { horses, horseTags } from './horses';
import { raceDefinitions, raceEntries, raceInstances, raceOdds } from './races';
import { venues } from './venues';
import { transactions, wallets } from './wallets';

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  bets: many(bets),
  betGroups: many(betGroups),
  accounts: many(accounts),
  createdGuestCodes: many(guestCodes, { relationName: 'creator' }),
  createdRaces: many(raceInstances),
  forecasts: many(forecasts),
}));

export const guestCodeRelations = relations(guestCodes, ({ one }) => ({
  creator: one(users, {
    fields: [guestCodes.createdBy],
    references: [users.id],
    relationName: 'creator',
  }),
}));

export const eventRelations = relations(events, ({ many, one }) => ({
  wallets: many(wallets),
  races: many(raceInstances),
  bet5Event: one(bet5Events, {
    fields: [events.id],
    references: [bet5Events.eventId],
  }),
}));

export const walletRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [wallets.eventId],
    references: [events.id],
  }),
  transactions: many(transactions),
}));

export const transactionRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  bet: one(bets, {
    fields: [transactions.referenceId],
    references: [bets.id],
  }),
  event: one(events, {
    fields: [transactions.referenceId],
    references: [events.id],
  }),
  bet5Ticket: one(bet5Tickets, {
    fields: [transactions.referenceId],
    references: [bet5Tickets.id],
  }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  raceDefinitions: many(raceDefinitions),
  races: many(raceInstances),
}));

export const raceDefinitionsRelations = relations(raceDefinitions, ({ one }) => ({
  defaultVenue: one(venues, {
    fields: [raceDefinitions.defaultVenueId],
    references: [venues.id],
  }),
}));

export const raceInstancesRelations = relations(raceInstances, ({ one, many }) => ({
  event: one(events, {
    fields: [raceInstances.eventId],
    references: [events.id],
  }),
  venue: one(venues, {
    fields: [raceInstances.venueId],
    references: [venues.id],
  }),
  definition: one(raceDefinitions, {
    fields: [raceInstances.raceDefinitionId],
    references: [raceDefinitions.id],
  }),
  entries: many(raceEntries),
  odds: one(raceOdds),
  forecasts: many(forecasts),
}));

export const raceEntryRelations = relations(raceEntries, ({ one }) => ({
  race: one(raceInstances, {
    fields: [raceEntries.raceId],
    references: [raceInstances.id],
  }),
  horse: one(horses, {
    fields: [raceEntries.horseId],
    references: [horses.id],
  }),
}));

export const raceOddsRelations = relations(raceOdds, ({ one }) => ({
  race: one(raceInstances, {
    fields: [raceOdds.raceId],
    references: [raceInstances.id],
  }),
}));

export const horseRelations = relations(horses, ({ many }) => ({
  tags: many(horseTags),
  entries: many(raceEntries),
}));

export const horseTagRelations = relations(horseTags, ({ one }) => ({
  horse: one(horses, {
    fields: [horseTags.horseId],
    references: [horses.id],
  }),
}));

export const betGroupRelations = relations(betGroups, ({ one, many }) => ({
  user: one(users, {
    fields: [betGroups.userId],
    references: [users.id],
  }),
  race: one(raceInstances, {
    fields: [betGroups.raceId],
    references: [raceInstances.id],
  }),
  wallet: one(wallets, {
    fields: [betGroups.walletId],
    references: [wallets.id],
  }),
  bets: many(bets),
}));

export const betRelations = relations(bets, ({ one }) => ({
  user: one(users, {
    fields: [bets.userId],
    references: [users.id],
  }),
  race: one(raceInstances, {
    fields: [bets.raceId],
    references: [raceInstances.id],
  }),
  wallet: one(wallets, {
    fields: [bets.walletId],
    references: [wallets.id],
  }),
  group: one(betGroups, {
    fields: [bets.betGroupId],
    references: [betGroups.id],
  }),
}));

export const bet5EventRelations = relations(bet5Events, ({ one, many }) => ({
  event: one(events, {
    fields: [bet5Events.eventId],
    references: [events.id],
  }),
  race1: one(raceInstances, {
    fields: [bet5Events.race1Id],
    references: [raceInstances.id],
    relationName: 'bet5_race1',
  }),
  race2: one(raceInstances, {
    fields: [bet5Events.race2Id],
    references: [raceInstances.id],
    relationName: 'bet5_race2',
  }),
  race3: one(raceInstances, {
    fields: [bet5Events.race3Id],
    references: [raceInstances.id],
    relationName: 'bet5_race3',
  }),
  race4: one(raceInstances, {
    fields: [bet5Events.race4Id],
    references: [raceInstances.id],
    relationName: 'bet5_race4',
  }),
  race5: one(raceInstances, {
    fields: [bet5Events.race5Id],
    references: [raceInstances.id],
    relationName: 'bet5_race5',
  }),
  tickets: many(bet5Tickets),
}));

export const bet5TicketRelations = relations(bet5Tickets, ({ one }) => ({
  bet5Event: one(bet5Events, {
    fields: [bet5Tickets.bet5EventId],
    references: [bet5Events.id],
  }),
  user: one(users, {
    fields: [bet5Tickets.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [bet5Tickets.walletId],
    references: [wallets.id],
  }),
}));

export const forecastRelations = relations(forecasts, ({ one }) => ({
  race: one(raceInstances, {
    fields: [forecasts.raceId],
    references: [raceInstances.id],
  }),
  user: one(users, {
    fields: [forecasts.userId],
    references: [users.id],
  }),
}));
