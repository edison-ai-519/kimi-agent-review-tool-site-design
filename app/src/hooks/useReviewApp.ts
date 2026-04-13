import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type {
  AppStatePayload,
  AuthSession,
  ChatMessage,
  KnowledgeDocument,
  ProjectSubmissionInput,
  ProjectSummary,
  ReasoningData,
  ReviewActivity,
  ReviewHistoryEntry,
  ReviewItem,
  ReviewStage,
  ReviewStageOverviewPayload,
  SystemStatus,
  UserRole
} from '@/types';

type LoadedAppState = Omit<AppStatePayload, 'systemStatus'> & {
  systemStatus: SystemStatus;
};

type ChatMessagesByStage = Partial<Record<ReviewStage, ChatMessage[]>>;

function createAssistantMessage(content: string, relatedDocuments: KnowledgeDocument[] = []): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: new Date(),
    relatedDocuments
  };
}

function hydrateAppState(payload: AppStatePayload): LoadedAppState {
  return {
    ...payload,
    systemStatus: {
      ...payload.systemStatus,
      lastUpdate: new Date(payload.systemStatus.lastUpdate)
    }
  };
}

function prependStageMessages(currentMessages: ChatMessagesByStage, stage: ReviewStage, message: ChatMessage) {
  return {
    ...currentMessages,
    [stage]: [...(currentMessages[stage] ?? []), message]
  };
}

function prependActivityMessage(action: string, target: string): ChatMessage {
  return createAssistantMessage(`${action}：${target}`);
}

