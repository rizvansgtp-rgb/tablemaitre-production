export type UserRole = 'owner' | 'admin' | 'manager' | 'host' | 'waiter';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  assigned_stores: string[];
  active_store: string | null;
  created_at: string;
  disabled?: boolean;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
}

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'billing' | 'cleaning' | 'blocked';

export interface Table {
  id: string;
  store_id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  x: number;
  y: number;
  shape: 'round' | 'square' | 'rect';
  section_id?: string;
  section_name?: string;
  guest_count?: number;
  waiter_name?: string;
  reservation_name?: string;
  seated_at?: string;
  merged_with?: string | null;
}

export interface Reservation {
  id: string;
  store_id: string;
  guest_name: string;
  phone: string;
  party_size: number;
  adults?: number;
  kids?: number;
  total_pax?: number;
  source?: 'online' | 'phone' | 'walk-in' | 'manual';
  datetime: string;
  status: 'booked' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  table_id?: string;
  guest_id?: string;
}

export interface GuestCard {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_visits: number;
  last_visit: string;
  preferences: string[];
  is_vip: boolean;
  notes?: string;
  nationality?: string;
  allergies?: string[];
  visit_count?: number;
  last_visit_at?: string;
}

export interface WaitlistEntry {
  id: string;
  store_id: string;
  guest_name: string;
  phone: string;
  party_size: number;
  status: 'waiting' | 'seated' | 'cancelled';
  created_at: string;
}

export interface OfflineQueueItem {
  id: string; // temporary local ID
  action: 'insert' | 'update' | 'delete';
  table: 'reservations' | 'guests' | 'restaurant_tables' | 'profiles' | 'sections' | 'table_merge_links' | 'reservation_status_logs';
  payload: any;
  timestamp: string;
  retryCount?: number;
}
