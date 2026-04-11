function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function buildHaystack(parts) {
  return parts
    .flat(Infinity)
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(' ');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getHighestSeverity(findings) {
  if (findings.some((finding) => finding.severity === 'fail')) {
    return 'fail';
  }

  if (findings.some((finding) => finding.severity === 'warn')) {
    return 'warn';
  }

  return 'pass';
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'fail':
      return '高风险';
    case 'warn':
      return '待补充';
    default:
      return '通过';
  }
}

function normalizeOntologyKnowledgeBase(payload) {
  const concepts = Array.isArray(payload?.concepts)
    ? payload.concepts.map((concept) => ({
        id: String(concept.id ?? ''),
        label: String(concept.label ?? ''),
        aliases: Array.isArray(concept.aliases) ? concept.aliases.map((alias) => String(alias)) : [],
        description: String(concept.description ?? '')
      }))
    : [];

  const evidencePatterns = Array.isArray(payload?.evidencePatterns)
    ? payload.evidencePatterns.map((pattern) => ({
        id: String(pattern.id ?? ''),
        label: String(pattern.label ?? ''),
        keywords: Array.isArray(pattern.keywords) ? pattern.keywords.map((keyword) => String(keyword)) : []
      }))
    : [];

  const reviewProfiles = Array.isArray(payload?.reviewProfiles)
    ? payload.reviewProfiles.map((profile) => ({
        stage: String(profile.stage ?? ''),
        itemIds: Array.isArray(profile.itemIds) ? profile.itemIds.map((itemId) => String(itemId)) : [],
        conceptIds: Array.isArray(profile.conceptIds) ? profile.conceptIds.map((conceptId) => String(conceptId)) : [],
        requiredEvidenceIds: Array.isArray(profile.requiredEvidenceIds)
          ? profile.requiredEvidenceIds.map((evidenceId) => String(evidenceId))
          : [],
        requiredDocumentCategories: Array.isArray(profile.requiredDocumentCategories)
          ? profile.requiredDocumentCategories.map((category) => String(category))
          : [],
        minKnowledgeDocuments: Number(profile.minKnowledgeDocuments ?? 0),
        highScoreThreshold: Number(profile.highScoreThreshold ?? Number.POSITIVE_INFINITY)
      }))
    : [];

  return {
    id: String(payload?.id ?? 'ontology-review-kb'),
    name: String(payload?.name ?? 'Ontology Review KB'),
    version: String(payload?.version ?? '1.0.0'),
    updatedAt: String(payload?.updatedAt ?? new Date().toISOString()),
    description: String(payload?.description ?? ''),
    concepts,
    evidencePatterns,
    reviewProfiles
  };
}

