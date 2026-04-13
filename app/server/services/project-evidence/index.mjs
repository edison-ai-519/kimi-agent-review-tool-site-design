import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_EXTRACTED_TEXT_CHARS = 60000;
const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx']);

const structuredMaterialFields = [
  { key: 'summary', title: '项目摘要', category: 'proposal', tags: ['summary', 'proposal'] },
  { key: 'objectives', title: '研究目标', category: 'proposal', tags: ['objectives', 'proposal'] },
  { key: 'technicalRoute', title: '技术路线', category: 'proposal', tags: ['technical-route', 'proposal'] },
  { key: 'innovation', title: '创新点说明', category: 'proposal', tags: ['innovation', 'proposal'] },
  { key: 'milestones', title: '阶段里程碑', category: 'proposal', tags: ['milestone', 'proposal'] },
  { key: 'teamProfile', title: '团队与分工', category: 'team', tags: ['team'] },
  { key: 'budgetBreakdown', title: '预算拆分说明', category: 'finance', tags: ['budget', 'finance'] },
  { key: 'expectedOutcomes', title: '预期成果', category: 'case', tags: ['outcome', 'case'] },
  { key: 'riskPlan', title: '风险预案', category: 'case', tags: ['risk', 'case'] },
  { key: 'ethicsAndCompliance', title: '伦理与合规说明', category: 'case', tags: ['ethics', 'compliance', 'case'] },
  { key: 'attachmentsDescription', title: '附件清单说明', category: 'case', tags: ['attachment-list', 'case'] }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compactText(value, maxLength = 180) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function safePathSegment(value) {
  const normalized = String(value ?? 'file')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);

  return normalized || 'file';
}

function getAttachmentExtension(attachment) {
  return path.extname(String(attachment?.name ?? '')).toLowerCase();
}

function decodeAttachmentBuffer(contentBase64) {
  const normalized = String(contentBase64 ?? '').replace(/^data:[^,]+,/, '').trim();
  if (!normalized) {
    return null;
  }

  return Buffer.from(normalized, 'base64');
}

function decodeXmlEntities(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanExtractedText(value) {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_CHARS);
}

function extractPrintableText(buffer) {
  const text = buffer
    .toString('latin1')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u4e00-\u9fa5]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanExtractedText(text);
}

async function extractPdfText(buffer) {
  const module = await import('pdf-parse');
  const parsePdf = module.default ?? null;
  let result;

  if (typeof parsePdf === 'function') {
    result = await parsePdf(buffer);
  } else if (typeof module.PDFParse === 'function') {
    const parser = new module.PDFParse({ data: buffer });
    try {
      result = await parser.getText();
    } finally {
      await parser.destroy?.();
    }
  } else {
    throw new Error('Installed pdf-parse package does not expose a supported parser API.');
  }

  const text = cleanExtractedText(result?.text);

  if (!text) {
    throw new Error('PDF parsed successfully but no readable text was found.');
  }

  return text;
}

async function extractWordText(buffer, extension) {
  if (extension === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = cleanExtractedText(result?.value);

    if (!text) {
      throw new Error('Word document parsed successfully but no readable text was found.');
    }

    return text;
  }

  const fallbackText = extractPrintableText(buffer);
  if (fallbackText.length < 20) {
    throw new Error('Legacy .doc text extraction is unavailable in this provider.');
  }

  return fallbackText;
}

async function extractExcelText(buffer) {
  const module = await import('xlsx');
  const XLSX = module.default ?? module;
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetTexts = workbook.SheetNames.map((sheetName) => {
    const rows = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { FS: '\t', RS: '\n' });
    return rows ? `[${sheetName}]\n${rows}` : '';
  }).filter(Boolean);
  const text = cleanExtractedText(sheetTexts.join('\n\n'));

  if (!text) {
    throw new Error('Excel workbook parsed successfully but no readable cell text was found.');
  }

  return text;
}

