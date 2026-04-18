import { 
  pgTable, 
  pgEnum, 
  serial, 
  text, 
  timestamp, 
  integer, 
  jsonb 
} from 'drizzle-orm/pg-core';

// 1. Define the Match Status Enum
export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// 2. Define the Matches Table
export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  sport: text('sport').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  status: matchStatusEnum('status').default('scheduled').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  homeScore: integer('home_score').default(0).notNull(),
  awayScore: integer('away_score').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. Define the Commentary Table
export const commentary = pgTable('commentary', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id')
    .references(() => matches.id)
    .notNull(),
  minute: integer('minute').notNull(),
  sequence: integer('sequence').notNull(),
  period: text('period').notNull(),
  eventType: text('event_type').notNull(),
  actor: text('actor'),
  team: text('team'),
  message: text('message').notNull(),
  // Using jsonb for flexibility in storing varied event-specific data
  metadata: jsonb('metadata').default({}),
  // Using an array for tags for efficient querying
  tags: text('tags').array(), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
