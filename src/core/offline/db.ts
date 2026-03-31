import Dexie, { type EntityTable } from 'dexie';

export interface SyncRecord {
    id: string;          // Internal UUID of the sync task
    userId: string;      // To ensure multi-user isolation on shared devices
    action: 'insert' | 'update' | 'delete';
    table: string;       // Target Supabase table (e.g. 'expenses')
    recordId: string;    // The actual table row's UUID
    payload_encrypted: string;
    status: 'pending' | 'synced' | 'failed';
    createdAt: number;   // Unix timestamp for queue sorting ASC
    retryCount: number;  // Max 5 attempts
}

// Ensure the db adheres to Typescript strict typing
const db = new Dexie('FinFlowOfflineDB') as Dexie & {
  syncQueue: EntityTable<SyncRecord, 'id'>;
};

// Declaring the indexes
// Not every field needs to be indexed, only those we query by (status, createdAt, recordId, userId)
db.version(1).stores({
    syncQueue: 'id, userId, [status+createdAt], recordId, table'
});

db.version(2).stores({
    syncQueue: 'id, userId, status, createdAt, recordId, table'
});

export default db;
