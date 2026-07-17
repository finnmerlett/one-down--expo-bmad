import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { useFakeBillingStore } from '@/stores/fake-billing-store';

import * as fakeBillingSheetStories from './fake-billing-sheet.stories';

const { PendingRequest } = composeStories(fakeBillingSheetStories);

// One flow, one mount: the story opens a request via a mount effect on the
// GLOBAL fake-billing store — re-rendering it across test boundaries races
// RNTL's deferred unmount cleanup, so the pending → settled lifecycle is
// asserted in a single pass.
describe('FakeBillingSheet (portable stories)', () => {
  it('shows the labelled test billing dialog while a request is pending; Cancel settles and closes it', async () => {
    await render(<PendingRequest />);

    // Clearly labelled fake dialog — never imitates Google Play UI.
    expect(screen.getByText('Test billing · One Down Premium')).toBeTruthy();
    expect(screen.getByText('£1.50 / month')).toBeTruthy();
    expect(screen.getByLabelText('Buy')).toBeTruthy();
    // Local mode (no billing key) → failure simulator is always visible.
    expect(screen.getByLabelText('Simulate failure')).toBeTruthy();
    expect(useFakeBillingStore.getState().request).not.toBeNull();

    await fireEvent.press(screen.getByLabelText('Cancel'));

    expect(useFakeBillingStore.getState().request).toBeNull();
    expect(screen.queryByText('Test billing · One Down Premium')).toBeNull();
  });
});
