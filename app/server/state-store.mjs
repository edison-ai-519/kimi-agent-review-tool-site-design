import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { REVIEW_STAGES, isReviewStage } from './review-stages.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const reviewStatusLabelMap = {
  draft: '草稿',
  pending: '待评审',
  in_review: '复核中',
  needs_revision: '待补材料',
  reviewed: '已评审',
  disputed: '有争议'
};

function buildSeedHistorySummary(item) {
  const details = [`状态：${reviewStatusLabelMap[item.status] ?? item.status}`];

  if (typeof item.score === 'number') {
    details.push(`评分：${item.score}/${item.maxScore}`);
  }

  if (item.comment) {
    const normalizedComment = item.comment.replace(/\s+/g, ' ').trim();
    details.push(`意见：${normalizedComment.slice(0, 48)}${normalizedComment.length > 48 ? '...' : ''}`);
  }

  return details.join('；');
}

function buildSeedReviewHistories(reviewItems) {
  const seededAt = new Date().toISOString();

  return Object.fromEntries(
    reviewItems.map((item) => {
      if (item.status === 'pending' && item.score === undefined && !item.comment) {
        return [item.id, []];
      }

      return [
        item.id,
        [
          {
            id: `history-${randomUUID()}`,
            itemId: item.id,
            action: '初始化记录',
            actorName: '系统',
            summary: buildSeedHistorySummary(item),
            toStatus: item.status,
            score: item.score,
            commentPreview: item.comment ? item.comment.slice(0, 160) : undefined,
            createdAt: seededAt
          }
        ]
      ];
    })
  );
}

function createStageRuntimeState(stageSeed) {
  return {
    reviewItems: clone(stageSeed.reviewItems),
    activityFeed: clone(stageSeed.activityFeed),
    reviewHistories: buildSeedReviewHistories(stageSeed.reviewItems)
  };
}

function createInitialState(stageSeeds, defaultStage) {
  return {
    currentStage: isReviewStage(defaultStage) ? defaultStage : 'proposal',
    stageStates: Object.fromEntries(REVIEW_STAGES.map((stage) => [stage, createStageRuntimeState(stageSeeds[stage])]))
  };
}

function normalizeStageState(parsedStageState, stageSeed) {
  const initialState = createStageRuntimeState(stageSeed);
  const runtimeReviewItems = Array.isArray(parsedStageState?.reviewItems) ? parsedStageState.reviewItems : [];
  const runtimeReviewItemsById = new Map(runtimeReviewItems.map((item) => [item.id, item]));
  const mergedSeedReviewItems = stageSeed.reviewItems.map((seedItem) => ({
    ...seedItem,
    ...(runtimeReviewItemsById.get(seedItem.id) ?? {})
  }));
  const mergedExtraReviewItems = runtimeReviewItems.filter(
    (runtimeItem) => !stageSeed.reviewItems.some((seedItem) => seedItem.id === runtimeItem.id)
  );
  const reviewItems = [...mergedSeedReviewItems, ...mergedExtraReviewItems];

  const reviewHistoriesSource =
    parsedStageState?.reviewHistories && typeof parsedStageState.reviewHistories === 'object' && !Array.isArray(parsedStageState.reviewHistories)
      ? parsedStageState.reviewHistories
      : initialState.reviewHistories;

  const reviewHistories = Object.fromEntries(
    reviewItems.map((item) => [
      item.id,
      Array.isArray(reviewHistoriesSource[item.id]) ? clone(reviewHistoriesSource[item.id]) : initialState.reviewHistories[item.id] ?? []
    ])
  );

  return {
    reviewItems,
    activityFeed: Array.isArray(parsedStageState?.activityFeed) ? clone(parsedStageState.activityFeed) : initialState.activityFeed,
    reviewHistories
  };
}

function normalizeLegacyFlatState(parsedState, stageSeeds, defaultStage) {
  const initialState = createInitialState(stageSeeds, defaultStage);

  return {
    currentStage: initialState.currentStage,
    stageStates: {
      ...initialState.stageStates,
      proposal: normalizeStageState(parsedState, stageSeeds.proposal)
    }
  };
}

function normalizeRuntimeState(parsedState, stageSeeds, defaultStage) {
  if (parsedState?.stageStates && typeof parsedState.stageStates === 'object' && !Array.isArray(parsedState.stageStates)) {
    return {
      currentStage: isReviewStage(parsedState.currentStage) ? parsedState.currentStage : createInitialState(stageSeeds, defaultStage).currentStage,
      stageStates: Object.fromEntries(
        REVIEW_STAGES.map((stage) => [stage, normalizeStageState(parsedState.stageStates[stage], stageSeeds[stage])])
      )
    };
  }

  return normalizeLegacyFlatState(parsedState, stageSeeds, defaultStage);
}

export function createStateStore({ dataDir, stageSeeds, defaultStage }) {
  const runtimeStatePath = path.join(dataDir, 'runtime-state.json');
  let state = createInitialState(stageSeeds, defaultStage);

  if (existsSync(runtimeStatePath)) {
    try {
      state = normalizeRuntimeState(JSON.parse(readFileSync(runtimeStatePath, 'utf8')), stageSeeds, defaultStage);
    } catch {
      state = createInitialState(stageSeeds, defaultStage);
    }
  }

  function persist() {
    writeFileSync(runtimeStatePath, JSON.stringify(state, null, 2), 'utf8');
  }

  persist();

  return {
    getCurrentStage() {
      return state.currentStage;
    },

    setCurrentStage(stage) {
      if (!isReviewStage(stage)) {
        return null;
      }

      state.currentStage = stage;
      persist();
      return state.currentStage;
    },

    getReviewItems(stage = state.currentStage) {
      return clone(state.stageStates[stage]?.reviewItems ?? []);
    },

    getActivityFeed(stage = state.currentStage) {
      return clone(state.stageStates[stage]?.activityFeed ?? []);
    },

    getReviewHistory(itemId, stage = state.currentStage) {
      return clone(state.stageStates[stage]?.reviewHistories[itemId] ?? []);
    },

    prependActivity(activity, stage = state.currentStage) {
      if (!state.stageStates[stage]) {
        return null;
      }

      state.stageStates[stage].activityFeed = [clone(activity), ...state.stageStates[stage].activityFeed].slice(0, 8);
      persist();
      return clone(activity);
    },

    updateReviewItem(itemId, nextUpdates, options = {}) {
      const stage = isReviewStage(options.stage) ? options.stage : state.currentStage;
      if (!state.stageStates[stage]) {
        return null;
      }

      let updatedItem = null;

      state.stageStates[stage].reviewItems = state.stageStates[stage].reviewItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        updatedItem = {
          ...item,
          ...nextUpdates
        };

        return updatedItem;
      });

      if (!updatedItem) {
        return null;
      }

      if (options.historyEntry) {
        state.stageStates[stage].reviewHistories[itemId] = [
          clone(options.historyEntry),
          ...(state.stageStates[stage].reviewHistories[itemId] ?? [])
        ].slice(0, 20);
      }

      if (options.activity) {
        state.stageStates[stage].activityFeed = [clone(options.activity), ...state.stageStates[stage].activityFeed].slice(0, 8);
      }

      persist();
      return clone(updatedItem);
    }
  };
}
