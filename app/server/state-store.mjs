import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

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

function createInitialState(appStateSeed) {
  return {
    reviewItems: clone(appStateSeed.reviewItems),
    activityFeed: clone(appStateSeed.activityFeed),
    reviewHistories: buildSeedReviewHistories(appStateSeed.reviewItems)
  };
}

function normalizeRuntimeState(parsedState, appStateSeed) {
  const initialState = createInitialState(appStateSeed);
  const runtimeReviewItems = Array.isArray(parsedState?.reviewItems) ? parsedState.reviewItems : [];
  const runtimeReviewItemsById = new Map(runtimeReviewItems.map((item) => [item.id, item]));
  const mergedSeedReviewItems = appStateSeed.reviewItems.map((seedItem) => ({
    ...seedItem,
    ...(runtimeReviewItemsById.get(seedItem.id) ?? {})
  }));
  const mergedExtraReviewItems = runtimeReviewItems.filter(
    (runtimeItem) => !appStateSeed.reviewItems.some((seedItem) => seedItem.id === runtimeItem.id)
  );
  const reviewItems = [...mergedSeedReviewItems, ...mergedExtraReviewItems];

  const reviewHistoriesSource =
    parsedState?.reviewHistories && typeof parsedState.reviewHistories === 'object' && !Array.isArray(parsedState.reviewHistories)
      ? parsedState.reviewHistories
      : initialState.reviewHistories;

  const reviewHistories = Object.fromEntries(
    reviewItems.map((item) => [
      item.id,
      Array.isArray(reviewHistoriesSource[item.id]) ? clone(reviewHistoriesSource[item.id]) : initialState.reviewHistories[item.id] ?? []
    ])
  );

  return {
    reviewItems,
    activityFeed: Array.isArray(parsedState?.activityFeed) ? clone(parsedState.activityFeed) : initialState.activityFeed,
    reviewHistories
  };
}

export function createStateStore({ dataDir, appStateSeed }) {
  const runtimeStatePath = path.join(dataDir, 'runtime-state.json');
  let state = createInitialState(appStateSeed);

  if (existsSync(runtimeStatePath)) {
    try {
      state = normalizeRuntimeState(JSON.parse(readFileSync(runtimeStatePath, 'utf8')), appStateSeed);
    } catch {
      state = createInitialState(appStateSeed);
    }
  }

  function persist() {
    writeFileSync(runtimeStatePath, JSON.stringify(state, null, 2), 'utf8');
  }

  persist();

  return {
    getReviewItems() {
      return clone(state.reviewItems);
    },

    getActivityFeed() {
      return clone(state.activityFeed);
    },

    getReviewHistory(itemId) {
      return clone(state.reviewHistories[itemId] ?? []);
    },

    prependActivity(activity) {
      state.activityFeed = [clone(activity), ...state.activityFeed].slice(0, 8);
      persist();
      return clone(activity);
    },

    updateReviewItem(itemId, nextUpdates, options = {}) {
      let updatedItem = null;

      state.reviewItems = state.reviewItems.map((item) => {
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
        state.reviewHistories[itemId] = [clone(options.historyEntry), ...(state.reviewHistories[itemId] ?? [])].slice(0, 20);
      }

      if (options.activity) {
        state.activityFeed = [clone(options.activity), ...state.activityFeed].slice(0, 8);
      }

      persist();
      return clone(updatedItem);
    }
  };
}
