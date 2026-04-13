import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, FileText, FolderOpen, Paperclip, Plus, UploadCloud, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { reviewStageLabelMap } from '@/lib/review-stage';
import { cn } from '@/lib/utils';
import type { ProjectSubmissionAttachment, ProjectSubmissionInput, ProjectSubmissionMaterials, ProjectSummary } from '@/types';

type ProjectMaterialTextField =
  | 'summary'
  | 'objectives'
  | 'technicalRoute'
  | 'innovation'
  | 'milestones'
  | 'teamProfile'
  | 'budgetBreakdown'
  | 'expectedOutcomes'
  | 'riskPlan'
  | 'ethicsAndCompliance'
  | 'attachmentsDescription';

const maxProjectAttachments = 20;
const maxProjectAttachmentBytes = 100 * 1024 * 1024;
const supportedProjectAttachmentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

const emptyMaterials: ProjectSubmissionMaterials = {
  summary: '',
  objectives: '',
  technicalRoute: '',
  innovation: '',
  milestones: '',
  teamProfile: '',
  budgetBreakdown: '',
  expectedOutcomes: '',
  riskPlan: '',
  ethicsAndCompliance: '',
  attachmentsDescription: '',
  attachments: []
};

const emptyProjectDraft: ProjectSubmissionInput = {
  name: '',
  applicant: '',
  budget: '',
  duration: '',
  field: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  materials: emptyMaterials
};

const requiredMaterialFields: {
  id: ProjectMaterialTextField;
  label: string;
  placeholder: string;
}[] = [
  {
    id: 'summary',
    label: '项目摘要',
    placeholder: '说明项目背景、拟解决的问题、核心方案和应用场景。'
  },
  {
    id: 'objectives',
    label: '研究目标',
    placeholder: '列出总体目标、关键指标和可验收的量化目标。'
  },
  {
    id: 'technicalRoute',
    label: '技术路线',
    placeholder: '描述关键技术、数据来源、系统架构、实验验证和落地路径。'
  }
];

const optionalMaterialFields: {
  id: ProjectMaterialTextField;
  label: string;
  placeholder: string;
}[] = [
  {
    id: 'innovation',
    label: '创新点说明',
    placeholder: '说明相对现有方案的差异、先进性和可验证的创新边界。'
  },
  {
    id: 'milestones',
    label: '阶段里程碑',
    placeholder: '按时间列出立项后、中期、结题阶段的成果和交付物。'
  },
  {
    id: 'teamProfile',
    label: '团队与分工',
    placeholder: '说明负责人、核心成员、外部协作单位和任务分工。'
  },
  {
    id: 'budgetBreakdown',
    label: '预算拆分说明',
    placeholder: '拆分设备、数据、测试、劳务、差旅、运维等预算依据。'
  },
  {
    id: 'expectedOutcomes',
    label: '预期成果',
    placeholder: '说明系统、论文、专利、软著、示范应用、转化计划等成果。'
  },
  {
    id: 'riskPlan',
    label: '风险预案',
    placeholder: '说明技术、数据、伦理、进度、协同和经费风险的应对措施。'
  },
  {
    id: 'ethicsAndCompliance',
    label: '伦理与合规说明',
    placeholder: '涉及数据、医学、隐私、安全或外部合作时，说明合规边界。'
  },
  {
    id: 'attachmentsDescription',
    label: '附件清单说明',
    placeholder: '列出已准备的申报书、预算表、合作协议、证明材料等附件名称。'
  }
];

function formatDate(value?: string) {
  if (!value) return '未记录';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

function isSupportedProjectAttachment(file: File) {
  return supportedProjectAttachmentExtensions.includes(getFileExtension(file.name));
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',').pop() ?? '' : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('读取附件失败'));
    reader.readAsDataURL(file);
  });
}

