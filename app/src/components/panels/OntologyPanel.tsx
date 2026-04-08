import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Search, Network, Zap, Target, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { OntologyNode, ContextVector } from '@/types';

const mockOntology: OntologyNode = {
  id: 'root',
  name: '科研项目评审',
  weight: 1,
  children: [
    {
      id: 'innovation',
      name: '创新性',
      weight: 0.25,
      children: [
        { id: 'novelty', name: '技术新颖性', weight: 0.6 },
        { id: 'advancement', name: '技术先进性', weight: 0.4 },
      ],
    },
    {
      id: 'feasibility',
      name: '可行性',
      weight: 0.3,
      children: [
        { id: 'tech-maturity', name: '技术成熟度', weight: 0.4 },
        { id: 'team-capability', name: '团队能力', weight: 0.35 },
        { id: 'resource-guarantee', name: '资源保障', weight: 0.25 },
      ],
    },
    {
      id: 'team',
      name: '团队实力',
      weight: 0.2,
      children: [
        { id: 'pi-experience', name: '负责人经验', weight: 0.5 },
        { id: 'team-structure', name: '团队结构', weight: 0.3 },
        { id: 'cooperation', name: '协作基础', weight: 0.2 },
      ],
    },
    {
      id: 'budget',
      name: '预算合理性',
      weight: 0.15,
      children: [
        { id: 'cost-estimate', name: '成本估算', weight: 0.5 },
        { id: 'funding-plan', name: '经费计划', weight: 0.5 },
      ],
    },
    {
      id: 'risk',
      name: '风险管控',
      weight: 0.1,
      children: [
        { id: 'tech-risk', name: '技术风险', weight: 0.6 },
        { id: 'mgmt-risk', name: '管理风险', weight: 0.4 },
      ],
    },
  ],
};

const mockContextVectors: ContextVector[] = [
  { name: '需求本体', value: 0.6, color: '#3b82f6' },
  { name: '方案本体', value: 0.3, color: '#f97316' },
  { name: '风险本体', value: 0.1, color: '#ef4444' },
];

const mockRecentConcepts = [
  { id: '1', name: '技术成熟度', count: 12, trend: 'up' },
  { id: '2', name: '团队能力', count: 8, trend: 'stable' },
  { id: '3', name: '创新性', count: 6, trend: 'up' },
  { id: '4', name: '预算合理性', count: 4, trend: 'down' },
];

interface OntologyTreeItemProps {
  node: OntologyNode;
  level: number;
  searchQuery: string;
  highlightedPath: string[];
}

function OntologyTreeItem({ node, level, searchQuery, highlightedPath }: OntologyTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isHighlighted = highlightedPath.includes(node.id);
  const matchesSearch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: level * 0.05 }}
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-all duration-200',
          'hover:bg-muted/50',
          isHighlighted && 'bg-blue-500/10 ring-1 ring-blue-500/50',
          matchesSearch && 'bg-amber-500/10',
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={toggleExpand}
      >
        {hasChildren ? (
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        ) : (
          <div className="w-4" />
        )}

        <div
          className={cn(
            'w-2 h-2 rounded-full',
            level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-blue-400' : 'bg-blue-300',
          )}
        />

        <span
          className={cn(
            'text-sm',
            level === 0 ? 'font-semibold' : 'font-normal',
            isHighlighted && 'text-blue-600 font-medium',
          )}
        >
          {node.name}
        </span>

        {node.weight > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {(node.weight * 100).toFixed(0)}%
          </Badge>
        )}
      </motion.div>

      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {node.children?.map((child) => (
              <OntologyTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                searchQuery={searchQuery}
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
  const angleStep = (2 * Math.PI) / vectors.length;

  const points = vectors.map((vector, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const pointRadius = radius * vector.value;
    return {
      x: center + pointRadius * Math.cos(angle),
      y: center + pointRadius * Math.sin(angle),
      ...vector,
    };
  });

  const pathData = `${points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')} Z`;

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform hover:scale-105 transition-transform duration-300">
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
          fill="url(#gradient)"
          stroke="#3b82f6"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />

        {points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={point.color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            className="cursor-pointer"
          >
            <title>
              {point.name}: {(point.value * 100).toFixed(0)}%
            </title>
          </motion.circle>
        ))}

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="mt-2 space-y-1">
        {vectors.map((vector) => (
          <div key={vector.name} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: vector.color }} />
            <span className="text-muted-foreground">{vector.name}</span>
            <span className="ml-auto font-medium">{(vector.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OntologyPanelProps {
  highlightedPath?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OntologyPanel({ highlightedPath = [], isCollapsed, onToggleCollapse }: OntologyPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: 250 }}
        animate={{ width: 60 }}
        className="h-full glass border-r border-border/50 flex flex-col items-center py-4 gap-4"
      >
        <button onClick={onToggleCollapse} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex flex-col gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Network className="w-4 h-4 text-blue-500" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-orange-500" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-500" />
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
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-full glass border-r border-border/50 flex flex-col"
    >
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">本体导航</span>
          </div>
          <button onClick={onToggleCollapse} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索本体概念..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="mb-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">领域本体树</div>
            <OntologyTreeItem node={mockOntology} level={0} searchQuery={searchQuery} highlightedPath={highlightedPath} />
          </div>

          <div className="mb-4 p-3 rounded-lg bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="w-3 h-3" />
              情境联合向量
            </div>
            <ContextVectorChart vectors={mockContextVectors} />
          </div>

          <div className="p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              最近激活概念
            </div>
            <div className="space-y-2">
              {mockRecentConcepts.map((concept, index) => (
                <motion.div
                  key={concept.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-sm flex-1">{concept.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {concept.count}
                  </Badge>
                  {concept.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                  {concept.trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                  {concept.trend === 'stable' && <div className="w-3 h-0.5 bg-gray-400" />}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
