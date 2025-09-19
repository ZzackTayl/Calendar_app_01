import { Matchers } from '@pact-foundation/pact';

export const privacyLevelMatcher = Matchers.term({
  generate: 'details',
  matcher: /^(private|busy_only|details|public)$/,
});

export const uuidMatcher = Matchers.uuid();

export const timestampMatcher = Matchers.iso8601DateTimeWithMillis();
