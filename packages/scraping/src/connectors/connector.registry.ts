import type { Connector } from './connector.interface.js';
import { EmpireNovelConnector } from './implementations/empirenovel.connector.js';
import { GenericConnector } from './implementations/generic.connector.js';
import { NovelbinConnector } from './implementations/novelbin.connector.js';
import { WebnovelConnector } from './implementations/webnovel.connector.js';

const genericConnector = new GenericConnector();
const connectors: Connector[] = [
  new WebnovelConnector(),
  new NovelbinConnector(),
  new EmpireNovelConnector(),
  genericConnector,
];

export function listConnectors(): Connector[] {
  return [...connectors];
}

export function resolveConnector(url: string): Connector {
  return connectors.find((connector) => connector.canHandle(url)) ?? genericConnector;
}

export function resolveConnectorKey(url: string): string {
  return resolveConnector(url).key;
}

export function normalizeSourceUrl(url: string): string {
  return resolveConnector(url).normalizeUrl(url);
}

export async function fetchChapterContent(url: string): Promise<string> {
  const connector = resolveConnector(url);
  if (connector.fetchChapterContent) {
    return connector.fetchChapterContent(url);
  }
  throw new Error('Conteúdo de capítulo não disponível para esta fonte.');
}
