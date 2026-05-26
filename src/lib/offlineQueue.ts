import { supabase, isSupabaseConfigured } from './supabase';
import { OfflineQueueItem } from '../types';

const QUEUE_KEY = 'table_maitre_offline_queue';

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (err) {
    console.error('Error reading offline queue:', err);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error saving offline queue:', err);
  }
}

export function addToOfflineQueue(
  action: OfflineQueueItem['action'],
  table: OfflineQueueItem['table'],
  payload: any
): string {
  const queue = getOfflineQueue();
  const tempId = payload.id || `temp-${table}-${Date.now()}`;
  
  // Clean payload if it doesn't have an ID
  const payloadWithId = { ...payload, id: tempId };

  const newItem: OfflineQueueItem = {
    id: tempId,
    action,
    table,
    payload: payloadWithId,
    timestamp: new Date().toISOString(),
    retryCount: 0
  };

  queue.push(newItem);
  saveOfflineQueue(queue);

  // Apply to local storage cache immediately so UI feels fast and stays up-to-date
  applyItemToLocalStorage(newItem);

  return tempId;
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

// Applies changes to local storage so they are immediately visible in offline mode
function applyItemToLocalStorage(item: OfflineQueueItem) {
  const { action, table, payload } = item;
  let cacheKey = '';
  if (table === 'reservations') cacheKey = 'table_maitre_reservations';
  else if (table === 'guests') cacheKey = 'table_maitre_guests';
  else if (table === 'restaurant_tables') cacheKey = 'table_maitre_tables';
  else if (table === 'profiles') cacheKey = 'table_maitre_staff';

  if (!cacheKey) return;

  try {
    const local = localStorage.getItem(cacheKey);
    let items = local ? JSON.parse(local) : [];

    if (action === 'insert') {
      // Prevent duplicates
      items = items.filter((x: any) => x.id !== payload.id);
      items.push(payload);
    } else if (action === 'update') {
      items = items.map((x: any) => (x.id === payload.id ? { ...x, ...payload } : x));
    } else if (action === 'delete') {
      items = items.filter((x: any) => x.id !== payload.id);
    }

    localStorage.setItem(cacheKey, JSON.stringify(items));
    
    // Trigger window event for reactive updates in floor canvas or other panels
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Local storage sync error:', err);
  }
}

interface SyncSummary {
  success: number;
  failed: number;
  errors: string[];
}

export async function syncOfflineQueue(): Promise<SyncSummary> {
  const summary: SyncSummary = { success: 0, failed: 0, errors: [] };
  if (!isSupabaseConfigured) {
    summary.errors.push('Supabase is not configured yet.');
    return summary;
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return summary;

  const remainingQueue: OfflineQueueItem[] = [];
  const idMap: Record<string, string> = {};

  for (const item of queue) {
    try {
      const { action, table, payload } = item;
      const payloadToSend = { ...payload };

      // Map any temporary references to real Supabase UUIDs
      for (const key of Object.keys(payloadToSend)) {
        const val = payloadToSend[key];
        if (typeof val === 'string' && idMap[val]) {
          payloadToSend[key] = idMap[val];
        }
      }

      const originalId = payloadToSend.id;
      const isTempId = typeof originalId === 'string' && originalId.startsWith('temp-');

      if (action === 'insert' && isTempId) {
        // Remove temporary ID and let Supabase auto-generate UUID
        delete payloadToSend.id;
      }

      let error: any = null;
      let insertedRow: any = null;

      if (action === 'insert') {
        const { data, error: insError } = await supabase.from(table).insert([payloadToSend]).select();
        error = insError;
        if (data && data.length > 0) {
          insertedRow = data[0];
        }
      } else if (action === 'update') {
        const { error: updError } = await supabase.from(table).update(payloadToSend).eq('id', payloadToSend.id);
        error = updError;
      } else if (action === 'delete') {
        const { error: delError } = await supabase.from(table).delete().eq('id', payloadToSend.id);
        error = delError;
      }

      if (error) {
        throw error;
      }

      // If we inserted a temp record and got a real row, record mappings
      if (action === 'insert' && isTempId && insertedRow && insertedRow.id) {
        idMap[originalId] = insertedRow.id;
      }

      summary.success++;
    } catch (err: any) {
      console.error(`Sync failed for item ${item.id}:`, err);
      summary.failed++;
      summary.errors.push(`Table ${item.table} ${item.action} error: ${err.message || err}`);
      
      // Keep in queue for retry if failed
      const updatedItem = { ...item, retryCount: (item.retryCount || 0) + 1 };
      remainingQueue.push(updatedItem);
    }
  }

  // Update local storage caches for all elements that were remapped with real IDs
  if (Object.keys(idMap).length > 0) {
    updateLocalCachesAfterRemap(idMap);
  }

  saveOfflineQueue(remainingQueue);
  return summary;
}

function updateLocalCachesAfterRemap(idMap: Record<string, string>) {
  const cacheKeys = [
    'table_maitre_reservations',
    'table_maitre_guests',
    'table_maitre_tables',
    'table_maitre_staff'
  ];

  for (const cacheKey of cacheKeys) {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) continue;
    try {
      let items = JSON.parse(raw);
      let changed = false;
      items = items.map((x: any) => {
        let itemChanged = false;
        const newItem = { ...x };
        for (const key of Object.keys(newItem)) {
          const val = newItem[key];
          if (typeof val === 'string' && idMap[val]) {
            newItem[key] = idMap[val];
            itemChanged = true;
            changed = true;
          }
        }
        return newItem;
      });
      if (changed) {
        localStorage.setItem(cacheKey, JSON.stringify(items));
      }
    } catch (err) {
      console.error('Error updating cache key after remap:', cacheKey, err);
    }
  }
}
