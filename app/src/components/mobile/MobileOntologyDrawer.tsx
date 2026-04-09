import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Network, Search, Target, TrendingUp, X, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ContextVector, OntologyData, OntologyNode } from '@/types';

interface OntologyTreeItemProps {
  node: OntologyNode;
  level: number;
  searchQuery: string;
}

function OntologyTreeItem({ node, level, searchQuery }: OntologyTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const matchesSearch = searchQuery.trim().length > 0 && node.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50 active:bg-muted',
          matchesSearch && 'bg-amber-500/10'
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => {
          if (hasChildren) {
            setIsExpanded((current) => !current);
          }
        }}
      >
        {hasChildren ? (
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        ) : (
          <div className="h-4 w-4" />
        )}

        <div
          className={cn(
            'h-2.5 w-2.5 rounded-full',
            level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-blue-400' : 'bg-blue-300'
          )}
        />

        <span className={cn('flex-1 text-sm', level === 0 ? 'font-semibold' : 'font-normal')}>{node.name}</span>

        <Badge variant="secondary" className="text-xs">
          {Math.round(node.weight * 100)}%
        </Badge>
      </motion.div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {node.children?.map((child) => (
              <OntologyTreeItem key={child.id} node={child} level={level + 1} searchQuery={searchQuery} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileRadarChart({ vectors }: { vectors: ContextVector[] }) {
  const size = 140;
  const center = size / 2;
  const radius = 50;
  const angleStep = (Math.PI * 2) / vectors.length;

  const points = vectors.map((vector, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const pointRadius = radius * vector.value;
    return {
      ...vector,
      x: center + pointRadius * Math.cos(angle),
      y: center + pointRadius * Math.sin(angle)
    };
  });

  const pathData = `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="my-4">
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
          <circle
            key={scale}
            cx={center}
            cy={center}
            r={radius * scale}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground/20"
          />
        ))}

        {vectors.map((_, index) => {
          const angle = index * angleStep - Math.PI / 2;
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/20"
            />
          );
        })}

        <motion.path
          d={pathData}
          fill="url(#mobile-context-gradient)"
          stroke="#3b82f6"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 0.8 }}
        />

        {points.map((point, index) => (
          <motion.circle
            key={point.name}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={point.color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35 + index * 0.08 }}
          />
        ))}

        <defs>
          <linearGradient id="mobile-context-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex flex-wrap justify-center gap-3">
        {vectors.map((vector) => (
          <div key={vector.name} className="flex items-center gap-1.5 text-xs">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: vector.color }} />
            <span className="text-muted-foreground">{vector.name}</span>
            <span className="font-medium">{Math.round(vector.value * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MobileOntologyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ontology: OntologyData;
}

export function MobileOntologyDrawer({ isOpen, onClose, ontology }: MobileOntologyDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'tree' | 'vector' | 'recent'>('tree');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-3xl bg-background"
          >
            <div className="flex justify-center pb-1 pt-3" onClick={onClose}>
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="border-b border-border/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-blue-500" />
                  <span className="text-lg font-semibold">本体导航</span>
                </div>
                <button onClick={onClose} className="rounded-full p-2 hover:bg-muted/50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                {[
                  { id: 'tree', label: '本体树', icon: Network },
                  { id: 'vector', label: '情境向量', icon: Target },
                  { id: 'recent', label: '激活概念', icon: Zap }
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as typeof activeSection)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                      activeSection === section.id ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <section.icon className="h-3.5 w-3.5" />
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[calc(85vh-140px)]">
              <div className="p-4">
                {activeSection === 'tree' && (
                  <div>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="搜索本体概念..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <OntologyTreeItem node={ontology.tree} level={0} searchQuery={searchQuery} />
                    </div>
                  </div>
                )}

                {activeSection === 'vector' && (
                  <div className="py-4">
                    <div className="mb-2 text-center text-sm text-muted-foreground">当前激活的情境联合向量</div>
                    <MobileRadarChart vectors={ontology.contextVectors} />
                    <div className="mt-6 rounded-xl bg-muted/50 p-4">
                      <h4 className="mb-2 font-medium">向量说明</h4>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        这里展示的是当前评审过程中，各类本体维度的权重分布。数值越高，说明系统越倾向在该维度上补充依据与判断。
                      </p>
                    </div>
                  </div>
                )}

                {activeSection === 'recent' && (
                  <div className="space-y-3">
                    <div className="mb-4 text-sm text-muted-foreground">本次评审中高频使用的本体节点</div>
                    {ontology.recentConcepts.map((concept, index) => (
                      <motion.div
                        key={concept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 rounded-xl bg-muted/50 p-4"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                          <Zap className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{concept.name}</div>
                          <div className="text-xs text-muted-foreground">引用 {concept.count} 次</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {concept.trend === 'up' && (
                            <Badge className="bg-green-500/10 text-green-600">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              上升
                            </Badge>
                          )}
                          {concept.trend === 'down' && (
                            <Badge className="bg-red-500/10 text-red-600">
                              <TrendingUp className="mr-1 h-3 w-3 rotate-180" />
                              下降
                            </Badge>
                          )}
                          {concept.trend === 'stable' && <Badge variant="secondary">稳定</Badge>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
