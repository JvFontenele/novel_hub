import type { Connector } from './connector.interface.js';
import { GenericConnector } from './implementations/generic.connector.js';

const connectors: Connector[] = [
  new GenericConnector(),
];

export function resolveConnector(url: string): Connector {
  for (const connector of connectors) {
    if (connector.key !== 'generic' && connector.canHandle(url)) {
      return connector;
    }
  }
  // fallback to generic
  return connectors.find((c) => c.key === 'generic')!;
}

export function registerConnector(connector: Connector) {
  connectors.unshift(connector);
}
