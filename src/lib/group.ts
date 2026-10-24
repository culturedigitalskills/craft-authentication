/**
 * A membership counts as current when the artisan has not left the group and
 * is still on the platform. Removing an artisan takes them out of the member
 * lists and the member counts along with their profile.
 *
 * Shared so a list and the count beside it cannot disagree: showing four
 * members under a heading that says five is how that drift becomes visible.
 */
export const ACTIVE_MEMBERSHIP_WHERE = {
    leftDate: null,
    artisan: { deletedAt: null },
} as const