async function extractAttachmentText(buffer, extension) {
  if (extension === '.pdf') {
    try {
      return await extractPdfText(buffer);
    } catch (error) {
      const fallbackText = extractPrintableText(buffer);
      if (fallbackText.length >= 20) {
        return fallbackText;
      }

      throw error;
    }
  }

  if (extension === '.doc' || extension === '.docx') {
    return extractWordText(buffer, extension);
  }

  if (extension === '.xls' || extension === '.xlsx') {
    return extractExcelText(buffer);
  }

  throw new Error(`Unsupported attachment type: ${extension || 'unknown'}.`);
}

function inferAttachmentCategory(attachment) {
  const name = String(attachment?.name ?? '').toLowerCase();

  if (name.includes('budget') || name.includes('finance') || name.includes('经费') || name.includes('预算')) {
    return 'finance';
  }

  if (name.includes('team') || name.includes('member') || name.includes('团队') || name.includes('成员')) {
    return 'team';
  }

  if (name.includes('risk') || name.includes('proof') || name.includes('case') || name.includes('证明') || name.includes('协议')) {
    return 'case';
  }

  return 'proposal';
}

function buildAttachmentDocument(project, attachment, extractedText, category) {
  return {
    id: attachment.evidenceDocumentId ?? `project-evidence:${project.id}:attachment:${attachment.id}:v${attachment.version ?? 1}`,
    title: `${project.name} - ${attachment.name}`,
    category,
    summary: compactText(extractedText),
    content: extractedText,
    tags: ['project-evidence', 'upload', category, attachment.name, project.name].filter(Boolean),
    updatedAt: attachment.parsedAt ?? attachment.uploadedAt ?? project.submittedAt ?? new Date().toISOString()
  };
}

function buildStructuredEvidenceDocuments(project) {
  const materials = project?.materials ?? {};
  const updatedAt = materials.evidenceIndexUpdatedAt ?? project?.submittedAt ?? new Date().toISOString();

  return structuredMaterialFields
    .map((field) => {
      const content = String(materials[field.key] ?? '').trim();
      if (!content) {
        return null;
      }

      return {
        id: `project-evidence:${project.id}:structured:${field.key}`,
        title: `${project.name} - ${field.title}`,
        category: field.category,
        summary: compactText(content),
        content,
        tags: ['project-evidence', 'structured', project.name, ...field.tags].filter(Boolean),
        updatedAt
      };
    })
    .filter(Boolean);
}

