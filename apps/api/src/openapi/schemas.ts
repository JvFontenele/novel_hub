import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

type JsonSchema = Record<string, unknown>;

export const bearerSecurity = [{ bearerAuth: [] }] as const;

const novelStatusValues = ['ONGOING', 'COMPLETED', 'HIATUS', 'DROPPED', 'UNKNOWN'] as const;
const sourceStatusValues = ['MONITORING', 'PAUSED', 'FAILED', 'DEAD'] as const;
const novelEventTypeValues = [
  'NEW_CHAPTER',
  'STATUS_CHANGED',
  'NOVEL_UPDATED',
  'SOURCE_FAILED',
] as const;
const collectorRunStatusValues = ['SUCCESS', 'FAILED', 'PARTIAL'] as const;

export function fromZod(schema: ZodTypeAny): JsonSchema {
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as JsonSchema;
}

export function listResponseSchema(itemSchema: JsonSchema): JsonSchema {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: itemSchema,
      },
    },
    required: ['items'],
    additionalProperties: false,
  };
}

export function idParamsSchema(fieldName: string, description: string): JsonSchema {
  return {
    type: 'object',
    properties: {
      [fieldName]: {
        type: 'string',
        description,
      },
    },
    required: [fieldName],
    additionalProperties: false,
  };
}

export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['ok'],
    },
  },
  required: ['status'],
  additionalProperties: false,
} satisfies JsonSchema;

export const errorResponseSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    errors: {},
  },
  required: ['message'],
  additionalProperties: true,
} satisfies JsonSchema;

export const userProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
  },
  required: ['id', 'name', 'email'],
  additionalProperties: false,
} satisfies JsonSchema;

export const authResponseSchema = {
  type: 'object',
  properties: {
    user: userProfileSchema,
    token: { type: 'string' },
  },
  required: ['user', 'token'],
  additionalProperties: false,
} satisfies JsonSchema;

export const createNovelResponseSchema = {
  type: 'object',
  properties: {
    novelId: { type: 'string' },
    sourceId: { type: 'string' },
    status: { type: 'string', enum: [...sourceStatusValues] },
  },
  required: ['novelId', 'sourceId', 'status'],
  additionalProperties: false,
} satisfies JsonSchema;

export const novelListItemSchema = {
  type: 'object',
  properties: {
    novelId: { type: 'string' },
    title: { type: 'string' },
    coverUrl: { type: 'string', format: 'uri', nullable: true },
    status: { type: 'string', enum: [...novelStatusValues] },
    lastChapterNumber: { type: 'number', nullable: true },
    lastReadChapterNumber: { type: 'number', nullable: true },
  },
  required: [
    'novelId',
    'title',
    'coverUrl',
    'status',
    'lastChapterNumber',
    'lastReadChapterNumber',
  ],
  additionalProperties: false,
} satisfies JsonSchema;

export const novelSourceSchema = {
  type: 'object',
  properties: {
    sourceId: { type: 'string' },
    url: { type: 'string', format: 'uri' },
    status: { type: 'string', enum: [...sourceStatusValues] },
    monitoringEnabled: { type: 'boolean' },
    lastCheckedAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['sourceId', 'url', 'status', 'monitoringEnabled', 'lastCheckedAt'],
  additionalProperties: false,
} satisfies JsonSchema;

export const novelDetailSchema = {
  type: 'object',
  properties: {
    ...novelListItemSchema.properties,
    synopsis: { type: 'string', nullable: true },
    author: { type: 'string', nullable: true },
    sources: {
      type: 'array',
      items: novelSourceSchema,
    },
  },
  required: [...(novelListItemSchema.required as string[]), 'synopsis', 'author', 'sources'],
  additionalProperties: false,
} satisfies JsonSchema;

export const updateProgressResponseSchema = {
  type: 'object',
  properties: {
    novelId: { type: 'string' },
    lastReadChapterNumber: { type: 'number', nullable: true },
  },
  required: ['novelId', 'lastReadChapterNumber'],
  additionalProperties: false,
} satisfies JsonSchema;

export const novelEventSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string' },
    type: { type: 'string', enum: [...novelEventTypeValues] },
    payload: {
      type: 'object',
      additionalProperties: true,
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['eventId', 'type', 'payload', 'createdAt'],
  additionalProperties: false,
} satisfies JsonSchema;

export const chapterListItemSchema = {
  type: 'object',
  properties: {
    chapterId: { type: 'string' },
    chapterNumber: { type: 'number' },
    title: { type: 'string', nullable: true },
    url: { type: 'string', format: 'uri' },
    publishedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    hasContent: { type: 'boolean' },
  },
  required: ['chapterId', 'chapterNumber', 'title', 'url', 'publishedAt', 'createdAt', 'hasContent'],
  additionalProperties: false,
} satisfies JsonSchema;

export const chapterContentSchema = {
  type: 'object',
  properties: {
    chapterId: { type: 'string' },
    chapterNumber: { type: 'number' },
    title: { type: 'string', nullable: true },
    content: { type: 'string' },
    contentFetchedAt: { type: 'string', format: 'date-time' },
    url: { type: 'string', format: 'uri' },
  },
  required: ['chapterId', 'chapterNumber', 'title', 'content', 'contentFetchedAt', 'url'],
  additionalProperties: false,
} satisfies JsonSchema;

export const queueChapterContentResponseSchema = {
  type: 'object',
  properties: {
    queued: { type: 'boolean', enum: [true] },
    chapterId: { type: 'string' },
  },
  required: ['queued', 'chapterId'],
  additionalProperties: false,
} satisfies JsonSchema;

export const chapterParamsSchema = {
  type: 'object',
  properties: {
    novelId: { type: 'string', description: 'Novel identifier' },
    chapterId: { type: 'string', description: 'Chapter identifier' },
  },
  required: ['novelId', 'chapterId'],
  additionalProperties: false,
} satisfies JsonSchema;

export const chapterListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1, default: 1 },
    pageSize: { type: 'number', minimum: 1, default: 50 },
  },
  additionalProperties: false,
} satisfies JsonSchema;

