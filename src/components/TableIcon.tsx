import React from 'react';
import { motion } from 'motion/react';
import { Table, TableStatus } from '../types';
import { cn } from '../lib/utils';

interface TableIconProps {
  table: Table;
  isEditing: boolean;
  selectedTable: Table | null;
  setSelectedTable: (table: Table | null) => void;
  handleTableContextMenu: (e: React.MouseEvent, tableId: string) => void;
}

export const getStatusColor = (status: TableStatus) => {
  switch (status) {
    case 'available': return 'bg-green-500';
    case 'occupied': return 'bg-[#3ecf8e]';
    case 'reserved': return 'bg-blue-500';
    case 'billing': return 'bg-amber-500';
    case 'cleaning': return 'bg-cyan-500';
    case 'blocked': return 'bg-slate-700';
    default: return 'bg-slate-400';
  }
};

export default function TableIcon({
  table,
  isEditing,
  selectedTable,
  setSelectedTable,
  handleTableContextMenu
}: TableIconProps) {
  const isOccupied = table.status === 'occupied' || table.status === 'billing';
  const colorClass = getStatusColor(table.status);

  const renderChairs = () => {
    const chairs = [];
    const capacity = table.capacity;

    if (table.shape === 'rect') {
      // Place chairs on long sides
      const perSide = Math.ceil(capacity / 2);
      for (let i = 0; i < perSide; i++) {
        const x = -45 + (90 / (perSide - 1 || 1)) * i;
        // Top row
        chairs.push(
          <motion.rect
            key={`top-${i}`}
            x={x - 8}
            y={-45}
            width={16}
            height={12}
            rx={3}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn("fill-slate-800/80 stroke-slate-700/50 transition-all", (isOccupied || table.status === 'reserved') && "fill-slate-700")}
          />
        );
        // Bottom row (if capacity demands)
        if (chairs.length < capacity) {
          chairs.push(
            <motion.rect
              key={`bot-${i}`}
              x={x - 8}
              y={33}
              width={16}
              height={12}
              rx={3}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn("fill-slate-800/80 stroke-slate-700/50 transition-all", (isOccupied || table.status === 'reserved') && "fill-slate-700")}
            />
          );
        }
      }
    } else {
      // Round or Square - circular placement (spaced wider apart on larger footprint)
      for (let i = 0; i < capacity; i++) {
        const angle = (360 / capacity) * i;
        const radius = table.shape === 'round' ? 54 : 50;
        const chairX = radius * Math.cos((angle * Math.PI) / 180);
        const chairY = radius * Math.sin((angle * Math.PI) / 180);
        
        chairs.push(
          <motion.rect
            key={i}
            x={chairX - 9}
            y={chairY - 9}
            width={18}
            height={18}
            rx={table.shape === 'round' ? 9 : 4}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn("fill-slate-800/80 stroke-slate-700/50 transition-all", (isOccupied || table.status === 'reserved') && "fill-slate-700")}
          />
        );
      }
    }
    return chairs;
  };

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center group",
        isEditing ? "cursor-move" : "cursor-pointer"
      )}
      onClick={() => !isEditing && setSelectedTable(table)}
      onContextMenu={(e) => handleTableContextMenu(e, table.id)}
    >
      <svg width="150" height="150" viewBox="-75 -75 150 150" className="overflow-visible">
        {renderChairs()}
        
        <motion.g
          animate={{ 
            scale: selectedTable?.id === table.id ? 1.05 : 1,
          }}
        >
          {/* Table Shadow/Depth */}
          {table.shape === 'round' ? (
            <circle r="41" className="fill-slate-900/50" cx="0" cy="2" />
          ) : table.shape === 'square' ? (
            <rect x="-39" y="-37" width="78" height="78" rx="10" className="fill-slate-900/50" />
          ) : (
            <rect x="-56" y="-31" width="112" height="62" rx="12" className="fill-slate-900/50" />
          )}

          {/* Table Body */}
          {table.shape === 'round' ? (
            <motion.circle 
              r="40" 
              className={cn(
                "transition-all duration-500 stroke-2",
                isEditing ? "stroke-[#3ecf8e]/50 fill-[#0f172a]" : "stroke-white/5 fill-[#0f172a] group-hover:stroke-[#3ecf8e]/30"
              )}
              animate={{ 
                fill: selectedTable?.id === table.id ? 'rgba(62, 207, 142, 0.05)' : 'rgba(15, 23, 42, 1)'
              }}
            />
          ) : table.shape === 'square' ? (
            <motion.rect 
              x="-38" y="-38" width="76" height="76" rx="10"
              className={cn(
                "transition-all duration-500 stroke-2",
                isEditing ? "stroke-[#3ecf8e]/50 fill-[#0f172a]" : "stroke-white/5 fill-[#0f172a] group-hover:stroke-[#3ecf8e]/30"
              )}
              animate={{ 
                fill: selectedTable?.id === table.id ? 'rgba(62, 207, 142, 0.05)' : 'rgba(15, 23, 42, 1)'
              }}
            />
          ) : (
            <motion.rect 
              x="-55" y="-30" width="110" height="60" rx="12"
              className={cn(
                "transition-all duration-500 stroke-2",
                isEditing ? "stroke-[#3ecf8e]/50 fill-[#0f172a]" : "stroke-white/5 fill-[#0f172a] group-hover:stroke-[#3ecf8e]/30"
              )}
              animate={{ 
                fill: selectedTable?.id === table.id ? 'rgba(62, 207, 142, 0.05)' : 'rgba(15, 23, 42, 1)'
              }}
            />
          )}

          {/* In-table accent */}
          {table.shape === 'round' && <circle r="28" className="fill-none stroke-white/[0.02] stroke-1" />}
          {table.shape !== 'round' && <rect x={table.shape === 'square' ? -28 : -47} y={table.shape === 'square' ? -28 : -22} width={table.shape === 'square' ? 56 : 94} height={table.shape === 'square' ? 56 : 44} rx={4} className="fill-none stroke-white/[0.02] stroke-1" />}
        </motion.g>

        {/* Status Indicator with Spring Animation and Pulse Flash on change */}
        <motion.circle 
          key={`dot-${table.status}`}
          cx="0"
          cy="0"
          r="8" 
          className={cn("stroke-[#020617] stroke-2 shadow-lg", colorClass)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 450, damping: 14 }}
        />
      </svg>
      
      {/* Table Label */}
      <div className="absolute flex flex-col items-center pointer-events-none">
        <span className="text-white text-xs font-black tracking-tight leading-none">{table.number}</span>
        {isOccupied && table.guest_count && (
          <span className="text-[9px] text-[#3ecf8e] font-mono font-bold mt-0.5">{table.guest_count}P</span>
        )}
      </div>
      
      {/* Visual links/overlays for split options */}
      {table.merged_with && (
        <span className="absolute bottom-2.5 bg-indigo-500/10 border border-indigo-500/30 text-[8px] font-mono text-indigo-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
          Merged {table.merged_with}
        </span>
      )}
    </div>
  );
}
