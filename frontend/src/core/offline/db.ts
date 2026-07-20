import Dexie, { type EntityTable } from 'dexie';

export interface SyncRecord {
    id: string;          // Internal UUID of the sync task
    userId: string;      // Multi-user isolation
    action: 'insert' | 'update' | 'delete';
    table: string;       // Target Supabase table name
    recordId: string;    // Record UUID
    payload_encrypted: string;
    status: 'pending' | 'synced' | 'failed';
    createdAt: number;   // Timestamp for queue ordering
    retryCount: number;  // Retry count (max 5)
    error?: string;      // Error message if failed
}

export interface CacheRecord {
    key: string;         // Serialized JSON query key
    data: any;           // Cached payload
    updatedAt: number;   // Epoch timestamp of last update
}

export interface LocalEntityRecord {
    id: string;
    user_id?: string;
    updated_at?: string;
    [key: string]: any;
}

const db = new Dexie('FinFlowOfflineDB') as Dexie & {
  syncQueue: EntityTable<SyncRecord, 'id'>;
  queryCache: EntityTable<CacheRecord, 'key'>;
  entities: EntityTable<LocalEntityRecord, 'id'>;
};

// Declaring DB indexes across schema versions
db.version(1).stores({
    syncQueue: 'id, userId, [status+createdAt], recordId, table'
});

db.version(2).stores({
    syncQueue: 'id, userId, status, createdAt, recordId, table'
});

db.version(3).stores({
    syncQueue: 'id, userId, status, createdAt, recordId, table',
    queryCache: 'key'
});

db.version(4).stores({
    syncQueue: 'id, userId, status, createdAt, recordId, table',
    queryCache: 'key',
    entities: 'id, user_id, table, updated_at, [table+user_id]'
});

export default db;