function getAttachmentParseStatusLabel(status?: ProjectSubmissionAttachment['parseStatus']) {
  switch (status) {
    case 'parsed':
      return '已解析';
    case 'failed':
      return '解析失败';
    case 'pending':
      return '待解析';
    default:
      return null;
  }
}

function getAttachmentKey(attachment: ProjectSubmissionAttachment) {
  return [attachment.name, attachment.size, attachment.lastModified ?? ''].join(':');
}

function cloneDraft(): ProjectSubmissionInput {
  return {
    ...emptyProjectDraft,
    materials: {
      ...emptyMaterials,
      attachments: []
    }
  };
}

export function ProjectCenterPage({
  projects,
  currentProject,
  isSubmitting,
  onProjectChange,
  onProjectSubmit,
  onOpenWorkspace
}: {
  projects: ProjectSummary[];
  currentProject: ProjectSummary;
  isSubmitting: boolean;
  onProjectChange: (projectId: string) => Promise<void>;
  onProjectSubmit: (payload: ProjectSubmissionInput) => Promise<unknown>;
  onOpenWorkspace: () => void;
}) {
  const [draft, setDraft] = useState<ProjectSubmissionInput>(() => cloneDraft());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectingProjectId, setSelectingProjectId] = useState<string | null>(null);
  const [isReadingAttachments, setIsReadingAttachments] = useState(false);
  const projectOptions = projects.length > 0 ? projects : [currentProject];
  const submittedCount = projectOptions.filter((project) => project.source === 'submitted').length;
  const requiredMaterialCompleted = requiredMaterialFields.filter((field) => draft.materials[field.id]?.trim()).length;
  const attachmentCount = draft.materials.attachments?.length ?? 0;

  const canSubmit = useMemo(
    () =>
      Boolean(draft.name.trim()) &&
      Boolean(draft.applicant.trim()) &&
      requiredMaterialCompleted === requiredMaterialFields.length &&
      !isReadingAttachments,
    [draft, requiredMaterialCompleted, isReadingAttachments]
  );

  const updateDraft = (patch: Partial<ProjectSubmissionInput>) => {
    setDraft((current) => ({
      ...current,
      ...patch
    }));
  };

  const updateMaterial = (id: ProjectMaterialTextField, value: string) => {
    setDraft((current) => ({
      ...current,
      materials: {
        ...current.materials,
        [id]: value
      }
    }));
  };

  const updateAttachments = (attachments: ProjectSubmissionAttachment[]) => {
    setDraft((current) => ({
      ...current,
      materials: {
        ...current.materials,
        attachments
      }
    }));
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    setErrorMessage(null);
    setIsReadingAttachments(true);

    try {
      const sizeAcceptedFiles = files.filter((file) => file.size <= maxProjectAttachmentBytes);
      const acceptedFiles = sizeAcceptedFiles.filter(isSupportedProjectAttachment);
      const messages: string[] = [];

      if (sizeAcceptedFiles.length !== files.length) {
        messages.push('单个附件不能超过 100MB，超出大小的文件未加入清单。');
      }

      if (acceptedFiles.length !== sizeAcceptedFiles.length) {
        messages.push('第一版仅解析 PDF / Word / Excel，其他格式未加入清单。');
      }

      const attachmentsByKey = new Map(
        (draft.materials.attachments ?? []).map((attachment) => [getAttachmentKey(attachment), attachment])
      );

      const fileAttachments = await Promise.all(
        acceptedFiles.map(async (file) => {
          const attachment: ProjectSubmissionAttachment = {
            name: file.name,
            size: file.size,
            type: file.type || undefined,
            lastModified: file.lastModified,
            contentBase64: await readFileAsBase64(file),
            parseStatus: 'pending'
          };
          return attachment;
        })
      );

      fileAttachments.forEach((attachment) => {
        attachmentsByKey.set(getAttachmentKey(attachment), attachment);
      });

      const nextAttachments = Array.from(attachmentsByKey.values());
      if (nextAttachments.length > maxProjectAttachments) {
        messages.push(`附件最多选择 ${maxProjectAttachments} 个，超出的文件未加入清单。`);
      }

      if (messages.length > 0) {
        setErrorMessage(messages.join(' '));
      }

      updateAttachments(nextAttachments.slice(0, maxProjectAttachments));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '读取附件失败，请重新选择文件。');
    } finally {
      setIsReadingAttachments(false);
      input.value = '';
    }
  };

  const handleRemoveAttachment = (attachment: ProjectSubmissionAttachment) => {
    updateAttachments((draft.materials.attachments ?? []).filter((current) => getAttachmentKey(current) !== getAttachmentKey(attachment)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setErrorMessage(null);
    try {
      await onProjectSubmit(draft);
      setDraft(cloneDraft());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '提交项目失败。');
    }
  };

  const handleEnterProject = async (projectId: string) => {
    setErrorMessage(null);
    setSelectingProjectId(projectId);
    try {
      if (projectId !== currentProject.id) {
        await onProjectChange(projectId);
      }
      onOpenWorkspace();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '切换项目失败。');
    } finally {
      setSelectingProjectId(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/50 bg-background px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
              多项目评审工作台
            </div>
            <h1 className="mt-2 text-2xl font-semibold">项目中心</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              管理申报项目、补全评审前置材料，并进入对应项目的立项、中期和结题评审工作区。
            </p>
          </div>
          <Button className="gap-2" onClick={onOpenWorkspace}>
            返回当前评审
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">项目总数</div>
            <div className="mt-1 text-2xl font-semibold">{projectOptions.length}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">新提交项目</div>
            <div className="mt-1 text-2xl font-semibold">{submittedCount}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">材料完成度</div>
            <div className="mt-1 text-2xl font-semibold">
              {requiredMaterialCompleted}/{requiredMaterialFields.length}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-xs text-muted-foreground">附件清单</div>
            <div className="mt-1 text-2xl font-semibold">{attachmentCount}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.35fr)]">
            <section className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">项目列表</h2>
                  <p className="mt-1 text-sm text-muted-foreground">选择项目后进入该项目的评审工作区。</p>
                </div>
              </div>

              <div className="space-y-3">
                {projectOptions.map((project) => {
                  const isCurrent = project.id === currentProject.id;
                  const projectAttachmentCount = project.materials?.attachments?.length ?? 0;
                  const projectParsedAttachmentCount =
                    project.materials?.attachments?.filter((attachment) => attachment.parseStatus === 'parsed').length ?? 0;
                  const projectFailedAttachmentCount =
                    project.materials?.attachments?.filter((attachment) => attachment.parseStatus === 'failed').length ?? 0;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => void handleEnterProject(project.id)}
                      className={cn(
                        'w-full rounded-lg border p-4 text-left transition-colors',
                        isCurrent ? 'border-blue-500/50 bg-blue-500/5' : 'border-border/60 bg-background hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{project.name}</span>
                            {isCurrent && (
                              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-700">
                                当前项目
                              </Badge>
                            )}
                            {project.source === 'submitted' && <Badge variant="secondary">已提交</Badge>}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">{project.applicant}</div>
                        </div>
                        {isCurrent && <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-500" />}
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>阶段：{reviewStageLabelMap[project.stage]}</div>
                        <div>领域：{project.field}</div>
                        <div>预算：{project.budget}</div>
                        <div>周期：{project.duration}</div>
                        <div>提交：{formatDate(project.submittedAt)}</div>
                        <div>附件：{projectAttachmentCount} 个</div>
                        <div>已解析：{projectParsedAttachmentCount} 个</div>
                        {projectFailedAttachmentCount > 0 && <div>解析失败：{projectFailedAttachmentCount} 个</div>}
                        <div>{selectingProjectId === project.id ? '正在进入...' : '点击进入评审'}</div>
                      </div>
                      {project.summary && <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{project.summary}</div>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="min-w-0 rounded-lg border border-border/60 bg-background p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    项目申报材料
                  </div>
                  <h2 className="mt-2 text-lg font-semibold">提交新项目</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    只保留创建评审上下文需要的最低必填项，其余信息可以后补。
                  </p>
                </div>
                <Badge variant="secondary">{requiredMaterialCompleted}/{requiredMaterialFields.length} 项必填材料</Badge>
              </div>

              {errorMessage && (
                <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">项目名称</span>
                    <Input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">申报单位</span>
                    <Input value={draft.applicant} onChange={(event) => updateDraft({ applicant: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">所属领域（可后补）</span>
                    <Input value={draft.field} onChange={(event) => updateDraft({ field: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">联系人</span>
                    <Input value={draft.contactName ?? ''} onChange={(event) => updateDraft({ contactName: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">联系电话</span>
                    <Input value={draft.contactPhone ?? ''} onChange={(event) => updateDraft({ contactPhone: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">电子邮箱</span>
                    <Input value={draft.contactEmail ?? ''} onChange={(event) => updateDraft({ contactEmail: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">项目预算（可后补）</span>
                    <Input value={draft.budget} onChange={(event) => updateDraft({ budget: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="font-medium">项目周期（可后补）</span>
                    <Input value={draft.duration} onChange={(event) => updateDraft({ duration: event.target.value })} />
                  </label>
                </div>

                <div className="grid gap-4">
                  {requiredMaterialFields.map((field) => (
                    <label key={field.id} className="grid gap-1.5 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {field.label}
                        <Badge variant="outline" className="text-[10px]">必填</Badge>
                      </span>
                      <Textarea
                        value={draft.materials[field.id] ?? ''}
                        onChange={(event) => updateMaterial(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        className="min-h-[92px] resize-y"
                      />
                    </label>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {optionalMaterialFields.map((field) => (
                    <label key={field.id} className="grid gap-1.5 text-sm">
                      <span className="font-medium">{field.label}</span>
                      <Textarea
                        value={draft.materials[field.id] ?? ''}
                        onChange={(event) => updateMaterial(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        className="min-h-[92px] resize-y"
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <UploadCloud className="h-4 w-4 text-blue-500" />
                        附件上传
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        上传申报书、预算表、合作协议、证明材料或其他支撑文件。
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        最多 {maxProjectAttachments} 个文件，单个文件不超过 100MB。
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        当前版本解析 PDF / Word / Excel；图片、PPT 和压缩包暂不进入解析链路。
                      </p>
                    </div>
                    <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                      <UploadCloud className="h-4 w-4" />
                      {isReadingAttachments ? '读取附件中...' : '选择文件'}
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={handleAttachmentChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                        disabled={isReadingAttachments}
                      />
                    </label>
                  </div>

                  {attachmentCount > 0 && (
                    <div className="mt-4 grid gap-2">
                      {draft.materials.attachments?.map((attachment) => (
                        <div
                          key={getAttachmentKey(attachment)}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{attachment.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
                            {getAttachmentParseStatusLabel(attachment.parseStatus) && (
                              <Badge variant={attachment.parseStatus === 'failed' ? 'destructive' : 'secondary'} className="shrink-0 text-[10px]">
                                {getAttachmentParseStatusLabel(attachment.parseStatus)}
                              </Badge>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attachment)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`移除 ${attachment.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {attachment.parseError && (
                            <div className="basis-full text-xs leading-relaxed text-amber-700">{attachment.parseError}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                  <div className="text-sm text-muted-foreground">
                    提交后会自动生成三阶段评审清单，并切换到新项目。
                  </div>
                  <Button type="submit" disabled={!canSubmit || isSubmitting} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isReadingAttachments ? '读取附件中...' : isSubmitting ? '提交中...' : '提交项目'}
                  </Button>
                </div>
              </form>
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
