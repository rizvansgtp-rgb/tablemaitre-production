import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Clock, 
  Users, 
  AlertCircle, 
  Trash2, 
  Minimize2,
  XCircle,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Table, TableStatus } from '../types';
import { cn } from '../lib/utils';
import TableIcon, { getStatusColor } from './TableIcon';
import { addToOfflineQueue } from '../lib/offlineQueue';

export default function FloorPlan() {
  const { profile } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('All');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [modalTab, setModalTab] = useState<'service' | 'config'>('service');
  const [quickMenu, setQuickMenu] = useState<{ x: number, y: number, tableId: string } | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [transferCleanAction, setTransferCleanAction] = useState<'cleaning' | 'available'>('cleaning');
  const [viewMode, setViewMode] = useState<'floor' | 'list'>('floor');

  // Pan and Zoom workspace viewState
  const [viewState, setViewState] = useState({ x: 50, y: 50, scale: 0.85 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const floorCanvasRef = useRef<HTMLDivElement>(null);

  // Property editing fields matching Table interface shape and section_id
  const [editFormData, setEditFormData] = useState({
    number: '',
    capacity: 4,
    shape: 'square' as 'round' | 'square' | 'rect',
    section_id: 'Indoor Main',
    guest_count: undefined as number | undefined,
    waiter_name: undefined as string | undefined
  });

  useEffect(() => {
    if (profile?.active_store) {
      loadSectionsAndTables(profile.active_store);
    }
  }, [profile?.active_store]);

  useEffect(() => {
    if (selectedTable) {
      setEditFormData({
        number: selectedTable.number,
        capacity: selectedTable.capacity,
        shape: selectedTable.shape || 'square',
        section_id: selectedTable.section_id || 'Indoor Main',
        guest_count: selectedTable.guest_count,
        waiter_name: selectedTable.waiter_name
      });
      setModalTab('service');
    }
  }, [selectedTable]);

  async function loadSectionsAndTables(storeId: string) {
    setLoading(true);
    await loadSections(storeId);
    await fetchTables(storeId);
    setLoading(false);
  }

  async function loadSections(storeId: string) {
    try {
      if (!isSupabaseConfigured) {
        const local = localStorage.getItem('table_maitre_sections');
        if (local) {
          const parsed = JSON.parse(local);
          const storeSecs = parsed.filter((s: any) => s.store_id === storeId);
          if (storeSecs.length > 0) {
            setSections(storeSecs);
            setActiveSection(prev => {
              if (prev === 'All' || !storeSecs.some((s: any) => s.id === prev)) {
                return storeSecs[0].id;
              }
              return prev;
            });
            return;
          }
        }
        const demoSecs = [
          { id: `${storeId}-Indoor Main`, store_id: storeId, name: 'Indoor Main' },
          { id: `${storeId}-Outdoor Terrace`, store_id: storeId, name: 'Outdoor Terrace' },
          { id: `${storeId}-VIP Lounge`, store_id: storeId, name: 'VIP Lounge' },
          { id: `${storeId}-Garden Area`, store_id: storeId, name: 'Garden Area' }
        ];
        let allSections = [];
        const existingRaw = localStorage.getItem('table_maitre_sections');
        if (existingRaw) {
          allSections = JSON.parse(existingRaw).filter((s: any) => s.store_id !== storeId);
        }
        allSections = [...allSections, ...demoSecs];
        localStorage.setItem('table_maitre_sections', JSON.stringify(allSections));
        setSections(demoSecs);
        setActiveSection(prev => {
          if (prev === 'All' || !demoSecs.some((s: any) => s.id === prev)) {
            return demoSecs[0].id;
          }
          return prev;
        });
        return;
      }

      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('store_id', storeId);

      if (error) {
        console.error('Error loading sections:', error);
        alert(`Failed to load sections from database: ${error.message}`);
        setSections([]);
      } else if (data && data.length > 0) {
        const sorted = [...data].sort((a: any, b: any) => a.name.localeCompare(b.name));
        setSections(sorted);
        setActiveSection(prev => {
          if (prev === 'All' || !sorted.some((s: any) => s.id === prev)) {
            return sorted[0].id;
          }
          return prev;
        });
      } else {
        setSections([]);
      }
    } catch (err) {
      console.error('Unexpected error loading sections:', err);
    }
  }

  const sectionNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach(s => {
      map[s.id] = s.name;
    });
    return map;
  }, [sections]);

  const handleRenameSectionClick = async (sectionId: string, currentName: string) => {
    const newName = prompt(`Enter new name for section "${currentName}":`, currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;

    const trimmedName = newName.trim();
    const originalSections = [...sections];
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: trimmedName } : s));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('sections')
          .update({ name: trimmedName })
          .eq('id', sectionId)
          .eq('store_id', profile?.active_store);

        if (error) {
          throw error;
        }
      } catch (err: any) {
        console.error('Failed to rename section in database:', err);
        alert(`Failed to rename section: ${err.message || err}`);
        setSections(originalSections);
      }
    } else {
      const local = localStorage.getItem('table_maitre_sections');
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map((s: any) => s.id === sectionId ? { ...s, name: trimmedName } : s);
        localStorage.setItem('table_maitre_sections', JSON.stringify(updated));
      }
    }
  };

  const handleInitializeDefaultSections = async () => {
    const storeId = profile?.active_store || '0301';
    const demoSecs = [
      { id: `${storeId}-Indoor Main`, store_id: storeId, name: 'Indoor Main' },
      { id: `${storeId}-Outdoor Terrace`, store_id: storeId, name: 'Outdoor Terrace' },
      { id: `${storeId}-VIP Lounge`, store_id: storeId, name: 'VIP Lounge' },
      { id: `${storeId}-Garden Area`, store_id: storeId, name: 'Garden Area' }
    ];
    setSections(demoSecs);
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('sections').insert(demoSecs);
        if (error) {
          console.error('Failed to seed sections:', error);
          alert(`Failed to initialize sections: ${error.message}`);
          setSections([]);
        }
      } catch (err: any) {
        console.error('Failed to seed sections:', err);
        alert(`Failed to initialize sections: ${err.message || err}`);
        setSections([]);
      }
    } else {
      localStorage.setItem('table_maitre_sections', JSON.stringify(demoSecs));
    }
  };

  async function fetchTables(storeId: string = profile?.active_store || '0301') {
    try {
      if (!isSupabaseConfigured) {
        const local = localStorage.getItem('table_maitre_tables');
        if (local) {
          const parsed = JSON.parse(local);
          const filtered = parsed.filter((t: any) => t.store_id === storeId);
          if (filtered.length > 0) {
            setTables(filtered);
            return;
          }
        }
        const demo = getDemoTables(storeId);
        let allTables = [];
        const existingRaw = localStorage.getItem('table_maitre_tables');
        if (existingRaw) {
          allTables = JSON.parse(existingRaw);
          allTables = allTables.filter((t: any) => t.store_id !== storeId);
        }
        allTables = [...allTables, ...demo];
        localStorage.setItem('table_maitre_tables', JSON.stringify(allTables));
        setTables(demo);
        return;
      }

      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('store_id', storeId);

      if (error) {
        console.error('Error fetching tables:', error);
        alert(`Failed to load tables from database: ${error.message}`);
        setTables([]);
      } else {
        const mapped = (data || []).map((t: any) => ({
          ...t,
          shape: t.shape || t.type || 'square',
          section_id: t.section_id || (sections[0]?.id || `${storeId}-Indoor Main`)
        }));
        setTables(mapped);
      }
    } catch (err) {
      console.error('Unexpected error fetching tables:', err);
    }
  }

  function getDemoTables(storeId: string): Table[] {
    const initialSections = ['Indoor Main', 'Outdoor Terrace', 'VIP Lounge', 'Garden Area'];
    return Array.from({ length: 15 }).map((_, i) => {
      const sec = initialSections[i % initialSections.length];
      return {
        id: `t-${i}`,
        store_id: storeId,
        number: `${i + 1}`,
        capacity: i % 3 === 0 ? 2 : (i % 3 === 1 ? 4 : 6),
        status: i % 5 === 0 ? 'occupied' : (i % 7 === 0 ? 'reserved' : 'available'),
        x: (i % 5) * 150 + 100,
        y: Math.floor(i / 5) * 150 + 100,
        shape: i % 3 === 0 ? 'round' : (i % 3 === 1 ? 'square' : 'rect'),
        section_id: `${storeId}-${sec}`,
        guest_count: i % 5 === 0 ? Math.ceil(Math.random() * 4) : undefined,
        waiter_name: i % 5 === 0 ? 'John' : undefined,
        seated_at: i % 5 === 0 ? new Date(Date.now() - 1000 * 60 * 45).toISOString() : undefined,
      };
    });
  }

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const current = table.status;
    if (current === status) return;

    // Lifecycle workflow guard checks
    let isBlocked = false;
    let message = "";

    if (current === 'available') {
      if (status === 'billing' || status === 'cleaning') {
        isBlocked = true;
        message = `Invalid Shift: An open table cannot directly transition to ${status === 'billing' ? 'billing' : 'cleaning'}.`;
      }
    }

    if (isBlocked) {
      alert(message);
      return;
    }

    const previousTables = [...tables];
    const previousSelectedTable = selectedTable ? { ...selectedTable } : null;

    const updates: any = { status };
    if (status === 'occupied') {
      updates.guest_count = table.guest_count || table.capacity;
      updates.waiter_name = table.waiter_name || profile?.email?.split('@')[0] || 'Staff';
      updates.seated_at = new Date().toISOString();
    } else if (status === 'available' || status === 'cleaning') {
      updates.guest_count = null;
      updates.waiter_name = null;
      updates.reservation_name = null;
      updates.seated_at = null;
    }

    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    if (selectedTable?.id === tableId) {
      setSelectedTable(prev => prev ? { ...prev, ...updates } : null);
    }

    // Connect to offline queue
    addToOfflineQueue('update', 'restaurant_tables', { id: tableId, ...updates });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('restaurant_tables')
          .update(updates)
          .eq('id', tableId);
        
        if (error) {
          console.error('Error updating status:', error);
          alert(`Failed to update table status in database: ${error.message}`);
          setTables(previousTables);
          if (previousSelectedTable) setSelectedTable(previousSelectedTable);
        }
      } catch (err: any) {
        console.error('Unexpected error updating status:', err);
        alert(`Failed to update table status: ${err.message || err}`);
        setTables(previousTables);
        if (previousSelectedTable) setSelectedTable(previousSelectedTable);
      }
    }
  };

  const handleMergeTables = async (targetTableId: string) => {
    if (profile?.role === 'waiter') {
      alert("Unauthorized: Only hosts, managers, and owners can merge tables.");
      return;
    }

    if (!selectedTable) return;
    const targetTable = tables.find(t => t.id === targetTableId);
    if (!targetTable) return;

    const updatesA = {
      merged_with: targetTable.number,
      capacity: selectedTable.capacity + targetTable.capacity
    };
    const updatesB = {
      merged_with: selectedTable.number,
      status: 'blocked' as TableStatus
    };

    setTables(prev => prev.map(t => {
      if (t.id === selectedTable.id) return { ...t, ...updatesA };
      if (t.id === targetTable.id) return { ...t, ...updatesB };
      return t;
    }));

    setSelectedTable(prev => prev ? { ...prev, ...updatesA } : null);

    // Record both updates to the offline queue
    addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...updatesA });
    addToOfflineQueue('update', 'restaurant_tables', { id: targetTable.id, ...updatesB });

    // Queue merge link
    const mergeLink = {
      store_id: profile?.active_store || '0301',
      primary_table_id: selectedTable.id,
      merged_table_id: targetTable.id
    };
    addToOfflineQueue('insert', 'table_merge_links', mergeLink);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('restaurant_tables').update(updatesA).eq('id', selectedTable.id);
        await supabase.from('restaurant_tables').update(updatesB).eq('id', targetTable.id);
        await supabase.from('table_merge_links').insert([mergeLink]);
      } catch (err) {
        console.error('Failed to sync tables merge:', err);
      }
    }
  };

  const handleSplitTables = async () => {
    if (profile?.role === 'waiter') {
      alert("Unauthorized: Only hosts, managers, and owners can split tables.");
      return;
    }

    if (!selectedTable || !selectedTable.merged_with) return;
    const partnerTable = tables.find(t => t.number === selectedTable.merged_with);

    const originalCap = Math.max(2, selectedTable.capacity - (partnerTable?.capacity || 2));
    const updatesA = {
      merged_with: null,
      capacity: originalCap
    };
    const updatesB = {
      merged_with: null,
      status: 'available' as TableStatus
    };

    setTables(prev => prev.map(t => {
      if (t.id === selectedTable.id) return { ...t, ...updatesA };
      if (partnerTable && t.id === partnerTable.id) return { ...t, ...updatesB };
      return t;
    }));

    setSelectedTable(prev => prev ? { ...prev, ...updatesA } : null);

    // Queue offline syncs for split operation
    addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...updatesA });
    if (partnerTable) {
      addToOfflineQueue('update', 'restaurant_tables', { id: partnerTable.id, ...updatesB });
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('restaurant_tables').update(updatesA).eq('id', selectedTable.id);
        if (partnerTable) {
          await supabase.from('restaurant_tables').update(updatesB).eq('id', partnerTable.id);
          await supabase.from('table_merge_links').delete().eq('primary_table_id', selectedTable.id);
        }
      } catch (err) {
        console.error('Failed to sync split tables:', err);
      }
    }
  };

  const handleAddTable = async () => {
    if (profile?.role === 'waiter') {
      alert("Unauthorized: Only hosts, managers, and owners can configure floor.");
      return;
    }

    if (activeSection === 'All') {
      alert("Cannot add tables in 'All' view. Please select a specific section first.");
      return;
    }

    const nextNumber = tables.length > 0 
      ? (Math.max(...tables.map(t => parseInt(t.number) || 0)) + 1).toString()
      : "1";
    
    const activeSecId = activeSection;
    const tempId = `temp-table-${Date.now()}`;

    // Safe next-position algorithm to avoid overlaps
    const sectionTables = tables.filter(t => t.section_id === activeSecId);
    let nextX = 100;
    let nextY = 100;
    
    // Find section index to assign to quadrants
    const secIndex = sections.findIndex(s => s.id === activeSecId);
    const offsetX = secIndex >= 0 ? (secIndex % 2) * 800 : 0;
    const offsetY = secIndex >= 0 ? Math.floor(secIndex / 2) * 500 : 0;

    if (sectionTables.length > 0) {
      const count = sectionTables.length;
      const row = Math.floor(count / 5);
      const col = count % 5;
      nextX = col * 180 + 100;
      nextY = row * 180 + 100;
    }
    nextX += offsetX;
    nextY += offsetY;

    const newTable: Table = {
      id: tempId,
      store_id: profile?.active_store || '0301',
      number: nextNumber,
      capacity: 4,
      status: 'available',
      x: nextX,
      y: nextY,
      shape: 'square',
      section_id: activeSecId,
    };

    setTables(prev => [...prev, newTable]);
    setSelectedTable(newTable);

    addToOfflineQueue('insert', 'restaurant_tables', newTable);

    if (isSupabaseConfigured) {
      try {
        const payload = { ...newTable };
        delete (payload as any).id;
        const { data, error } = await supabase
          .from('restaurant_tables')
          .insert([payload])
          .select()
          .single();
        
        if (error) {
          console.error('Error adding table:', error);
          alert(`Failed to add table to database: ${error.message}`);
          setTables(prev => prev.filter(t => t.id !== tempId));
          setSelectedTable(null);
        } else if (data) {
          const mapped = {
            ...data,
            shape: data.shape || 'square',
            section_id: data.section_id || activeSecId
          };
          setTables(prev => prev.map(t => t.id === tempId ? mapped : t));
          setSelectedTable(mapped);
        }
      } catch (err: any) {
        console.error('Unexpected error adding table:', err);
        alert(`Failed to add table: ${err.message || err}`);
        setTables(prev => prev.filter(t => t.id !== tempId));
        setSelectedTable(null);
      }
    }
  };

  const handleTableTransfer = async () => {
    if (!selectedTable || !transferTargetId) return;
    
    const destTable = tables.find(t => t.id === transferTargetId);
    if (!destTable) return;
    
    if (destTable.status !== 'available') {
      alert("Transfer Blocked: Destination table must be open.");
      return;
    }

    if (selectedTable.status !== 'occupied') {
      alert("Transfer Blocked: Source table must be seated.");
      return;
    }

    const previousTables = [...tables];
    const sourceCleanState = transferCleanAction;

    const sourceUpdates = {
      status: sourceCleanState,
      guest_count: null,
      reservation_name: null,
      seated_at: null
    };

    const destUpdates = {
      status: 'occupied' as TableStatus,
      guest_count: selectedTable.guest_count,
      reservation_name: selectedTable.reservation_name,
      seated_at: selectedTable.seated_at
    };

    // Update state
    setTables(prev => prev.map(t => {
      if (t.id === selectedTable.id) return { ...t, ...sourceUpdates };
      if (t.id === destTable.id) return { ...t, ...destUpdates };
      return t;
    }));
    setSelectedTable(null);
    setTransferTargetId('');

    // Offline queue
    addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...sourceUpdates });
    addToOfflineQueue('update', 'restaurant_tables', { id: destTable.id, ...destUpdates });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('restaurant_tables').update(sourceUpdates).eq('id', selectedTable.id);
        await supabase.from('restaurant_tables').update(destUpdates).eq('id', destTable.id);

        if (selectedTable.reservation_name) {
          const { data: resData } = await supabase
            .from('reservations')
            .select('id')
            .eq('table_id', selectedTable.id)
            .eq('guest_name', selectedTable.reservation_name)
            .eq('status', 'seated')
            .limit(1);

          if (resData && resData.length > 0) {
            const resId = resData[0].id;
            await supabase.from('reservations').update({ table_id: destTable.id }).eq('id', resId);
            addToOfflineQueue('update', 'reservations', { id: resId, table_id: destTable.id });
          }
        }
      } catch (err: any) {
        console.error("Failed to transfer table:", err);
        alert(`Failed to transfer table: ${err.message || err}`);
        setTables(previousTables);
      }
    } else {
      const localRes = localStorage.getItem('table_maitre_reservations');
      if (localRes) {
        const parsed = JSON.parse(localRes);
        const updated = parsed.map((r: any) => {
          if (r.table_id === selectedTable.id && r.guest_name === selectedTable.reservation_name && r.status === 'seated') {
            return { ...r, table_id: destTable.id };
          }
          return r;
        });
        localStorage.setItem('table_maitre_reservations', JSON.stringify(updated));
      }

      const localTables = localStorage.getItem('table_maitre_tables');
      if (localTables) {
        const parsed = JSON.parse(localTables);
        const updated = parsed.map((t: any) => {
          if (t.id === selectedTable.id) return { ...t, ...sourceUpdates };
          if (t.id === destTable.id) return { ...t, ...destUpdates };
          return t;
        });
        localStorage.setItem('table_maitre_tables', JSON.stringify(updated));
      }
    }
  };

  // Drag and drop / Pan workspace helpers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing || draggingTableId) return;
    // Prevent panning when clicking on a table node or other interactive controls
    if ((e.target as HTMLElement).closest('.table-node-interactive, button, select, input')) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewState.x, y: e.clientY - viewState.y });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setViewState(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleTablePointerDown = (e: React.PointerEvent, table: Table) => {
    if (activeSection === 'All') return;
    if (!isEditing || profile?.role === 'waiter') return;
    e.stopPropagation();
    setDraggingTableId(table.id);
    setDragOffset({
      x: e.clientX - table.x,
      y: e.clientY - table.y
    });
  };

  const handleTablePointerMove = (e: React.PointerEvent, table: Table) => {
    if (draggingTableId !== table.id) return;
    e.stopPropagation();
    
    const secIndex = sections.findIndex(s => s.id === activeSection);
    const offsetX = secIndex >= 0 ? (secIndex % 2) * 800 : 0;
    const offsetY = secIndex >= 0 ? Math.floor(secIndex / 2) * 500 : 0;

    const newX = Math.round(e.clientX - dragOffset.x);
    const newY = Math.round(e.clientY - dragOffset.y);
    
    const localX = newX - offsetX;
    const localY = newY - offsetY;
    const clampedLocalX = Math.max(10, Math.min(710, localX));
    const clampedLocalY = Math.max(10, Math.min(410, localY));
    
    const finalX = clampedLocalX + offsetX;
    const finalY = clampedLocalY + offsetY;

    setTables(prev => prev.map(t => t.id === table.id ? { ...t, x: finalX, y: finalY } : t));
  };

  const handleTablePointerUp = async (e: React.PointerEvent, table: Table) => {
    if (draggingTableId !== table.id) return;
    e.stopPropagation();
    setDraggingTableId(null);

    const tableInstance = tables.find(t => t.id === table.id);
    if (!tableInstance) return;

    const previousTables = [...tables];
    const coordinates = { x: tableInstance.x, y: tableInstance.y };
    addToOfflineQueue('update', 'restaurant_tables', { id: table.id, ...coordinates });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('restaurant_tables')
          .update(coordinates)
          .eq('id', table.id);
        
        if (error) {
          console.error('Failed to update table location:', error);
          alert(`Failed to save table location in database: ${error.message}`);
          setTables(previousTables);
        }
      } catch (err: any) {
        console.error('Failed to update table location:', err);
        alert(`Failed to save table location: ${err.message || err}`);
        setTables(previousTables);
      }
    } else {
      const local = localStorage.getItem('table_maitre_tables');
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map((t: any) => t.id === table.id ? { ...t, ...coordinates } : t);
        localStorage.setItem('table_maitre_tables', JSON.stringify(updated));
      }
    }
  };

  const handleAutoArrange = async () => {
    if (activeSection === 'All') return;
    const activeSecId = activeSection;
    const sectionTables = [...tables].filter(t => t.section_id === activeSecId)
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

    if (sectionTables.length === 0) return;

    const secIndex = sections.findIndex(s => s.id === activeSecId);
    const offsetX = secIndex >= 0 ? (secIndex % 2) * 800 : 0;
    const offsetY = secIndex >= 0 ? Math.floor(secIndex / 2) * 500 : 0;

    const arrangeUpdates = sectionTables.map((table, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;
      const nextX = col * 180 + 100 + offsetX;
      const nextY = row * 180 + 100 + offsetY;
      return {
        id: table.id,
        x: nextX,
        y: nextY
      };
    });

    setTables(prev => prev.map(t => {
      const match = arrangeUpdates.find(u => u.id === t.id);
      if (match) {
        return { ...t, x: match.x, y: match.y };
      }
      return t;
    }));

    for (const update of arrangeUpdates) {
      addToOfflineQueue('update', 'restaurant_tables', { id: update.id, x: update.x, y: update.y });
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('restaurant_tables')
            .update({ x: update.x, y: update.y })
            .eq('id', update.id);
        } catch (err) {
          console.error(`Failed to auto-arrange table ${update.id}:`, err);
        }
      }
    }

    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('table_maitre_tables');
      if (local) {
        const parsed = JSON.parse(local);
        const updated = parsed.map((t: any) => {
          const match = arrangeUpdates.find(u => u.id === t.id);
          if (match) {
            return { ...t, x: match.x, y: match.y };
          }
          return t;
        });
        localStorage.setItem('table_maitre_tables', JSON.stringify(updated));
      }
    }
  };

  const handleTableContextMenu = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    if (isEditing) return;
    setQuickMenu({
      x: e.clientX,
      y: e.clientY,
      tableId
    });
  };

  const handleUpdateTableProperties = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    if (profile?.role === 'waiter') {
      alert("Unauthorized: Guest service staff are restricted from reconfiguring furniture properties.");
      return;
    }

    const previousTables = [...tables];
    const previousSelectedTable = { ...selectedTable };

    // Explicitly exclude section_name from updates as per BLOCKER 1
    const payload = {
      number: editFormData.number,
      capacity: editFormData.capacity,
      shape: editFormData.shape,
      section_id: editFormData.section_id,
      guest_count: editFormData.guest_count,
      waiter_name: editFormData.waiter_name
    };

    const updatedTable = { ...selectedTable, ...payload } as Table;
    setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
    setSelectedTable(updatedTable);
    setIsPropertyEditing(false);

    // Connect offline queue
    addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...payload });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('restaurant_tables')
          .update(payload)
          .eq('id', selectedTable.id);
        
        if (error) {
          console.error('Failed to update table attributes:', error);
          alert(`Failed to update table properties in database: ${error.message}`);
          setTables(previousTables);
          setSelectedTable(previousSelectedTable);
        }
      } catch (err: any) {
        console.error('Failed to update table attributes:', err);
        alert(`Failed to update table properties: ${err.message || err}`);
        setTables(previousTables);
        setSelectedTable(previousSelectedTable);
      }
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (profile?.role === 'waiter') {
      alert("Unauthorized: Guest service staff are restricted from deleting restaurant tables.");
      return;
    }

    const previousTables = [...tables];
    setTables(prev => prev.filter(t => t.id !== tableId));
    setSelectedTable(null);

    // Queue split / remove offline
    addToOfflineQueue('delete', 'restaurant_tables', { id: tableId });

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('restaurant_tables')
          .delete()
          .eq('id', tableId);
        
        if (error) {
          console.error('Failed to delete table:', error);
          alert(`Failed to delete table from database: ${error.message}`);
          setTables(previousTables);
        }
      } catch (err: any) {
        console.error('Failed to delete table:', err);
        alert(`Failed to delete table: ${err.message || err}`);
        setTables(previousTables);
      }
    }
  };

  const [isPropertyEditing, setIsPropertyEditing] = useState(false);

  const handleZoom = (factor: number) => {
    setViewState(prev => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2, prev.scale + factor))
    }));
  };

  const handleResetView = () => {
    setViewState({ x: 50, y: 50, scale: 0.85 });
  };

  const getElapsedTime = (seatedAt?: string) => {
    if (!seatedAt) return '';
    const seated = new Date(seatedAt).getTime();
    const diffMs = Date.now() - seated;
    const diffMins = Math.floor(diffMs / 1000 / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m ago`;
  };

  useEffect(() => {
    if (activeSection === 'All') {
      setIsEditing(false);
    }
  }, [activeSection]);

  const filteredTables = useMemo(() => {
    if (activeSection === 'All') {
      return [...tables].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    }
    return tables
      .filter(t => t.section_id === activeSection)
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [tables, activeSection]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#3ecf8e]/10 border-t-[#3ecf8e] rounded-full animate-spin mr-3" />
        <span className="text-slate-500 font-mono text-xs">Assembling layout blueprint...</span>
      </div>
    );
  }

  const sectionsToShow = sections;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-6 pb-4">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex bg-[#0f172a]/50 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setActiveSection('All')}
              className={cn("px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer", activeSection === 'All' ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              All Sections Overview
            </button>
             {sectionsToShow.map(s => (
              <div key={s.id} className="relative flex items-center">
                <button 
                  onClick={() => setActiveSection(s.id)}
                  className={cn("px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer flex items-center gap-1.5", activeSection === s.id ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300")}
                >
                  <span>{s.name}</span>
                  {isEditing && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSectionClick(s.id, s.name);
                      }}
                      className="p-0.5 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Rename section"
                    >
                      <Edit3 size={10} />
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Open
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" /> Seated
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Booked
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Floor / List Toggle inside individual section */}
          {activeSection !== 'All' && (
            <div className="flex bg-[#0f172a]/50 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => { setViewMode('floor'); setIsEditing(false); }}
                className={cn(
                  "px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer", 
                  viewMode === 'floor' ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Floor View
              </button>
              <button 
                onClick={() => { setViewMode('list'); setIsEditing(false); }}
                className={cn(
                  "px-3 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer", 
                  viewMode === 'list' ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300"
                )}
              >
                List View
              </button>
            </div>
          )}

          {profile?.role !== 'waiter' && activeSection !== 'All' && isEditing && (
            <button 
              onClick={handleAutoArrange}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-950 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-400 rounded text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-md"
              title="Auto Arrange Section Tables"
            >
              Auto Arrange
            </button>
          )}

          {profile?.role !== 'waiter' && activeSection !== 'All' && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all border shadow-lg cursor-pointer",
                isEditing 
                  ? "bg-[#3ecf8e] border-[#3ecf8e] text-[#020617] shadow-[#3ecf8e]/20" 
                  : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              )}
            >
              {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
              {isEditing ? 'Commit Changes' : 'Configure Floor'}
            </button>
          )}
          {profile?.role !== 'waiter' && activeSection !== 'All' && (
            <button 
              onClick={handleAddTable}
              className="p-2 bg-[#020617] border border-slate-800 rounded text-slate-400 hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 transition-all cursor-pointer"
              title="Add New Table"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative min-h-0 w-full h-full">
        {sections.length === 0 ? (
          <div className="w-full h-full bg-[#020617] border border-slate-800 rounded-2xl flex flex-col items-center justify-center p-10 text-center shadow-inner">
            <div className="w-16 h-16 bg-[#0f172a] rounded-2xl flex items-center justify-center text-slate-600 mb-6 border border-slate-800">
              <AlertCircle size={28} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2 tracking-tight uppercase">Empty Floor Layout</h2>
            <p className="max-w-md text-slate-500 text-xs leading-relaxed mb-6">
              There are no sections configured for this branch. You must initialize default sections to begin configuring the floor plan.
            </p>
            <button 
              onClick={handleInitializeDefaultSections}
              className="bg-[#3ecf8e] text-[#020617] px-6 py-2.5 rounded text-[10px] uppercase tracking-widest font-bold hover:brightness-110 transition-all cursor-pointer shadow-md"
            >
              Initialize Default Sections
            </button>
          </div>
        ) : activeSection === 'All' ? (
          /* Grouped Sections Overview Panel Grid */
          <div className="w-full h-full overflow-y-auto p-4 grid grid-cols-1 xl:grid-cols-2 gap-6 pb-20">
            {sections.map(s => {
              const sectionTables = tables.filter(t => t.section_id === s.id)
                .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
              const secIndex = sections.findIndex(sec => sec.id === s.id);
              const offsetX = secIndex >= 0 ? (secIndex % 2) * 800 : 0;
              const offsetY = secIndex >= 0 ? Math.floor(secIndex / 2) * 500 : 0;

              return (
                <div key={s.id} className="glass-panel border border-slate-800/80 rounded-2xl p-5 flex flex-col min-h-[360px] bg-[#07111f]/60 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/40 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#3ecf8e]">{s.name}</h3>
                    <span className="text-[10px] font-mono text-slate-500">{sectionTables.length} Tables</span>
                  </div>
                  
                  {/* Miniature Visual Layout */}
                  <div className="flex-1 relative bg-[#020617]/50 rounded-xl overflow-hidden border border-slate-900/60 min-h-[220px]">
                    <div 
                      className="absolute inset-0 opacity-[0.02] pointer-events-none" 
                      style={{
                        backgroundImage: 'radial-gradient(circle, #3ecf8e 1px, transparent 1px)', 
                        backgroundSize: '20px 20px'
                      }} 
                    />
                    {sectionTables.map(table => (
                      <div 
                        key={table.id}
                        style={{
                          position: 'absolute',
                          left: `${Math.min(90, Math.max(10, ((table.x - offsetX) / 800) * 100))}%`,
                          top: `${Math.min(90, Math.max(10, ((table.y - offsetY) / 500) * 100))}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className="z-10 select-none cursor-pointer table-node-interactive"
                        onClick={() => {
                          setSelectedTable(table);
                          setModalTab('service');
                        }}
                      >
                        <div className="scale-[0.55] origin-center">
                          <TableIcon 
                            table={table}
                            isEditing={false}
                            selectedTable={selectedTable}
                            setSelectedTable={setSelectedTable}
                            handleTableContextMenu={() => {}}
                          />
                        </div>
                      </div>
                    ))}
                    {sectionTables.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                        No tables in section
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeSection !== 'All' && viewMode === 'list' ? (
          /* List View Data Grid */
          <div className="w-full h-full bg-[#020617] border border-slate-800 rounded-2xl relative overflow-y-auto p-6 shadow-inner">
            <div className="absolute top-4 left-6 z-10 text-[9px] font-mono tracking-widest text-slate-700 uppercase pointer-events-none select-none">
              List View
            </div>
            
            <div className="mt-8 w-full">
              <div className="w-full overflow-y-auto bg-[#030712]/40 rounded-3xl border border-slate-800/40 backdrop-blur-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Manager List View — {sectionNameMap[activeSection] || 'Active Section'}
                  </h3>
                </div>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-[10px] uppercase font-mono tracking-wider text-slate-500">
                        <th className="py-3 px-4">Table</th>
                        <th className="py-3 px-4">Section</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Pax / Capacity</th>
                        <th className="py-3 px-4">Guest / Reservation</th>
                        <th className="py-3 px-4">Seated Time</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                      {filteredTables.map(t => (
                        <tr 
                          key={t.id} 
                          className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedTable(t)}
                        >
                          <td className="py-4 px-4 font-bold text-white">Table {t.number}</td>
                          <td className="py-4 px-4 text-slate-400">{sectionNameMap[t.section_id] || '-'}</td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                              t.status === 'available' && "text-emerald-400 bg-emerald-500/10",
                              t.status === 'occupied' && "text-rose-400 bg-rose-500/10",
                              t.status === 'reserved' && "text-amber-400 bg-amber-500/10",
                              t.status === 'billing' && "text-purple-400 bg-purple-500/10",
                              t.status === 'cleaning' && "text-cyan-400 bg-cyan-500/10",
                              t.status === 'blocked' && "text-slate-400 bg-slate-500/10"
                            )}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center font-mono text-slate-400">
                            <span className="font-bold text-white">{t.guest_count || 0}</span> / {t.capacity}
                          </td>
                          <td className="py-4 px-4 text-slate-400 font-medium">
                            {t.reservation_name ? (
                              <span className="text-[#3ecf8e] font-bold">{t.reservation_name}</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-500 font-mono">
                            {t.seated_at ? getElapsedTime(t.seated_at) : '-'}
                          </td>
                          <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2">
                              <select
                                value={t.status}
                                onChange={(e) => updateTableStatus(t.id, e.target.value as TableStatus)}
                                className="bg-[#0f172a] border border-slate-800 text-[10px] text-slate-300 font-bold uppercase tracking-wider px-2 py-1 rounded cursor-pointer outline-none focus:border-[#3ecf8e]/40 transition-colors"
                              >
                                <option value="available">Open Table</option>
                                <option value="occupied">Seat Guest</option>
                                <option value="reserved">Set Reserved</option>
                                <option value="billing">Request Bill</option>
                                <option value="cleaning">Send to Cleaning</option>
                                <option value="blocked">Block Table</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTables.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 uppercase tracking-widest font-mono text-[10px]">
                            No tables found in this section
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Visual Floor Canvas Container for a specific section */
          <div 
            ref={containerRef}
            className="w-full h-full bg-[#020617] border border-slate-800 rounded-2xl relative overflow-hidden shadow-inner flex items-center justify-center p-8"
          >
            <div className="absolute top-4 left-6 z-10 text-[9px] font-mono tracking-widest text-slate-700 uppercase pointer-events-none select-none">
              Floor Plan
            </div>

            <div 
              ref={floorCanvasRef}
              className="border border-slate-800/40 bg-[#030712] rounded-3xl relative"
              style={{
                width: '800px',
                height: '500px',
              }}
            >
              {/* Grid Background Pattern */}
              <div 
                className="absolute inset-0 opacity-[0.04] pointer-events-none rounded-3xl" 
                style={{
                  backgroundImage: 'radial-gradient(circle, #3ecf8e 1.5px, transparent 1.5px)', 
                  backgroundSize: '40px 40px'
                }} 
              />
              <div className="absolute inset-4 border border-slate-800/20 rounded-2xl pointer-events-none border-dashed" />
              
              {/* Tables on absolute-positioned section canvas using saved x/y */}
              {filteredTables.map(table => {
                const secIndex = sections.findIndex(s => s.id === activeSection);
                const offsetX = secIndex >= 0 ? (secIndex % 2) * 800 : 0;
                const offsetY = secIndex >= 0 ? Math.floor(secIndex / 2) * 500 : 0;
                
                return (
                  <div 
                    key={table.id}
                    onPointerDown={(e) => handleTablePointerDown(e, table)}
                    onPointerMove={(e) => handleTablePointerMove(e, table)}
                    onPointerUp={(e) => handleTablePointerUp(e, table)}
                    style={{
                      position: 'absolute',
                      left: `${table.x - offsetX}px`,
                      top: `${table.y - offsetY}px`,
                      cursor: (isEditing && profile?.role !== 'waiter') ? 'move' : 'pointer'
                    }}
                    className={cn(
                      "z-10 animate-fade-in table-node-interactive select-none touch-none flex flex-col items-center justify-center",
                      draggingTableId === table.id && "z-50 opacity-90 scale-[1.02]"
                    )}
                  >
                    <TableIcon 
                      table={table}
                      isEditing={isEditing && profile?.role !== 'waiter'}
                      selectedTable={selectedTable}
                      setSelectedTable={setSelectedTable}
                      handleTableContextMenu={handleTableContextMenu}
                    />

                    {/* Rich Details Badge under the Table Icon in View Mode */}
                    {!isEditing && (
                      <div className="mt-1 bg-[#0b1428]/95 backdrop-blur-xl border border-slate-800/85 rounded-xl px-2.5 py-1.5 flex flex-col items-center gap-0.5 text-center min-w-[110px] shadow-lg pointer-events-none">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">
                          Pax: {table.guest_count || 0}/{table.capacity}
                        </span>
                        <span className={cn(
                          "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                          table.status === 'available' && "text-emerald-400 bg-emerald-500/10",
                          table.status === 'occupied' && "text-rose-400 bg-rose-500/10",
                          table.status === 'reserved' && "text-amber-400 bg-amber-500/10",
                          table.status === 'billing' && "text-purple-400 bg-purple-500/10",
                          table.status === 'cleaning' && "text-cyan-400 bg-cyan-500/10",
                          table.status === 'blocked' && "text-slate-400 bg-slate-500/10"
                        )}>
                          {table.status}
                        </span>
                        {table.reservation_name && (
                          <span className="text-[8px] font-bold text-[#3ecf8e] truncate max-w-[100px] leading-tight" title={table.reservation_name}>
                            {table.reservation_name}
                          </span>
                        )}
                        {table.seated_at && (
                          <span className="text-[8px] font-mono text-slate-500 mt-0.5">
                            {getElapsedTime(table.seated_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedTable(null);
                setIsPropertyEditing(false);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl z-10 flex flex-col relative max-h-[90vh]"
            >
              <div className="p-6 pb-2 border-b border-slate-800/80 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white tracking-tight">Table {selectedTable.number}</span>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest font-mono border",
                        selectedTable.status === 'available' && "bg-green-500/15 text-green-400 border-green-500/20",
                        selectedTable.status === 'occupied' && "bg-[#3ecf8e]/15 text-[#3ecf8e] border-[#3ecf8e]/20",
                        selectedTable.status === 'reserved' && "bg-blue-500/15 text-blue-400 border-blue-500/20",
                        selectedTable.status === 'cleaning' && "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
                        selectedTable.status === 'blocked' && "bg-slate-700/15 text-slate-400 border-slate-700/20"
                      )}>
                        {selectedTable.status === 'available' ? 'Open' : selectedTable.status === 'occupied' ? 'Seated' : selectedTable.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-[0.2em] mt-1">
                      {sectionNameMap[selectedTable.section_id || ''] || selectedTable.section_id || 'Indoor Main'} SECTION
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedTable(null)} 
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer hover:bg-slate-800"
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>
                
                <div className="flex bg-[#0f172a]/80 p-1 rounded-xl border border-slate-800/80 mt-5">
                  <button 
                    onClick={() => setModalTab('service')}
                    className={cn(
                      "flex-1 py-2 text-[10px] uppercase tracking-widest font-bold transition-all rounded-lg flex items-center justify-center gap-2 cursor-pointer",
                      modalTab === 'service' ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Service control
                  </button>
                  {profile?.role !== 'waiter' && (
                    <button 
                      onClick={() => setModalTab('config')}
                      className={cn(
                        "flex-1 py-2 text-[10px] uppercase tracking-widest font-bold transition-all rounded-lg flex items-center justify-center gap-2 cursor-pointer",
                        modalTab === 'config' ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300"
                      )}
                    >
                      Configure Layout
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {modalTab === 'service' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#020617] p-3.5 rounded-xl border border-slate-800/60">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max Seat Capacity</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-white">{selectedTable.capacity}</span>
                          <span className="text-[9px] text-[#3ecf8e] font-mono font-semibold">SEATS</span>
                        </div>
                      </div>
                      <div className="bg-[#020617] p-3.5 rounded-xl border border-slate-800/60">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Table Structure</p>
                        <div className="text-lg font-bold text-white capitalize font-mono">
                          {selectedTable.shape}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 font-mono">Status Shift Desk</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'available', label: 'Set Open / Open Table', icon: CheckCircle2, color: 'text-green-500', bg: 'hover:bg-green-500/5' },
                          { id: 'occupied', label: 'Seat Party / Seat Guest', icon: Users, color: 'text-[#3ecf8e]', bg: 'hover:bg-[#3ecf8e]/5' },
                          { id: 'reserved', label: 'Book Spot / Reserve Table', icon: Clock, color: 'text-blue-500', bg: 'hover:bg-blue-500/5' },
                          { id: 'billing', label: 'Process Bill / Request Bill', icon: Receipt, color: 'text-purple-500', bg: 'hover:bg-purple-500/5' },
                          { id: 'cleaning', label: 'Maintain / Send to Cleaning', icon: AlertCircle, color: 'text-cyan-500', bg: 'hover:bg-cyan-500/5' },
                          { id: 'blocked', label: 'Deactivate', icon: XCircle, color: 'text-slate-600', bg: 'hover:bg-slate-700/5' },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => updateTableStatus(selectedTable.id, btn.id as TableStatus)}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all text-center group cursor-pointer",
                              selectedTable.status === btn.id 
                                ? "bg-[#0f172a] border-[#3ecf8e]/40 shadow-md" 
                                : "bg-[#020617]/50 border-slate-800/40 hover:border-slate-700",
                              btn.bg
                            )}
                          >
                            <btn.icon size={18} className={cn("transition-colors", selectedTable.status === btn.id ? btn.color : "text-slate-600 group-hover:text-slate-400")} />
                            <span className={cn("text-[9px] font-bold uppercase tracking-tight transition-colors", selectedTable.status === btn.id ? "text-slate-200" : "text-slate-500 group-hover:text-slate-400")}>
                              {btn.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedTable.status === 'occupied' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-2xl p-4 space-y-4 animate-fade-in"
                      >
                        <div className="flex items-center justify-between border-b border-[#3ecf8e]/10 pb-2">
                          <div className="flex items-center gap-2 text-[#3ecf8e]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">Active Dining Session</span>
                          </div>
                          {selectedTable.seated_at && (
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                              Seated {getElapsedTime(selectedTable.seated_at)}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Seated Guest Count</p>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={async () => {
                                  const count = Math.max(1, (selectedTable.guest_count || 1) - 1);
                                  const updates = { guest_count: count };
                                  setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, ...updates } : t));
                                  setSelectedTable(prev => prev ? { ...prev, ...updates } : null);
                                  addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...updates });
                                  if (isSupabaseConfigured) {
                                    await supabase.from('restaurant_tables').update(updates).eq('id', selectedTable.id);
                                  } else {
                                    const existing = localStorage.getItem('table_maitre_tables');
                                    if (existing) {
                                      const parsed = JSON.parse(existing);
                                      const updatedAll = parsed.map((t: any) => t.id === selectedTable.id ? { ...t, ...updates } : t);
                                      localStorage.setItem('table_maitre_tables', JSON.stringify(updatedAll));
                                    }
                                  }
                                }}
                                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-sm font-bold text-white font-mono">{selectedTable.guest_count || selectedTable.capacity}</span>
                              <button 
                                onClick={async () => {
                                  const count = Math.min(20, (selectedTable.guest_count || 1) + 1);
                                  const updates = { guest_count: count };
                                  setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, ...updates } : t));
                                  setSelectedTable(prev => prev ? { ...prev, ...updates } : null);
                                  addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...updates });
                                  if (isSupabaseConfigured) {
                                    await supabase.from('restaurant_tables').update(updates).eq('id', selectedTable.id);
                                  } else {
                                    const existing = localStorage.getItem('table_maitre_tables');
                                    if (existing) {
                                      const parsed = JSON.parse(existing);
                                      const updatedAll = parsed.map((t: any) => t.id === selectedTable.id ? { ...t, ...updates } : t);
                                      localStorage.setItem('table_maitre_tables', JSON.stringify(updatedAll));
                                    }
                                  }
                                }}
                                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Service Staff</p>
                            <input
                              type="text"
                              value={selectedTable.waiter_name || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                const updates = { waiter_name: val };
                                setTables(p => p.map(t => t.id === selectedTable.id ? { ...t, ...updates } : t));
                                setSelectedTable(p => p ? { ...p, ...updates } : null);
                                addToOfflineQueue('update', 'restaurant_tables', { id: selectedTable.id, ...updates });
                                if (isSupabaseConfigured) {
                                  await supabase.from('restaurant_tables').update(updates).eq('id', selectedTable.id);
                                } else {
                                  const existing = localStorage.getItem('table_maitre_tables');
                                  if (existing) {
                                    const parsed = JSON.parse(existing);
                                    const updatedAll = parsed.map((t: any) => t.id === selectedTable.id ? { ...t, ...updates } : t);
                                    localStorage.setItem('table_maitre_tables', JSON.stringify(updatedAll));
                                  }
                                }
                              }}
                              placeholder="Assign waiter"
                              className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-1 text-xs text-white focus:border-[#3ecf8e]/50 outline-none font-mono tracking-tight"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3 font-mono">
                      <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] select-none text-slate-400">Section Table Merge / Split Console</h4>
                      {selectedTable.merged_with ? (
                        <div className="space-y-3 text-[10px] uppercase">
                          <p className="text-[#3ecf8e] font-semibold flex items-center gap-1.5">🔗 Merged with Table {selectedTable.merged_with}</p>
                          {profile?.role !== 'waiter' && (
                            <button
                              type="button"
                              onClick={handleSplitTables}
                              className="w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[9px] font-semibold uppercase tracking-wider hover:bg-amber-500 hover:text-[#020617] transition-all cursor-pointer"
                            >
                              Break Split Association
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[9px] text-slate-600 leading-tight uppercase font-medium">Combine capacity with another active table on the floor plan.</p>
                          {profile?.role !== 'waiter' && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleMergeTables(e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-2 text-[10px] text-slate-200 focus:border-[#3ecf8e]/50 outline-none uppercase font-bold"
                            >
                              <option value="">Choose partner table...</option>
                              {tables
                                .filter(t => t.id !== selectedTable.id && !t.merged_with && t.status !== 'blocked')
                                .map(t => (
                                  <option key={t.id} value={t.id}>
                                    Table {t.number} (Cap {t.capacity})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedTable.status === 'occupied' && (
                      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3 font-mono mt-4">
                        <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] select-none text-slate-400">Section Table Transfer Console</h4>
                        <p className="text-[9px] text-slate-600 leading-tight uppercase font-medium">Relocate active dining session to another open table.</p>
                        
                        <div className="space-y-3">
                          <select
                            value={transferTargetId}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                            className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-2 text-[10px] text-slate-200 focus:border-[#3ecf8e]/50 outline-none uppercase font-bold"
                          >
                            <option value="">Select Destination Table...</option>
                            {tables
                              .filter(t => t.id !== selectedTable.id && t.status === 'available' && t.store_id === (profile?.active_store || '0301'))
                              .map(t => (
                                <option key={t.id} value={t.id}>
                                  Table {t.number} (Cap {t.capacity})
                                </option>
                              ))}
                          </select>

                          <select
                            value={transferCleanAction}
                            onChange={(e) => setTransferCleanAction(e.target.value as any)}
                            className="w-full bg-[#020617] border border-slate-800 rounded px-2.5 py-2 text-[10px] text-slate-200 focus:border-[#3ecf8e]/50 outline-none uppercase font-bold"
                          >
                            <option value="cleaning">Send Source Table to Cleaning</option>
                            <option value="available">Make Source Table Open</option>
                          </select>

                          <button
                            type="button"
                            disabled={!transferTargetId}
                            onClick={handleTableTransfer}
                            className="w-full py-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] rounded-lg text-[9px] font-semibold uppercase tracking-wider hover:bg-[#3ecf8e] hover:text-[#020617] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#3ecf8e] transition-all cursor-pointer font-bold"
                          >
                            Execute Table Transfer
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <form className="space-y-4" onSubmit={handleUpdateTableProperties}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Table Number</label>
                        <input 
                          type="text"
                          required
                          value={editFormData.number || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, number: e.target.value })}
                          className="w-full bg-[#020617] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#3ecf8e]/50 outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Max Seat Capacity</label>
                          <input 
                            type="number"
                            min="1"
                            max="20"
                            required
                            value={editFormData.capacity || 0}
                            onChange={(e) => setEditFormData({ ...editFormData, capacity: parseInt(e.target.value) || 2 })}
                            className="w-full bg-[#020617] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-[#3ecf8e]/50 outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Structure Geometry</label>
                          <select 
                            value={editFormData.shape || 'square'}
                            onChange={(e) => setEditFormData({ ...editFormData, shape: e.target.value as any })}
                            className="w-full bg-[#020617] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#3ecf8e]/50 outline-none font-mono cursor-pointer"
                          >
                            <option value="round" className="bg-[#0b0f19]">Round</option>
                            <option value="square" className="bg-[#0b0f19]">Square</option>
                            <option value="rect" className="bg-[#0b0f19]">Rectangle</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 font-mono">Floor Section</label>
                        <select 
                          value={editFormData.section_id || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, section_id: e.target.value })}
                          className="w-full bg-[#020617] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:border-[#3ecf8e]/50 outline-none font-mono cursor-pointer"
                        >
                          {sectionsToShow.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#0b0f19]">{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4 border-t border-slate-800/60">
                      <button 
                        type="submit"
                        className="flex-1 py-1.5 bg-[#3ecf8e] text-[#020617] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:brightness-110 shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer h-10"
                      >
                        <Save size={12} />
                        Update Properties
                      </button>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          if (confirm('Remove this table? This is non-reversible.')) {
                            handleDeleteTable(selectedTable.id);
                          }
                        }}
                        className="w-full py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer h-10"
                      >
                        <Trash2 size={12} />
                        Decommission Unit / Remove Table
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
