/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Copy, Check, Users, ShieldAlert, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Memento Mori Character Icon API
const getIconUrl = (id: number) => `https://api.tamamo.dev/Generate/Character?icon=${id}`;
const TOTAL_CHARACTERS = 141;
const MAX_TEAM_SIZE = 5;

const ATTRIBUTES = [
  { id: "all", name: "全部", color: "bg-white/10" },
  { id: "azure", name: "藍", color: "bg-blue-500/40" },
  { id: "crimson", name: "紅", color: "bg-red-500/40" },
  { id: "emerald", name: "翠", color: "bg-green-500/40" },
  { id: "amber", name: "黄", color: "bg-yellow-500/40" },
  { id: "light", name: "天", color: "bg-white/60" },
  { id: "dark", name: "冥", color: "bg-purple-600/60" },
];

const getAttributeById = (id: number): string => {
  const azure = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 52, 57, 59, 64, 68, 74, 77, 79, 84, 95, 101, 106, 123, 131, 134];
  const crimson = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 51, 54, 58, 62, 72, 75, 85, 89, 93, 99, 102, 107, 112, 122, 130];
  const emerald = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 55, 56, 60, 70, 76, 80, 82, 103, 108, 111, 114, 116, 124, 132];
  const amber = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 53, 66, 67, 71, 73, 78, 81, 83, 96, 100, 113, 115, 126, 135, 139];
  const light = [41, 42, 43, 44, 45, 65, 86, 88, 109, 117, 121, 128, 141];
  const dark = [46, 47, 48, 49, 50, 61, 63, 69, 87, 105, 125, 129, 137];

  if (azure.includes(id)) return "azure";
  if (crimson.includes(id)) return "crimson";
  if (emerald.includes(id)) return "emerald";
  if (amber.includes(id)) return "amber";
  if (light.includes(id)) return "light";
  if (dark.includes(id)) return "dark";
  return "all";
};

interface Team {
  id: string;
  name: string;
  members: (number | null)[];
}

interface PoolIconProps {
  key?: any;
  id: number;
  isUsed: boolean;
  onClick: (id: number) => void;
  onImageError: (id: number) => void;
}

