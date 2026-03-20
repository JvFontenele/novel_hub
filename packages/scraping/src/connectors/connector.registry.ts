import type { Connector } from './connector.interface.js';
import { GenericConnector } from './implementations/generic.connector.js';
import { WebnovelConnector } from './implementations/webnovel.connector.js';

const genericConnector = new GenericConnector();
const connectors: Connector[] = [new WebnovelConnector(), genericConnector];

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