export const sourceSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    novel_id: { type: 'string' },
    url: { type: 'string', format: 'uri' },
    connector_key: { type: 'string' },
    monitoring_enabled: { type: 'boolean' },
    status: { type: 'string', enum: [...sourceStatusValues] },
    consecutive_failures: { type: 'number' },
    next_check_at: { type: 'string', format: 'date-time', nullable: true },
    last_checked_at: { type: 'string', format: 'date-time', nullable: true },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  required: [
    'id',
    'novel_id',
    'url',
    'connector_key',
    'monitoring_enabled',
    'status',
    'consecutive_failures',
    'next_check_at',
    'last_checked_at',
    'created_at',
    'updated_at',
  ],
  additionalProperties: false,
} satisfies JsonSchema;

export const triggerCollectionResponseSchema = {
  type: 'object',
  properties: {
    queued: { type: 'boolean', enum: [true] },
    sourceId: { type: 'string' },
  },
  required: ['queued', 'sourceId'],
  additionalProperties: false,
} satisfies JsonSchema;

export const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    type: { type: 'string', enum: [...novelEventTypeValues] },
    novelId: { type: 'string', nullable: true },
    title: { type: 'string' },
    body: { type: 'string', nullable: true },
    read: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'type', 'novelId', 'title', 'body', 'read', 'createdAt'],
  additionalProperties: false,
} satisfies JsonSchema;

export const markNotificationReadResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
  additionalProperties: false,
} satisfies JsonSchema;

export const collectorRunSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    sourceId: { type: 'string' },
    sourceUrl: { type: 'string', format: 'uri' },
    status: { type: 'string', enum: [...collectorRunStatusValues] },
    chaptersFound: { type: 'number' },
    chaptersNew: { type: 'number' },
    errorMessage: { type: 'string', nullable: true },
    durationMs: { type: 'number', nullable: true },
    startedAt: { type: 'string', format: 'date-time' },
    finishedAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: [
    'id',
    'sourceId',
    'sourceUrl',
    'status',
    'chaptersFound',
    'chaptersNew',
    'errorMessage',
    'durationMs',
    'startedAt',
    'finishedAt',
  ],
  additionalProperties: false,
} satisfies JsonSchema;

export const sourceFailureSchema = {
  type: 'object',
  properties: {
    sourceId: { type: 'string' },
    sourceUrl: { type: 'string', format: 'uri' },
    novelTitle: { type: 'string' },
    status: { type: 'string' },
    consecutiveFailures: { type: 'number' },
    lastCheckedAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: [
    'sourceId',
    'sourceUrl',
    'novelTitle',
    'status',
    'consecutiveFailures',
    'lastCheckedAt',
  ],
  additionalProperties: false,
} satisfies JsonSchema;

export const coverQuerySchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      format: 'uri',
      description: 'HTTPS cover URL from an allowed WebNovel host.',
    },
  },
  required: ['url'],
  additionalProperties: false,
} satisfies JsonSchema;