// Draggable item for the character pool
function DraggablePoolIcon({ id, isUsed, onClick, onImageError }: PoolIconProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${id}`,
    data: { type: 'pool', charId: id },
    disabled: isUsed
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={!isUsed ? { scale: 1.05 } : {}}
      whileTap={!isUsed ? { scale: 0.95 } : {}}
      className={`relative w-full aspect-square rounded-lg overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
        isUsed 
          ? "border-mori-gold opacity-40 grayscale pointer-events-none" 
          : isDragging ? "z-50 border-mori-gold ring-2 ring-mori-gold" : "border-white/10 hover:border-mori-gold/50"
      }`}
      onClick={() => !isUsed && onClick(id)}
    >
      <img
        src={getIconUrl(id)}
        alt={`Char ${id}`}
        className="w-full h-full object-cover pointer-events-none"
        onError={() => onImageError(id)}
        referrerPolicy="no-referrer"
      />
      {isUsed && (
        <div className="absolute inset-0 bg-mori-gold/10 flex items-center justify-center pointer-events-none">
          <Check className="text-mori-gold" size={20} strokeWidth={3} />
        </div>
      )}
    </motion.div>
  );
}

// Draggable item for team members
function DraggableMember({ id, teamId, slotIdx, onRemove }: { id: number; teamId: string; slotIdx: number; onRemove: (tid: string, cid: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `member-${teamId}-${slotIdx}-${id}`,
    data: { type: 'member', charId: id, teamId, slotIdx }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-full h-full rounded-lg overflow-hidden border border-white/20 group animate-in zoom-in-50 duration-300 ${isDragging ? 'z-50 opacity-40 shadow-2xl' : ''}`}
    >
      <img
        src={getIconUrl(id)}
        alt={`Team Char ${id}`}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
      
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="text-white/70" size={24} />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(teamId, id);
        }}
        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 z-10"
      >
        <X className="text-white" size={12} />
      </button>
    </div>
  );
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>([
    { id: crypto.randomUUID(), name: "第1編成", members: Array(MAX_TEAM_SIZE).fill(null) }
  ]);
  const [invalidIds, setInvalidIds] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Derived state: Chars already used in any team
  const usedCharacterIds = useMemo(() => {
    const used = new Set<number>();
    teams.forEach(team => team.members.forEach(id => {
      if (id !== null) used.add(id);
    }));
    return used;
  }, [teams]);

  // Handle character selection
  const toggleCharacter = (id: number) => {
    // If already used, find and remove
    if (usedCharacterIds.has(id)) {
      setTeams(prev => prev.map(team => ({
        ...team,
        members: team.members.map(m => m === id ? null : m)
      })));
      return;
    }

    // Otherwise, add to the first team with an empty slot
    const targetTeamIdx = teams.findIndex(team => team.members.some(m => m === null));
    
    if (targetTeamIdx !== -1) {
      setTeams(prev => {
        const next = [...prev];
        const emptySlotIdx = next[targetTeamIdx].members.findIndex(m => m === null);
        const newMembers = [...next[targetTeamIdx].members];
        newMembers[emptySlotIdx] = id;
        next[targetTeamIdx] = {
          ...next[targetTeamIdx],
          members: newMembers
        };
        return next;
      });
    }
  };

  const removeMember = (teamId: string, charId: number) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId 
        ? { ...team, members: team.members.map(m => m === charId ? null : m) }
        : team
    ));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // SCENARIO 1: Drag from pool to team slot
    if (activeData?.type === 'pool' && overData?.type === 'member') {
      const charId = activeData.charId;
      const targetTeamId = overData.teamId;
      const targetSlotIdx = overData.slotIdx;

      setTeams(prev => prev.map(team => {
        if (team.id === targetTeamId) {
          const newMembers = [...team.members];
          newMembers[targetSlotIdx] = charId;
          return { ...team, members: newMembers };
        }
        return team;
      }));
    }

    // SCENARIO 2: Reorder within team or move between teams
    if (activeData?.type === 'member') {
      const activeCharId = activeData.charId;
      const activeTeamId = activeData.teamId;
      const activeSlotIdx = activeData.slotIdx;
      
      if (overData?.type === 'member') {
        const overTeamId = overData.teamId;
        const overSlotIdx = overData.slotIdx;
        const overCharId = overData.charId; // Might be null

        setTeams(prev => {
          const next = [...prev];
          const fromTeamIdx = next.findIndex(t => t.id === activeTeamId);
          const toTeamIdx = next.findIndex(t => t.id === overTeamId);

          if (fromTeamIdx === -1 || toTeamIdx === -1) return prev;

          const fromMembers = [...next[fromTeamIdx].members];
          const toMembers = (fromTeamIdx === toTeamIdx) ? fromMembers : [...next[toTeamIdx].members];

          // Swap or move
          if (fromTeamIdx === toTeamIdx) {
            [fromMembers[activeSlotIdx], fromMembers[overSlotIdx]] = [fromMembers[overSlotIdx], fromMembers[activeSlotIdx]];
            next[fromTeamIdx] = { ...next[fromTeamIdx], members: fromMembers };
          } else {
            toMembers[overSlotIdx] = activeCharId;
            fromMembers[activeSlotIdx] = overCharId; // Swap with target (might be target char or null)
            next[fromTeamIdx] = { ...next[fromTeamIdx], members: fromMembers };
            next[toTeamIdx] = { ...next[toTeamIdx], members: toMembers };
          }

          return next;
        });
      }
    }
  };

  const addNewTeam = () => {
    setTeams(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: `第${prev.length + 1}編成`, members: Array(MAX_TEAM_SIZE).fill(null) }
    ]);
  };

  const deleteTeam = (id: string) => {
    if (teams.length <= 1) return;
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const copyResults = () => {
    const text = teams
      .map(t => {
        const activeMembers = t.members.filter(m => m !== null);
        return `${t.name}: ${activeMembers.length > 0 ? activeMembers.join(", ") : "なし"}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAllTeams = () => {
    if (confirm("すべての編成をリセットしますか？")) {
      setTeams([{ id: crypto.randomUUID(), name: "第1編成", members: Array(MAX_TEAM_SIZE).fill(null) }]);
    }
  };

  // Mark an icon as invalid if it fails to load
  const handleImageError = (id: number) => {
    setInvalidIds(prev => new Set(prev).add(id));
  };

  const filteredCharacterIds = useMemo(() => {
    return Array.from({ length: TOTAL_CHARACTERS }, (_, i) => i + 1)
      .filter(id => !invalidIds.has(id))
      .filter(id => activeTab === "all" || getAttributeById(id) === activeTab);
  }, [activeTab, invalidIds]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div id="deck-simulator" className="min-h-screen bg-mori-dark pb-32">
      {/* Header */}
      <header className="p-6 border-b border-white/10 sticky top-0 bg-mori-dark/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-center">
            <h1 className="text-3xl font-serif text-mori-gold tracking-wider">
              MEMENTO MORI
            </h1>
            <p className="text-xs text-white/50 uppercase tracking-[0.2em] mt-1">
              Deck Builder : Guild Battle
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearAllTeams}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-full transition-all text-sm"
              id="clear-all-button"
            >
              <Trash2 size={16} />
              <span>リセット</span>
            </button>
            <button
              onClick={copyResults}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm"
              id="copy-button"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              <span>{copied ? "コピーした！" : "結果をコピー"}</span>
            </button>
            <button
              onClick={addNewTeam}
              className="flex items-center gap-2 px-4 py-2 bg-mori-gold/20 hover:bg-mori-gold/30 border border-mori-gold/40 text-mori-gold rounded-full transition-all text-sm"
              id="add-team-button"
            >
              <Plus size={16} />
              <span>編成追加</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 pb-[320px]">
        {/* Teams Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="teams-container">
          <AnimatePresence mode="popLayout">
            {teams.map((team, idx) => (
              <motion.div
                key={team.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`memento-glass rounded-xl p-4 relative group transition-all border-2 ${
                  team.members.length < MAX_TEAM_SIZE 
                    ? "border-mori-gold/20" 
                    : "border-transparent bg-white/[0.05]"
                }`}
                id={`team-card-${idx}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-mori-gold/20 text-mori-gold px-1.5 py-0.5 rounded font-mono">
                      #{idx + 1}
                    </span>
                    <input 
                      type="text" 
                      value={team.name}
                      onChange={(e) => setTeams(prev => prev.map(t => t.id === team.id ? {...t, name: e.target.value} : t))}
                      className="bg-transparent border-none p-0 focus:ring-0 text-white font-medium text-sm w-24"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 uppercase">
                      {team.members.length} / {MAX_TEAM_SIZE}
                    </span>
                    {teams.length > 1 && (
                      <button 
                        onClick={() => deleteTeam(team.id)}
                        className="text-white/20 hover:text-red-400 transition-colors p-1"
                        title="編成削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 h-14">
                  {Array.from({ length: MAX_TEAM_SIZE }).map((_, slotIdx) => {
                    const memberId = team.members[slotIdx];
                    return (
                      <TeamSlot 
                        key={`slot-${team.id}-${slotIdx}`}
                        charId={memberId || undefined}
                        teamId={team.id}
                        slotIdx={slotIdx}
                        onRemove={removeMember}
                      />
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Character Pool - Bottom Drawer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-mori-dark/95 backdrop-blur-2xl border-t border-white/10 p-4 shadow-2xl z-[100]" id="character-pool">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-white/40 flex items-center gap-2">
                <ShieldAlert size={12} />
                キャラクター一覽 ({usedCharacterIds.size} / {TOTAL_CHARACTERS - invalidIds.size})
              </span>
            </div>

            {/* Tabs */}
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 overflow-x-auto max-w-full">
              {ATTRIBUTES.map((attr) => (
                <button
                  key={attr.id}
                  onClick={() => setActiveTab(attr.id)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === attr.id 
                      ? `${attr.color} text-white shadow-lg` 
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${attr.color}`} />
                  {attr.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-mori-gold" 
              animate={{ width: `${(usedCharacterIds.size / (TOTAL_CHARACTERS - invalidIds.size)) * 100}%` }}
            />
          </div>

          <div className="h-[220px] overflow-y-auto pr-2 custom-scrollbar pb-10">
            <div 
              key={activeTab}
              className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-15 gap-4 content-start"
            >
              {filteredCharacterIds.map((id) => (
                <DraggablePoolIcon 
                  key={id} 
                  id={id} 
                  isUsed={usedCharacterIds.has(id)} 
                  onClick={toggleCharacter}
                  onImageError={handleImageError}
                />
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.4',
            },
          },
        }),
      }}>
        {activeId ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden border border-mori-gold shadow-2xl ring-2 ring-mori-gold/50 z-[9999]">
            <img
              src={getIconUrl(parseInt(activeId.split('-').pop() || "1"))}
              alt="Dragging"
              className="w-full h-full object-cover shadow-inner"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-mori-ethereal/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-mori-gold/5 rounded-full blur-[120px]" />
      </div>
    </div>
    </DndContext>
  );
}

interface TeamSlotProps {
  key?: any;
  charId: number | undefined;
  teamId: string;
  slotIdx: number;
  onRemove: (tid: string, cid: number) => void;
}

// Separate component for the team slot to use as a droppable
function TeamSlot({ charId, teamId, slotIdx, onRemove }: TeamSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${teamId}-${slotIdx}`,
    data: { type: 'member', teamId, charId, slotIdx }
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative w-full aspect-square rounded-lg border border-dashed flex items-center justify-center overflow-hidden transition-all ${
        isOver 
          ? "border-mori-gold bg-mori-gold/10 scale-105 z-10 shadow-[0_0_15px_rgba(235,182,100,0.3)]" 
          : "border-white/5 bg-white/5"
      }`}
    >
      {charId ? (
        <DraggableMember
          id={charId}
          teamId={teamId}
          slotIdx={slotIdx}
          onRemove={onRemove}
        />
      ) : (
        <Users className="text-white/5 font-mono" size={16} />
      )}
    </div>
  );
}
