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
  XCircle
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
          setSections(JSON.parse(local));
          return;
        }
        const demoSecs = [
          { id: 'Indoor Main', store_id: storeId, name: 'Indoor Main' },
          { id: 'Outdoor Terrace', store_id: storeId, name: 'Outdoor Terrace' },
          { id: 'VIP Lounge', store_id: storeId, name: 'VIP Lounge' },
          { id: 'Garden Area', store_id: storeId, name: 'Garden Area' }
        ];
        localStorage.setItem('table_maitre_sections', JSON.stringify(demoSecs));
        setSections(demoSecs);
        return;
      }

      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .eq('store_id', storeId);

      if (error) {
        console.error('Error loading sections:', error);
      } else if (data && data.length > 0) {
        setSections(data);
      } else {
        const demoSecs = [
          { id: 'Indoor Main', store_id: storeId, name: 'Indoor Main' },
          { id: 'Outdoor Terrace', store_id: storeId, name: 'Outdoor Terrace' },
          { id: 'VIP Lounge', store_id: storeId, name: 'VIP Lounge' },
          { id: 'Garden Area', store_id: storeId, name: 'Garden Area' }
        ];
        setSections(demoSecs);
        try {
          await supabase.from('sections').insert(demoSecs);
        } catch (err) {
          console.error('Failed to seed sections:', err);
        }
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
        setTables(getDemoTables(storeId));
      } else {
        const mapped = (data || []).map((t: any) => ({
          ...t,
          shape: t.shape || t.type || 'square',
          section_id: t.section_id || 'Indoor Main'
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
        section_id: sec,
        guest_count: i % 5 === 0 ? Math.ceil(Math.random() * 4) : undefined,
        waiter_name: i % 5 === 0 ? 'John' : undefined,
        seated_at: i % 5 === 0 ? new Date(Date.now() - 1000 * 60 * 45).toISOString() : undefined,
      };
    });
  }

  const updateTableStatus = async (tableId: string, status: TableStatus) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

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
      alert("Unauthorized: Only hosts, managers, and owners can configure resources.");
      return;
    }

    const nextNumber = tables.length > 0 
      ? (Math.max(...tables.map(t => parseInt(t.number) || 0)) + 1).toString()
      : "1";
    
    const activeSecId = activeSection === 'All' ? (sections[0]?.id || 'Indoor Main') : activeSection;
    const tempId = `temp-table-${Date.now()}`;

    const newTable: Table = {
      id: tempId,
      store_id: profile?.active_store || '0301',
      number: nextNumber,
      capacity: 4,
      status: 'available',
      x: 200,
      y: 200,
      shape: 'square',
      section_id: activeSecId,
    };

    setTables(prev => [...prev, newTable]);
    setSelectedTable(newTable);

    // Queue split operation offline
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
          // Revert state
          setTables(prev => prev.filter(t => t.id !== tempId));
          setSelectedTable(null);
        } else if (data) {
          const mapped = {
            ...data,
            shape: data.shape || 'square',
            section_id: data.section_id || 'Indoor Main'
          };
          setTables(prev => prev.map(t => t.id === tempId ? mapped : t));
          setSelectedTable(mapped);
        }
      } catch (err: any) {
        console.error('Unexpected error adding table:', err);
        alert(`Failed to add table: ${err.message || err}`);
        // Revert state
        setTables(prev => prev.filter(t => t.id !== tempId));
        setSelectedTable(null);
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
    if (!isEditing || profile?.role === 'waiter') return;
    e.stopPropagation();
    setDraggingTableId(table.id);
    setDragOffset({
      x: (e.clientX / viewState.scale) - table.x,
      y: (e.clientY / viewState.scale) - table.y
    });
  };

  const handleTablePointerMove = (e: React.PointerEvent, table: Table) => {
    if (draggingTableId !== table.id) return;
    e.stopPropagation();
    const newX = Math.round((e.clientX / viewState.scale) - dragOffset.x);
    const newY = Math.round((e.clientY / viewState.scale) - dragOffset.y);
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, x: newX, y: newY } : t));
  };

  const handleTablePointerUp = async (e: React.PointerEvent, table: Table) => {
    if (draggingTableId !== table.id) return;
    e.stopPropagation();
    setDraggingTableId(null);

    const tableInstance = tables.find(t => t.id === table.id);
    if (!tableInstance) return;

    const previousTables = [...tables];

    // Connect movement to offline queue
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

  const filteredTables = useMemo(() => {
    if (activeSection === 'All') {
      return tables;
    }
    return tables.filter(t => {
      // Dynamic mapping for backwards compatibility
      const mappedName = sectionNameMap[t.section_id] || t.section_id;
      const targetName = sectionNameMap[activeSection] || activeSection;
      return t.section_id === activeSection || mappedName === targetName;
    }).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  }, [tables, activeSection, sectionNameMap]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#3ecf8e]/10 border-t-[#3ecf8e] rounded-full animate-spin mr-3" />
        <span className="text-slate-500 font-mono text-xs">Assembling layout blueprint...</span>
      </div>
    );
  }

  const sectionsToShow = sections.length > 0 ? sections : [
    { id: 'Indoor Main', name: 'Indoor Main' },
    { id: 'Outdoor Terrace', name: 'Outdoor Terrace' },
    { id: 'VIP Lounge', name: 'VIP Lounge' },
    { id: 'Garden Area', name: 'Garden Area' }
  ];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden p-6 pb-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <div className="flex bg-[#0f172a]/50 p-1 rounded-lg border border-slate-800">
            <button 
              onClick={() => setActiveSection('All')}
              className={cn("px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer", activeSection === 'All' ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300")}
            >
              All
            </button>
            {sectionsToShow.map(s => (
              <button 
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn("px-4 py-1.5 rounded text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer", activeSection === s.id ? "bg-slate-800 text-[#3ecf8e] shadow-sm" : "text-slate-500 hover:text-slate-300")}
              >
                {s.name}
              </button>
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
          {profile?.role !== 'waiter' && activeSection === 'All' && (
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
          {profile?.role !== 'waiter' && (
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
        <div 
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full bg-[#020617] border border-slate-800 rounded-2xl relative overflow-hidden shadow-inner touch-none select-none"
        >
          <div className="absolute top-4 left-6 z-10 text-[9px] font-mono tracking-widest text-slate-700 uppercase pointer-events-none select-none">
            Primary Layout Workspace
          </div>
           
          <motion.div 
            ref={floorCanvasRef}
            className={cn(
              "origin-top-left relative transition-transform duration-75",
              activeSection !== 'All' 
                ? "w-full h-full p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 content-start overflow-y-auto" 
                : "border border-slate-800/40 bg-[#030712] rounded-3xl"
            )}
            animate={activeSection === 'All' ? { 
              scale: viewState.scale 
            } : {}}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 28,
              mass: 0.5
            }}
            style={activeSection === 'All' ? { 
              width: '2400px',
              height: '1400px',
              transform: `translate(${viewState.x}px, ${viewState.y}px)`,
              transformOrigin: 'top left'
            } : {}}
            onWheel={(e) => {
              if (activeSection === 'All') {
                const delta = e.deltaY > 0 ? -0.05 : 0.05;
                handleZoom(delta);
              }
            }}
          >
            {activeSection === 'All' && (
              <>
                <div 
                  className="absolute inset-0 opacity-[0.04] pointer-events-none rounded-3xl" 
                  style={{
                    backgroundImage: 'radial-gradient(circle, #3ecf8e 1.5px, transparent 1.5px)', 
                    backgroundSize: '40px 40px'
                  }} 
                />
                <div className="absolute inset-4 border border-slate-800/20 rounded-2xl pointer-events-none border-dashed" />
                
                <div className="absolute top-8 left-8 right-8 flex justify-between text-[10px] font-mono font-bold text-slate-800 select-none pointer-events-none">
                  <span>SECTOR-A</span>
                  <span>SECTOR-B</span>
                  <span>SECTOR-C</span>
                  <span>SECTOR-D</span>
                </div>
              </>
            )}

            {filteredTables.map(table => (
              <div 
                key={table.id}
                onPointerDown={(e) => handleTablePointerDown(e, table)}
                onPointerMove={(e) => handleTablePointerMove(e, table)}
                onPointerUp={(e) => handleTablePointerUp(e, table)}
                style={activeSection === 'All' ? { 
                  position: 'absolute', 
                  left: `${table.x}px`, 
                  top: `${table.y}px`,
                  cursor: (isEditing && profile?.role !== 'waiter') ? 'move' : 'pointer'
                } : { position: 'relative' }}
                className={cn(
                  "z-10 animate-fade-in table-node-interactive select-none touch-none",
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
              </div>
            ))}
          </motion.div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#3ecf8e]/3 rounded-full blur-[100px] pointer-events-none" />

          <AnimatePresence>
            {quickMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ left: quickMenu.x - 200, top: quickMenu.y - 120 }}
                className="absolute z-[100] w-48 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-1 backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-slate-800/50 mb-1">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Quick Status Shift</p>
                </div>
                {[
                  { id: 'available', label: 'Set Available', icon: CheckCircle2, color: 'text-green-500' },
                  { id: 'occupied', label: 'Seat Guests', icon: Users, color: 'text-[#3ecf8e]' },
                  { id: 'reserved', label: 'Mark Reserved', icon: Clock, color: 'text-blue-500' },
                  { id: 'cleaning', label: 'Maintenance', icon: AlertCircle, color: 'text-cyan-500' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => {
                      updateTableStatus(quickMenu.tableId, btn.id as TableStatus);
                      setQuickMenu(null);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-tight text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                  >
                    <btn.icon size={12} className={btn.color} />
                    {btn.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {activeSection === 'All' && (
            <div className="absolute bottom-6 left-6 flex items-center gap-2">
              <div className="flex bg-[#0f172a]/80 backdrop-blur border border-slate-800 rounded overflow-hidden">
                <button 
                  onClick={() => handleZoom(0.1)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border-r border-slate-800 cursor-pointer"
                >
                  <Plus size={14} />
                </button>
                <button 
                  onClick={() => handleZoom(-0.1)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all border-r border-slate-800 cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <button 
                  onClick={handleResetView}
                  className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#3ecf8e] hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Reset
                </button>
              </div>
              <div className="px-3 py-1.5 bg-[#0f172a]/80 backdrop-blur border border-slate-800 rounded text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Maximize2 size={12} className="text-[#3ecf8e]/50" />
                Zoom: {Math.round(viewState.scale * 100)}%
              </div>
            </div>
          )}
        </div>
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
                        {selectedTable.status}
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
                          { id: 'available', label: 'Set Open', icon: CheckCircle2, color: 'text-green-500', bg: 'hover:bg-green-500/5' },
                          { id: 'occupied', label: 'Seat Party', icon: Users, color: 'text-[#3ecf8e]', bg: 'hover:bg-[#3ecf8e]/5' },
                          { id: 'reserved', label: 'Book Spot', icon: Clock, color: 'text-blue-500', bg: 'hover:bg-blue-500/5' },
                          { id: 'cleaning', label: 'Maintain', icon: AlertCircle, color: 'text-cyan-500', bg: 'hover:bg-cyan-500/5' },
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
                  </>
                ) : (
                  <form className="space-y-4" onSubmit={handleUpdateTableProperties}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Table Unit ID / Number</label>
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
                        <label className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Establishment Sector</label>
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
                          if (confirm('Decommission this unit? This is non-reversible.')) {
                            handleDeleteTable(selectedTable.id);
                          }
                        }}
                        className="w-full py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer h-10"
                      >
                        <Trash2 size={12} />
                        Decommission Unit
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