export function createOntologyValidationEngine({ ontologyKnowledgeBase }) {
  const kb = normalizeOntologyKnowledgeBase(ontologyKnowledgeBase);
  const conceptsById = new Map(kb.concepts.map((concept) => [concept.id, concept]));
  const evidencePatternsById = new Map(kb.evidencePatterns.map((pattern) => [pattern.id, pattern]));
  const profileByStageAndItemId = new Map();

  for (const profile of kb.reviewProfiles) {
    for (const itemId of profile.itemIds) {
      profileByStageAndItemId.set(`${profile.stage}:${itemId}`, profile);
    }
  }

  function findProfile(stage, itemId) {
    return profileByStageAndItemId.get(`${stage}:${itemId}`) ?? null;
  }

  function validateReviewItem({ item, stage, knowledgeDocuments = [], ontologyPathLabels = [] }) {
    const profile = findProfile(stage, item.id);

    if (!profile) {
      return {
        status: 'warn',
        summary: '当前评审项尚未配置本体规则画像，请补充规则后再执行校验。',
        ontologyVersion: kb.version,
        ontologyPathLabels,
        matchedConcepts: [],
        matchedDocumentCategories: [],
        missingDocumentCategories: [],
        evidenceChecks: [],
        findings: [
          {
            id: `finding-${item.id}-profile-missing`,
            severity: 'warn',
            severityLabel: getSeverityLabel('warn'),
            title: '缺少本体规则画像',
            message: '当前评审项还没有绑定本体规则画像，系统无法执行完整的规则校验。',
            suggestion: '建议为该评审项补充 conceptIds、证据模式和文档类型要求。'
          }
        ],
        knowledgeDocumentIds: knowledgeDocuments.map((document) => document.id)
      };
    }

    const matchedConcepts = profile.conceptIds
      .map((conceptId) => conceptsById.get(conceptId))
      .filter(Boolean)
      .map((concept) => concept.label);

    const itemHaystack = buildHaystack([
      item.title,
      item.description,
      item.comment,
      matchedConcepts,
      ontologyPathLabels
    ]);
    const documentHaystack = buildHaystack(
      knowledgeDocuments.map((document) => [document.title, document.summary, document.content, document.tags])
    );

    const evidenceChecks = profile.requiredEvidenceIds
      .map((evidenceId) => evidencePatternsById.get(evidenceId))
      .filter(Boolean)
      .map((pattern) => {
        const commentMatches = pattern.keywords.filter((keyword) => itemHaystack.includes(normalizeText(keyword)));
        const documentMatches = pattern.keywords.filter((keyword) => documentHaystack.includes(normalizeText(keyword)));
        const matchedTerms = unique([...commentMatches, ...documentMatches]);
        const matchedIn =
          commentMatches.length > 0 && documentMatches.length > 0
            ? 'both'
            : commentMatches.length > 0
              ? 'comment'
              : documentMatches.length > 0
                ? 'knowledge'
                : 'none';

        return {
          id: pattern.id,
          label: pattern.label,
          matched: matchedTerms.length > 0,
          matchedIn,
          matchedTerms
        };
      });

    const matchedDocumentCategories = unique(knowledgeDocuments.map((document) => document.category));
    const missingDocumentCategories = profile.requiredDocumentCategories.filter(
      (category) => !matchedDocumentCategories.includes(category)
    );
    const missingEvidenceChecks = evidenceChecks.filter((check) => !check.matched);
    const findings = [];

    if (item.status === 'disputed') {
      findings.push({
        id: `finding-${item.id}-disputed`,
        severity: 'fail',
        title: '当前结论处于争议状态',
        message: '评审项已被标记为争议，说明本体规则要求的关键论证还没有闭环。',
        suggestion: '建议组织会审，并补充能直接回应争议点的证据。'
      });
    }

    if (item.status === 'needs_revision') {
      findings.push({
        id: `finding-${item.id}-needs-revision`,
        severity: 'warn',
        title: '当前结论仍待补充材料',
        message: '评审项处于待补材料状态，本体规则认为还不能形成稳定结论。',
        suggestion: '建议先补齐缺失证据，再更新状态和评审意见。'
      });
    }

    if (['draft', 'pending', 'in_review'].includes(item.status)) {
      findings.push({
        id: `finding-${item.id}-not-reviewed`,
        severity: 'warn',
        title: '当前尚未形成正式结论',
        message: '本体规则校验已经给出提示，但当前评审项还没有进入稳定结论状态。',
        suggestion: '建议结合证据补充评审意见后再提交结论。'
      });
    }

    if (item.status === 'reviewed' && !normalizeText(item.comment)) {
      findings.push({
        id: `finding-${item.id}-comment-missing`,
        severity: 'fail',
        title: '已评审但缺少正式评审意见',
        message: '当前评审项已经进入已评审状态，但还没有留下可追溯的正式评审意见。',
        suggestion: '请补充结论、依据和风险边界，再保留“已评审”状态。'
      });
    }

    if (missingEvidenceChecks.length > 0) {
      const evidenceSeverity =
        item.status === 'reviewed' || (typeof item.score === 'number' && item.score >= profile.highScoreThreshold)
          ? 'fail'
          : 'warn';

      findings.push({
        id: `finding-${item.id}-evidence`,
        severity: evidenceSeverity,
        title: '关键证据覆盖不足',
        message: `本体规则要求的关键证据中，仍缺少：${missingEvidenceChecks.map((check) => check.label).join('、')}。`,
        suggestion: '建议在评审意见中补充明确依据，或补充能支撑该判断的项目材料。'
      });
    }

    if (knowledgeDocuments.length < profile.minKnowledgeDocuments) {
      findings.push({
        id: `finding-${item.id}-document-count`,
        severity: 'warn',
        title: '支撑资料数量偏少',
        message: `当前仅检索到 ${knowledgeDocuments.length} 份关联资料，低于画像要求的 ${profile.minKnowledgeDocuments} 份。`,
        suggestion: '建议补充相关项目材料，或扩展知识库中的支撑文档。'
      });
    }

    if (missingDocumentCategories.length > 0) {
      findings.push({
        id: `finding-${item.id}-document-category`,
        severity: 'warn',
        title: '支撑资料类型不完整',
        message: `当前缺少以下类型的支撑资料：${missingDocumentCategories.join('、')}。`,
        suggestion: '建议补充对应类别的文档，以满足本体规则要求。'
      });
    }

    if (
      item.status === 'reviewed' &&
      typeof item.score === 'number' &&
      item.score >= profile.highScoreThreshold &&
      normalizeText(item.comment) &&
      missingEvidenceChecks.length === 0 &&
      missingDocumentCategories.length === 0
    ) {
      findings.push({
        id: `finding-${item.id}-pass`,
        severity: 'pass',
        title: '高分结论具备本体支撑',
        message: '当前高分结论已经覆盖本体要求的核心证据和文档类型，规则校验通过。',
        suggestion: '可以继续保留当前结论，并在阶段汇总中引用这些依据。'
      });
    }

    const status = getHighestSeverity(findings);
    const failCount = findings.filter((finding) => finding.severity === 'fail').length;
    const missingRequirementCount = missingEvidenceChecks.length + missingDocumentCategories.length;
    const summary =
      status === 'fail'
        ? `命中 ${matchedConcepts.length} 个核心概念，但仍有 ${failCount} 项高风险问题需要闭环。`
        : status === 'warn'
          ? `已命中 ${matchedConcepts.length} 个核心概念，但还需补充 ${missingRequirementCount} 项关键证据或资料类型。`
          : `已命中 ${matchedConcepts.length} 个核心概念，关键证据与资料类型已满足当前本体规则要求。`;

    return {
      status,
      summary,
      ontologyVersion: kb.version,
      ontologyPathLabels,
      matchedConcepts,
      matchedDocumentCategories,
      missingDocumentCategories,
      evidenceChecks,
      findings: findings.map((finding) => ({
        ...finding,
        severityLabel: getSeverityLabel(finding.severity)
      })),
      knowledgeDocumentIds: knowledgeDocuments.map((document) => document.id)
    };
  }

  return {
    metadata: {
      id: kb.id,
      name: kb.name,
      version: kb.version,
      updatedAt: kb.updatedAt,
      description: kb.description
    },
    validateReviewItem
  };
}