export function useReviewApp() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentStage, setCurrentStage] = useState<ReviewStage>('proposal');
  const [appState, setAppState] = useState<LoadedAppState | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stageOverview, setStageOverview] = useState<ReviewStageOverviewPayload | null>(null);
  const [chatMessagesByStage, setChatMessagesByStage] = useState<ChatMessagesByStage>({});
  const [reasoningByItem, setReasoningByItem] = useState<Record<string, ReasoningData>>({});
  const [historyByItem, setHistoryByItem] = useState<Record<string, ReviewHistoryEntry[]>>({});
  const [generatedReferencesByItem, setGeneratedReferencesByItem] = useState<Record<string, KnowledgeDocument[]>>({});
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingAppState, setIsLoadingAppState] = useState(false);
  const [isChatPending, setIsChatPending] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [reasoningLoadingItemId, setReasoningLoadingItemId] = useState<string | null>(null);
  const [historyLoadingItemId, setHistoryLoadingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chatMessages = chatMessagesByStage[currentStage] ?? [];

  const loadStageOverview = async () => {
    const overview = await api.getReviewStageOverview();
    setStageOverview(overview);
    return overview;
  };

  const loadAppState = async (stage?: ReviewStage) => {
    setIsLoadingAppState(true);
    setErrorMessage(null);

    try {
      const [payload, overview] = await Promise.all([api.getAppState(stage), api.getReviewStageOverview()]);
      const nextAppState = hydrateAppState(payload);
      setAppState(nextAppState);
      setProjects(payload.projects ?? [payload.project]);
      setCurrentStage(nextAppState.project.stage);
      setStageOverview(overview);
      setChatMessagesByStage((currentMessages) => ({
        ...currentMessages,
        [nextAppState.project.stage]:
          currentMessages[nextAppState.project.stage]?.length && currentMessages[nextAppState.project.stage]!.length > 0
            ? currentMessages[nextAppState.project.stage]
            : [createAssistantMessage(nextAppState.chatConfig.welcomeMessage)]
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '加载应用状态失败。');
      throw error;
    } finally {
      setIsLoadingAppState(false);
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadAppState().catch(() => undefined);
  }, [session]);

  const login = async (username: string, password: string, role: UserRole) => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setChatMessagesByStage({});
    setReasoningByItem({});
    setHistoryByItem({});
    setGeneratedReferencesByItem({});
    setProjects([]);

    try {
      const nextSession = await api.login(username, password, role);
      setSession(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败。');
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const changeStage = async (stage: ReviewStage) => {
    if (stage === currentStage && appState?.project.stage === stage) {
      return;
    }

    setErrorMessage(null);

    try {
      await api.setReviewStage(stage);
      await loadAppState(stage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '切换评审阶段失败。');
      throw error;
    }
  };

  const changeProject = async (projectId: string) => {
    if (appState?.project.id === projectId) {
      return;
    }

    setErrorMessage(null);
    setReasoningByItem({});
    setHistoryByItem({});
    setGeneratedReferencesByItem({});
    setChatMessagesByStage({});

    try {
      await api.selectProject(projectId);
      await loadAppState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '切换项目失败。');
      throw error;
    }
  };

  const submitProject = async (payload: ProjectSubmissionInput) => {
    setIsSubmittingProject(true);
    setErrorMessage(null);
    setReasoningByItem({});
    setHistoryByItem({});
    setGeneratedReferencesByItem({});
    setChatMessagesByStage({});

    try {
      const response = await api.submitProject(payload);
      await loadAppState('proposal');
      return response.project;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '提交项目失败。');
      throw error;
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const ensureReasoning = async (item: ReviewItem) => {
    if (reasoningByItem[item.id]) {
      return reasoningByItem[item.id];
    }

    setReasoningLoadingItemId(item.id);
    setErrorMessage(null);

    try {
      const reasoning = await api.getReasoning(item.id);
      const activity: ReviewActivity = {
        id: `activity-${Date.now()}`,
        action: '查看依据',
        target: item.title,
        type: 'info',
        createdAt: new Date().toISOString()
      };
      setReasoningByItem((current) => ({
        ...current,
        [item.id]: reasoning
      }));
      setAppState((current) =>
        current
          ? {
              ...current,
              activityFeed: [activity, ...current.activityFeed].slice(0, 8)
            }
          : current
      );
      return reasoning;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '加载推理依据失败。');
      throw error;
    } finally {
      setReasoningLoadingItemId(null);
    }
  };

  const ensureReviewHistory = async (itemId: string) => {
    if (historyByItem[itemId]) {
      return historyByItem[itemId];
    }

    setHistoryLoadingItemId(itemId);
    setErrorMessage(null);

    try {
      const response = await api.getReviewHistory(itemId);
      setHistoryByItem((current) => ({
        ...current,
        [itemId]: response.entries
      }));
      return response.entries;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '加载评审历史失败。');
      throw error;
    } finally {
      setHistoryLoadingItemId(null);
    }
  };

  const updateLocalReviewItem = (nextItem: ReviewItem, activity?: ReviewActivity) => {
    setAppState((current) =>
      current
        ? {
            ...current,
            reviewItems: current.reviewItems.map((item) => (item.id === nextItem.id ? nextItem : item)),
            activityFeed: activity ? [activity, ...current.activityFeed].slice(0, 8) : current.activityFeed
          }
        : current
    );
  };

  const saveReviewItem = async (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => {
    setSavingItemId(itemId);
    setErrorMessage(null);

    try {
      const response = await api.updateReviewItem(itemId, { score, comment, status });
      updateLocalReviewItem(response.item, response.activity);
      void loadStageOverview().catch(() => undefined);
      const historyEntry = response.historyEntry;
      if (historyEntry) {
        setHistoryByItem((current) => ({
          ...current,
          [itemId]: [historyEntry, ...(current[itemId] ?? [])].slice(0, 20)
        }));
      }
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存评审项失败。');
      throw error;
    } finally {
      setSavingItemId(null);
    }
  };

  const generateReviewComment = async (item: ReviewItem) => {
    const stageAtRequest = currentStage;
    setGeneratingItemId(item.id);
    setErrorMessage(null);

    try {
      const completion = await api.requestLlmCompletion({
        prompt: `请为“${item.title}”生成一段评审辅助意见，要求包含结论、依据和风险边界。`,
        itemId: item.id,
        stage: stageAtRequest,
        useCase: 'review-suggestion',
        context: [
          item.description,
          item.comment ?? '当前尚无评审意见。',
          `置信度：${Math.round(item.confidence * 100)}%`
        ]
      });

      setAppState((current) =>
        current
          ? {
              ...current,
              reviewItems: current.reviewItems.map((reviewItem) =>
                reviewItem.id === item.id
                  ? {
                      ...reviewItem,
                      comment: completion.text
                    }
                  : reviewItem
              )
            }
          : current
      );
      setGeneratedReferencesByItem((current) => ({
        ...current,
        [item.id]: completion.relatedDocuments ?? []
      }));

      return completion.text;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '生成辅助意见失败。');
      throw error;
    } finally {
      setGeneratingItemId(null);
    }
  };

  const sendChat = async (content: string, itemId?: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const stageAtSend = currentStage;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedContent,
      timestamp: new Date()
    };

    setChatMessagesByStage((current) => prependStageMessages(current, stageAtSend, userMessage));
    setIsChatPending(true);
    setErrorMessage(null);

    try {
      const response = await api.sendChatMessage(trimmedContent, itemId, stageAtSend);
      setChatMessagesByStage((current) => ({
        ...current,
        [stageAtSend]: [
          ...(current[stageAtSend] ?? []),
          {
            ...response.message,
            timestamp: new Date(response.message.timestamp),
            relatedDocuments: response.relatedDocuments ?? []
          }
        ]
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '发送消息失败。');
      setChatMessagesByStage((current) =>
        prependStageMessages(current, stageAtSend, createAssistantMessage('消息发送失败了，请稍后重试。'))
      );
    } finally {
      setIsChatPending(false);
    }
  };

  return {
    session,
    currentStage,
    appState,
    projects,
    stageOverview,
    chatMessages,
    reasoningByItem,
    historyByItem,
    generatedReferencesByItem,
    isAuthenticating,
    isLoadingAppState,
    isChatPending,
    savingItemId,
    generatingItemId,
    isSubmittingProject,
    reasoningLoadingItemId,
    historyLoadingItemId,
    errorMessage,
    reloadAppState: () => loadAppState(currentStage),
    login,
    changeStage,
    changeProject,
    submitProject,
    ensureReasoning,
    ensureReviewHistory,
    saveReviewItem,
    generateReviewComment,
    sendChat,
    prependActivityMessage
  };
}
