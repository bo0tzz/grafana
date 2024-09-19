import { APIs } from '../generated/apis.gen';
import { Components } from '../generated/components.gen';
import { Pages } from '../generated/pages.gen';
import { E2ESelectors } from '../types';

import { resolveSelectors } from './resolver';

/**
 * Exposes selectors in package for easy use in e2e tests and in production code
 *
 * @alpha
 */
export const selectors: {
  pages: E2ESelectors<typeof Pages>;
  components: E2ESelectors<typeof Components>;
  apis: typeof APIs;
} = {
  pages: Pages,
  components: Components,
  apis: APIs,
};

/**
 * Exposes Pages, Component selectors and E2ESelectors type in package for easy use in e2e tests and in production code
 *
 * @alpha
 */
export { Pages, Components, resolveSelectors, type E2ESelectors };
