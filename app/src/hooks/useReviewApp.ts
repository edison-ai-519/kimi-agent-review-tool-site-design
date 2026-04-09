import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type {
  AppStatePayload,
  AuthSession,
  ChatMessage,
  ReasoningData,
  ReviewActivity,
  ReviewItem,
  SystemStatus
} from '@/types';

type LoadedAppState = Omit<AppStatePayload, 'systemStatus'> & {
  systemStatus: SystemStatus;
};

function createAssistantMessage(content: string): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content,
    timestamp: new Date()
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

function prependActivity(currentActivities: ReviewActivity[], activity: ReviewActivity) {
  return [activity, ...currentActivities].slice(0, 8);
}

function buildActivity(action: string, target: string, type: ReviewActivity['type']): ReviewActivity {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    target,
    type,
    createdAt: new Date().toISOString()
  };
}

export function useReviewApp() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [appState, setAppState] = useState<LoadedAppState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reasoningByItem, setReasoningByItem] = useState<Record<string, ReasoningData>>({});
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingAppState, setIsLoadingAppState] = useState(false);
  const [isChatPending, setIsChatPending] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);
  const [reasoningLoadingItemId, setReasoningLoadingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAppState = async () => {
    setIsLoadingAppState(true);
    setErrorMessage(null);

    try {
      const payload = await api.getAppState();
      const nextAppState = hydrateAppState(payload);
      setAppState(nextAppState);
      setChatMessages((currentMessages) =>
        currentMessages.length > 0 ? currentMessages : [createAssistantMessage(nextAppState.chatConfig.welcomeMessage)]
      );
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

    void loadAppState();
  }, [session]);

  const login = async (username: string, password: string) => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setChatMessages([]);
    setReasoningByItem({});

    try {
      const nextSession = await api.login(username, password);
      setSession(nextSession);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败。');
      throw error;
    } finally {
      setIsAuthenticating(false);
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
      setReasoningByItem((current) => ({
        ...current,
        [item.id]: reasoning
      }));
      setAppState((current) =>
        current
          ? {
              ...current,
              activityFeed: prependActivity(current.activityFeed, buildActivity('查看', `${item.title}依据`, 'info'))
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

  const updateLocalReviewItem = (nextItem: ReviewItem, activity: ReviewActivity) => {
    setAppState((current) =>
      current
        ? {
            ...current,
            reviewItems: current.reviewItems.map((item) => (item.id === nextItem.id ? nextItem : item)),
            activityFeed: prependActivity(current.activityFeed, activity)
          }
        : current
    );
  };

  const saveReviewItem = async (itemId: string, score?: number, comment?: string, status?: ReviewItem['status']) => {
    setSavingItemId(itemId);
    setErrorMessage(null);

    try {
      const response = await api.updateReviewItem(itemId, { score, comment, status });
      updateLocalReviewItem(
        response.item,
        buildActivity(status === 'reviewed' ? '提交' : '暂存', response.item.title, status === 'disputed' ? 'warning' : 'success')
      );
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存评审项失败。');
      throw error;
    } finally {
      setSavingItemId(null);
    }
  };

  const generateReviewComment = async (item: ReviewItem) => {
    setGeneratingItemId(item.id);
    setErrorMessage(null);

    try {
      const completion = await api.requestLlmCompletion({
        prompt: `请为“${item.title}”生成一段评审辅助意见，要求包含结论、依据和风险边界。`,
        itemId: item.id,
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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedContent,
      timestamp: new Date()
    };

    setChatMessages((current) => [...current, userMessage]);
    setIsChatPending(true);
    setErrorMessage(null);

    try {
      const response = await api.sendChatMessage(trimmedContent, itemId);
      setChatMessages((current) => [
        ...current,
        {
          ...response.message,
          timestamp: new Date(response.message.timestamp)
        }
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '发送消息失败。');
      setChatMessages((current) => [...current, createAssistantMessage('消息发送失败了，请稍后重试。')]);
    } finally {
      setIsChatPending(false);
    }
  };

  return {
    session,
    appState,
    chatMessages,
    reasoningByItem,
    isAuthenticating,
    isLoadingAppState,
    isChatPending,
    savingItemId,
    generatingItemId,
    reasoningLoadingItemId,
    errorMessage,
    reloadAppState: loadAppState,
    login,
    ensureReasoning,
    saveReviewItem,
    generateReviewComment,
    sendChat
  };
}
