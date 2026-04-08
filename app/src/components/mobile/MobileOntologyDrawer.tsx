import { motion, AnimatePresence } from 'framer-motion';
import { X, Network, Target, Zap, TrendingUp, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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
  { id: '1', name: '技术成熟度', count: 12, trend: 'up' as const },
  { id: '2', name: '团队能力', count: 8, trend: 'stable' as const },
  { id: '3', name: '创新性', count: 6, trend: 'up' as const },
  { id: '4', name: '预算合理性', count: 4, trend: 'down' as const },
];

interface OntologyTreeItemProps {
  node: OntologyNode;
  level: number;
  searchQuery: string;
}

function OntologyTreeItem({ node, level, searchQuery }: OntologyTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.children && node.children.length > 0;
  const matchesSearch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'flex items-center gap-2 py-2.5 px-3 rounded-lg cursor-pointer transition-all duration-200',
          'hover:bg-muted/50 active:bg-muted',
          matchesSearch && 'bg-amber-500/10',
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
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
            'w-2.5 h-2.5 rounded-full',
            level === 0 ? 'bg-blue-500' : level === 1 ? 'bg-blue-400' : 'bg-blue-300',
          )}
        />

        <span className={cn('text-sm flex-1', level === 0 ? 'font-semibold' : 'font-normal')}>{node.name}</span>

        {node.weight > 0 && (
          <Badge variant="secondary" className="text-xs">
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
            transition={{ duration: 0.3 }}
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
          fill="url(#mobileGradient)"
          stroke="#3b82f6"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: 1 }}
        />

        {points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={point.color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
          />
        ))}

        <defs>
          <linearGradient id="mobileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex flex-wrap justify-center gap-3">
        {vectors.map((vector) => (
          <div key={vector.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: vector.color }} />
            <span className="text-muted-foreground">{vector.name}</span>
            <span className="font-medium">{(vector.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MobileOntologyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileOntologyDrawer({ isOpen, onClose }: MobileOntologyDrawerProps) {
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
            className="fixed inset-0 bg-black/50 z-50"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[85vh]"
          >
            <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-lg">本体导航</span>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-muted/50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                {[
                  { id: 'tree', label: '本体树', icon: Network },
                  { id: 'vector', label: '情境向量', icon: Target },
                  { id: 'recent', label: '激活概念', icon: Zap },
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as typeof activeSection)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                      activeSection === section.id ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <section.icon className="w-3.5 h-3.5" />
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
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索本体概念..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <OntologyTreeItem node={mockOntology} level={0} searchQuery={searchQuery} />
                    </div>
                  </div>
                )}

                {activeSection === 'vector' && (
                  <div className="py-4">
                    <div className="text-sm text-muted-foreground text-center mb-2">当前激活的情境联合向量</div>
                    <MobileRadarChart vectors={mockContextVectors} />
                    <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                      <h4 className="font-medium mb-2">向量说明</h4>
                      <p className="text-sm text-muted-foreground">
                        情境联合向量展示了当前评审过程中各类本体维度的权重分布。当前需求本体占比最高，说明系统更关注项目目标与需求匹配度；方案本体和风险本体则用于补充方案完整性与风险识别。
                      </p>
                    </div>
                  </div>
                )}

                {activeSection === 'recent' && (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-4">本次评审中高频使用的本体节点</div>
                    {mockRecentConcepts.map((concept, index) => (
                      <motion.div
                        key={concept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-muted/50"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{concept.name}</div>
                          <div className="text-xs text-muted-foreground">引用 {concept.count} 次</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {concept.trend === 'up' && (
                            <Badge className="bg-green-500/10 text-green-600">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              上升
                            </Badge>
                          )}
                          {concept.trend === 'down' && (
                            <Badge className="bg-red-500/10 text-red-600">
                              <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
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
