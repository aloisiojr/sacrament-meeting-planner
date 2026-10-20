/**
 * ARQ-10: the update-required screen links to the store via this constant. The
 * contract: on iOS it is the App Store page of THIS app; elsewhere it may be null
 * (not yet published) but never a wrong/placeholder URL.
 */
import { STORE_URL } from '../lib/appStore';

describe('STORE_URL', () => {
  it('is either null or the App Store page of the published app id', () => {
    if (STORE_URL !== null) {
      expect(STORE_URL).toContain('apps.apple.com');
      expect(STORE_URL).toContain('id6759450448');
    }
  });
});
