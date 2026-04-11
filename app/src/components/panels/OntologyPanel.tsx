import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Network, Target, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ContextVector, OntologyData, OntologyNode } from '@/types';

interface OntologyTreeItemProps {
  node: OntologyNode;
  level: number;
  highlightedPath: string[];
}

function OntologyTreeItem({ node, level, highlightedPath }: OntologyTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isHighlighted = highlightedPath.includes(node.id);

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, delay: level * 0.04 }}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
          'cursor-pointer hover:bg-muted/50',
          isHighlighted && 'bg-blue-500/10 ring-1 ring-blue-500/40'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
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
            'h-2 w-2 rounded-full',
            level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-blue-400' : 'bg-blue-300'
          )}
        />

        <span className={cn('text-sm', level === 0 ? 'font-semibold' : 'font-normal', isHighlighted && 'text-blue-600')}>
          {node.name}
        </span>

        <Badge variant="secondary" className="ml-auto text-xs">
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
              <OntologyTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                highlightedPath={highlightedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContextVectorChart({ vectors }: { vectors: ContextVector[] }) {
  const size = 120;
  const center = size / 2;
  const radius = 40;
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
    <div className="relative">
      <svg width={size} height={size} className="transition-transform duration-300 hover:scale-105">
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
          fill="url(#context-vector-gradient)"
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
            r="4"
            fill={point.color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.35 + index * 0.08 }}
          />
        ))}

        <defs>
          <linearGradient id="context-vector-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-2 space-y-1">
        {vectors.map((vector) => (
          <div key={vector.name} className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: vector.color }} />
            <span className="text-muted-foreground">{vector.name}</span>
            <span className="ml-auto font-medium">{Math.round(vector.value * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OntologyPanelProps {
  ontology: OntologyData;
  highlightedPath?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OntologyPanel({
  ontology,
  highlightedPath = [],
  isCollapsed = false,
  onToggleCollapse
}: OntologyPanelProps) {
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 250 }}
        animate={{ width: 60 }}
        className="flex h-full flex-col items-center gap-4 border-r border-border/50 py-4 glass"
      >
        <button onClick={onToggleCollapse} className="rounded-lg p-2 transition-colors hover:bg-muted/50">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="flex flex-col gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Network className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <Target className="h-4 w-4 text-orange-500" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
            <Zap className="h-4 w-4 text-green-500" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="flex h-full flex-col border-r border-border/50 glass"
    >
      <div className="border-b border-border/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">本体导航</span>
          </div>
          <button onClick={onToggleCollapse} className="rounded p-1 transition-colors hover:bg-muted/50">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="mb-4">
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">领域本体树</div>
            <OntologyTreeItem node={ontology.tree} level={0} highlightedPath={highlightedPath} />
          </div>

          <div className="mb-4 rounded-lg bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Target className="h-3 w-3" />
              情境联合向量
            </div>
            <ContextVectorChart vectors={ontology.contextVectors} />
          </div>

          <div className="p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3" />
              最近激活概念
            </div>
            <div className="space-y-2">
              {ontology.recentConcepts.map((concept, index) => (
                <motion.div
                  key={concept.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-muted/30 p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <span className="flex-1 text-sm">{concept.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {concept.count}
                  </Badge>
                  {concept.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {concept.trend === 'down' && <TrendingUp className="h-3 w-3 rotate-180 text-red-500" />}
                  {concept.trend === 'stable' && <div className="h-0.5 w-3 bg-gray-400" />}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