function collectTerms(parts) {
  const terms = new Set();

  for (const part of parts.flat()) {
    const text = String(part ?? '').trim();
    if (!text) {
      continue;
    }

    terms.add(text.toLowerCase());
    for (const token of text.split(/[\s,.;:，。；：、()（）[\]{}"'“”‘’<>/\\|-]+/)) {
      const normalized = token.trim().toLowerCase();
      if (normalized.length >= 2) {
        terms.add(normalized);
      }
    }
  }

  return [...terms];
}

function scoreDocument(document, terms) {
  if (terms.length === 0) {
    return 1;
  }

  const haystack = [document.title, document.category, document.summary, document.content, ...(document.tags ?? [])].join(' ').toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (document.title.toLowerCase().includes(term)) {
      score += 8;
    }

    if ((document.tags ?? []).some((tag) => tag.toLowerCase().includes(term))) {
      score += 5;
    }

    if (document.summary.toLowerCase().includes(term)) {
      score += 4;
    }

    if (haystack.includes(term)) {
      score += 1;
    }
  }

  return score;
}

function uniqueDocuments(documents) {
  const seen = new Set();
  return documents.filter((document) => {
    if (seen.has(document.id)) {
      return false;
    }

    seen.add(document.id);
    return true;
  });
}

export function createProjectEvidenceProvider({ dataDir }) {
  const storageRoot = path.join(dataDir, 'project-evidence');

  async function processAttachment(project, attachment) {
    const extension = getAttachmentExtension(attachment);
    const contentBuffer = decodeAttachmentBuffer(attachment.contentBase64);
    const version = Number.isInteger(Number(attachment.version)) ? Number(attachment.version) : 1;
    const now = new Date().toISOString();
    const baseAttachment = {
      ...attachment,
      version,
      contentBase64: undefined,
      materialType: attachment.materialType ?? inferAttachmentCategory(attachment),
      parseStatus: 'pending'
    };

    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      return {
        attachment: {
          ...baseAttachment,
          parseStatus: 'failed',
          parseError: `Only PDF / Word / Excel attachments are parsed in this version.`
        },
        document: null
      };
    }

    if (!contentBuffer) {
      return {
        attachment: {
          ...baseAttachment,
          parseStatus: attachment.parseStatus ?? 'failed',
          parseError: attachment.parseError ?? 'Attachment content was not included in the submission payload.'
        },
        document: null
      };
    }

    const fileName = `${version}-${baseAttachment.id ?? randomUUID()}-${safePathSegment(baseAttachment.name)}`;
    const projectDir = path.join(storageRoot, 'files', safePathSegment(project.id));
    const storageKey = path.join('project-evidence', 'files', safePathSegment(project.id), fileName).replace(/\\/g, '/');
    await mkdir(projectDir, { recursive: true });
    await writeFile(path.join(projectDir, fileName), contentBuffer);

    try {
      const extractedText = await extractAttachmentText(contentBuffer, extension);
      const parsedAttachment = {
        ...baseAttachment,
        storageKey,
        parseStatus: 'parsed',
        parseError: undefined,
        parsedAt: now,
        evidenceDocumentId: baseAttachment.evidenceDocumentId ?? `project-evidence:${project.id}:attachment:${baseAttachment.id}:v${version}`,
        extractedTextPreview: compactText(extractedText, 240)
      };

      return {
        attachment: parsedAttachment,
        document: buildAttachmentDocument(project, parsedAttachment, extractedText, parsedAttachment.materialType)
      };
    } catch (error) {
      return {
        attachment: {
          ...baseAttachment,
          storageKey,
          parseStatus: 'failed',
          parseError: error instanceof Error ? error.message : 'Attachment parsing failed.',
          parsedAt: now
        },
        document: null
      };
    }
  }

  return {
    name: 'local-project-evidence',
    supportedExtensions: [...SUPPORTED_EXTENSIONS],

    async prepareProject(project) {
      const nextProject = clone(project);
      const attachments = Array.isArray(nextProject.materials?.attachments) ? nextProject.materials.attachments : [];
      const processedAttachments = [];
      const attachmentDocuments = [];

      for (const attachment of attachments) {
        const processed = await processAttachment(nextProject, attachment);
        processedAttachments.push(processed.attachment);
        if (processed.document) {
          attachmentDocuments.push(processed.document);
        }
      }

      const structuredDocuments = buildStructuredEvidenceDocuments(nextProject);
      nextProject.materials = {
        ...nextProject.materials,
        attachments: processedAttachments,
        evidenceDocuments: uniqueDocuments([...structuredDocuments, ...attachmentDocuments]),
        evidenceIndexUpdatedAt: new Date().toISOString()
      };

      return nextProject;
    },

    listProjectEvidence(project) {
      if (!project) {
        return [];
      }

      const storedDocuments = Array.isArray(project.materials?.evidenceDocuments) ? project.materials.evidenceDocuments : [];
      return uniqueDocuments([...buildStructuredEvidenceDocuments(project), ...storedDocuments]).map(clone);
    },

    searchProjectEvidence({ project, query = '', reviewItem = null, ontologyPathLabels = [], limit = 3 } = {}) {
      const documents = this.listProjectEvidence(project);
      const terms = collectTerms([query, reviewItem?.title, reviewItem?.description, ontologyPathLabels]);
      const rankedDocuments = documents
        .map((document) => ({
          document,
          score: scoreDocument(document, terms)
        }))
        .sort((left, right) => right.score - left.score);
      const selectedDocuments = (terms.length === 0 ? rankedDocuments : rankedDocuments.filter((entry) => entry.score > 0));
      const topDocuments = (selectedDocuments.length > 0 ? selectedDocuments : rankedDocuments)
        .slice(0, limit)
        .map((entry) => clone(entry.document));

      return {
        query: String(query || reviewItem?.title || ''),
        source: 'project-evidence',
        total: topDocuments.length,
        documents: topDocuments
      };
    }
  };
}

export function listProjectEvidenceProviders() {
  return ['local-project-evidence'];
}
