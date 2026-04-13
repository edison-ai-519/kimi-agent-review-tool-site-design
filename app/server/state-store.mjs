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

function normalizeProject(project, fallbackProject, currentStage) {
  const normalizedStage = isReviewStage(currentStage)
    ? currentStage
    : isReviewStage(project?.stage)
      ? project.stage
      : isReviewStage(fallbackProject?.stage)
        ? fallbackProject.stage
        : 'proposal';

  return {
    ...fallbackProject,
    ...project,
    id: String(project?.id ?? fallbackProject?.id ?? `project-${randomUUID()}`),
    name: String(project?.name ?? fallbackProject?.name ?? '未命名评审项目'),
    applicant: String(project?.applicant ?? fallbackProject?.applicant ?? '未填写申报单位'),
    budget: String(project?.budget ?? fallbackProject?.budget ?? '待填写'),
    duration: String(project?.duration ?? fallbackProject?.duration ?? '待填写'),
    field: String(project?.field ?? fallbackProject?.field ?? '待填写'),
    stage: normalizedStage
  };
}

function createProjectRuntimeState({
  project,
  stageSeeds,
  fallbackProject,
  currentStage = project?.stage,
  submittedAt,
  source = 'demo'
}) {
  const normalizedProject = normalizeProject(project, fallbackProject ?? stageSeeds.proposal.project, currentStage);

  return {
    project: normalizedProject,
    currentStage: normalizedProject.stage,
    submittedAt: submittedAt ?? normalizedProject.submittedAt ?? new Date().toISOString(),
    source,
    stageStates: Object.fromEntries(REVIEW_STAGES.map((stage) => [stage, createStageRuntimeState(stageSeeds[stage])]))
  };
}

function createInitialState(stageSeeds, defaultProject) {
  const projectState = createProjectRuntimeState({
    project: defaultProject,
    stageSeeds,
    fallbackProject: defaultProject,
    currentStage: defaultProject?.stage,
    submittedAt: defaultProject?.submittedAt,
    source: 'demo'
  });

  return {
    currentProjectId: projectState.project.id,
    projectOrder: [projectState.project.id],
    projectStates: {
      [projectState.project.id]: projectState
    }
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

function normalizeProjectState(parsedProjectState, stageSeeds, fallbackProject) {
  const currentStage = isReviewStage(parsedProjectState?.currentStage)
    ? parsedProjectState.currentStage
    : isReviewStage(parsedProjectState?.project?.stage)
      ? parsedProjectState.project.stage
      : fallbackProject?.stage;
  const normalizedProject = normalizeProject(parsedProjectState?.project, fallbackProject, currentStage);

  return {
    project: normalizedProject,
    currentStage: normalizedProject.stage,
    submittedAt: parsedProjectState?.submittedAt ?? normalizedProject.submittedAt ?? new Date().toISOString(),
    source: parsedProjectState?.source ?? normalizedProject.source ?? 'submitted',
    stageStates: Object.fromEntries(
      REVIEW_STAGES.map((stage) => [stage, normalizeStageState(parsedProjectState?.stageStates?.[stage], stageSeeds[stage])])
    )
  };
}

function normalizeLegacyFlatState(parsedState, stageSeeds, defaultProject) {
  const initialState = createInitialState(stageSeeds, defaultProject);
  const projectId = initialState.currentProjectId;
  const currentStage = isReviewStage(parsedState?.currentStage) ? parsedState.currentStage : initialState.projectStates[projectId].currentStage;

  return {
    currentProjectId: projectId,
    projectOrder: [projectId],
    projectStates: {
      [projectId]: {
        ...initialState.projectStates[projectId],
        project: {
          ...initialState.projectStates[projectId].project,
          stage: currentStage
        },
        currentStage,
        stageStates: Object.fromEntries(
          REVIEW_STAGES.map((stage) => [stage, normalizeStageState(parsedState?.stageStates?.[stage], stageSeeds[stage])])
        )
      }
    }
  };
}

function normalizeRuntimeState(parsedState, stageSeeds, defaultProject) {
  if (parsedState?.projectStates && typeof parsedState.projectStates === 'object' && !Array.isArray(parsedState.projectStates)) {
    const projectStates = Object.fromEntries(
      Object.entries(parsedState.projectStates).map(([projectId, projectState]) => {
        const fallbackProject = projectState?.project?.id ? projectState.project : { ...defaultProject, id: projectId };
        const normalizedProjectState = normalizeProjectState(projectState, stageSeeds, fallbackProject);
        return [normalizedProjectState.project.id, normalizedProjectState];
      })
    );
    const projectOrder = Array.isArray(parsedState.projectOrder)
      ? parsedState.projectOrder.filter((projectId) => projectStates[projectId])
      : Object.keys(projectStates);
    const normalizedProjectOrder = projectOrder.length > 0 ? projectOrder : Object.keys(projectStates);
    const currentProjectId = projectStates[parsedState.currentProjectId]
      ? parsedState.currentProjectId
      : normalizedProjectOrder[0];

    return {
      currentProjectId,
      projectOrder: normalizedProjectOrder,
      projectStates
    };
  }

  return normalizeLegacyFlatState(parsedState, stageSeeds, defaultProject);
}

export function createStateStore({ dataDir, stageSeeds, defaultProject }) {
  const runtimeStatePath = path.join(dataDir, 'runtime-state.json');
  let state = createInitialState(stageSeeds, defaultProject ?? stageSeeds.proposal.project);

  if (existsSync(runtimeStatePath)) {
    try {
      state = normalizeRuntimeState(JSON.parse(readFileSync(runtimeStatePath, 'utf8')), stageSeeds, defaultProject ?? stageSeeds.proposal.project);
    } catch {
      state = createInitialState(stageSeeds, defaultProject ?? stageSeeds.proposal.project);
    }
  }

  function persist() {
    writeFileSync(runtimeStatePath, JSON.stringify(state, null, 2), 'utf8');
  }

  function getProjectRecord(projectId = state.currentProjectId) {
    return state.projectStates[projectId] ?? null;
  }

  function getProjectRecordOrThrow(projectId = state.currentProjectId) {
    const projectRecord = getProjectRecord(projectId);
    if (!projectRecord) {
      throw new Error('Project not found.');
    }

    return projectRecord;
  }

  persist();

  return {
    getCurrentProjectId() {
      return state.currentProjectId;
    },

    setCurrentProject(projectId) {
      if (!state.projectStates[projectId]) {
        return null;
      }

      state.currentProjectId = projectId;
      persist();
      return this.getProject(projectId);
    },

    listProjects() {
      return state.projectOrder
        .map((projectId) => state.projectStates[projectId])
        .filter(Boolean)
        .map((projectRecord) => ({
          ...clone(projectRecord.project),
          stage: projectRecord.currentStage,
          submittedAt: projectRecord.submittedAt,
          source: projectRecord.source
        }));
    },

    addProject({ project, stageSeeds: projectStageSeeds, submittedAt = new Date().toISOString(), source = 'submitted' }) {
      const projectRecord = createProjectRuntimeState({
        project: {
          ...project,
          stage: 'proposal',
          submittedAt,
          source
        },
        stageSeeds: projectStageSeeds,
        fallbackProject: defaultProject ?? stageSeeds.proposal.project,
        currentStage: 'proposal',
        submittedAt,
        source
      });
      const projectId = projectRecord.project.id;

      projectRecord.stageStates.proposal.activityFeed = [
        {
          id: `activity-${randomUUID()}`,
          action: '提交项目',
          target: projectRecord.project.name,
          type: 'info',
          createdAt: submittedAt
        },
        ...projectRecord.stageStates.proposal.activityFeed.filter((activity) => activity.action !== '提交项目')
      ].slice(0, 8);

      state.projectStates[projectId] = projectRecord;
      state.projectOrder = [projectId, ...state.projectOrder.filter((existingId) => existingId !== projectId)];
      state.currentProjectId = projectId;
      persist();
      return this.getProject(projectId);
    },

    getProject(projectId = state.currentProjectId) {
      const projectRecord = getProjectRecord(projectId);
      if (!projectRecord) {
        return null;
      }

      return {
        ...clone(projectRecord.project),
        stage: projectRecord.currentStage,
        submittedAt: projectRecord.submittedAt,
        source: projectRecord.source
      };
    },

    getCurrentStage(projectId = state.currentProjectId) {
      return getProjectRecord(projectId)?.currentStage ?? 'proposal';
    },

    setCurrentStage(stage, projectId = state.currentProjectId) {
      if (!isReviewStage(stage)) {
        return null;
      }

      const projectRecord = getProjectRecord(projectId);
      if (!projectRecord) {
        return null;
      }

      projectRecord.currentStage = stage;
      projectRecord.project.stage = stage;
      persist();
      return projectRecord.currentStage;
    },

    getReviewItems(stage, projectId = state.currentProjectId) {
      const projectRecord = getProjectRecord(projectId);
      const resolvedStage = isReviewStage(stage) ? stage : projectRecord?.currentStage;
      return clone(projectRecord?.stageStates[resolvedStage]?.reviewItems ?? []);
    },

    getActivityFeed(stage, projectId = state.currentProjectId) {
      const projectRecord = getProjectRecord(projectId);
      const resolvedStage = isReviewStage(stage) ? stage : projectRecord?.currentStage;
      return clone(projectRecord?.stageStates[resolvedStage]?.activityFeed ?? []);
    },

    getReviewHistory(itemId, stage, projectId = state.currentProjectId) {
      const projectRecord = getProjectRecord(projectId);
      const resolvedStage = isReviewStage(stage) ? stage : projectRecord?.currentStage;
      return clone(projectRecord?.stageStates[resolvedStage]?.reviewHistories[itemId] ?? []);
    },

    prependActivity(activity, stage, projectId = state.currentProjectId) {
      const projectRecord = getProjectRecord(projectId);
      const resolvedStage = isReviewStage(stage) ? stage : projectRecord?.currentStage;
      if (!projectRecord?.stageStates[resolvedStage]) {
        return null;
      }

      projectRecord.stageStates[resolvedStage].activityFeed = [clone(activity), ...projectRecord.stageStates[resolvedStage].activityFeed].slice(0, 8);
      persist();
      return clone(activity);
    },

    updateReviewItem(itemId, nextUpdates, options = {}) {
      const projectRecord = getProjectRecordOrThrow(options.projectId ?? state.currentProjectId);
      const stage = isReviewStage(options.stage) ? options.stage : projectRecord.currentStage;
      if (!projectRecord.stageStates[stage]) {
        return null;
      }

      let updatedItem = null;

      projectRecord.stageStates[stage].reviewItems = projectRecord.stageStates[stage].reviewItems.map((item) => {
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
        projectRecord.stageStates[stage].reviewHistories[itemId] = [
          clone(options.historyEntry),
          ...(projectRecord.stageStates[stage].reviewHistories[itemId] ?? [])
        ].slice(0, 20);
      }

      if (options.activity) {
        projectRecord.stageStates[stage].activityFeed = [clone(options.activity), ...projectRecord.stageStates[stage].activityFeed].slice(0, 8);
      }

      persist();
      return clone(updatedItem);
    }
  };
}
