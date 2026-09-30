import {
  ApprovalSchema,
  SummaryRequestSchema,
  ChatRequestSchema,
  SummaryResponseSchema,
} from '..';

describe('ApprovalSchema', () => {
  const valid = {
    id: 'a1',
    name: 'Site Patrol Onboarding & Checklists',
    type: 'Folder' as const,
    submittedBy: 'Sam HelpAdmin',
    status: 'Pending Review',
    date: 'Sep 18',
  };

  it('accepts a valid approval item', () => {
    expect(() => ApprovalSchema.parse(valid)).not.toThrow();
  });

  it('rejects an unknown type value', () => {
    expect(() =>
      ApprovalSchema.parse({ ...valid, type: 'Spreadsheet' }),
    ).toThrow();
  });

  it('accepts optional location field', () => {
    const result = ApprovalSchema.parse({
      ...valid,
      location: 'My Site Patrol › My Site Patrol Card',
    });
    expect(result.location).toBe('My Site Patrol › My Site Patrol Card');
  });

  it('requires id field', () => {
    const { id: _id, ...withoutId } = valid;
    expect(() => ApprovalSchema.parse(withoutId)).toThrow();
  });
});

describe('SummaryRequestSchema', () => {
  it('defaults language to "en" when omitted', () => {
    const result = SummaryRequestSchema.parse({});
    expect(result.language).toBe('en');
  });

  it('accepts "hi" as a valid language', () => {
    const result = SummaryRequestSchema.parse({ language: 'hi' });
    expect(result.language).toBe('hi');
  });

  it('rejects unsupported language codes', () => {
    expect(() => SummaryRequestSchema.parse({ language: 'fr' })).toThrow();
  });
});

describe('ChatRequestSchema', () => {
  it('rejects message longer than 500 chars', () => {
    expect(() =>
      ChatRequestSchema.parse({
        message: 'x'.repeat(501),
        history: [],
        language: 'en',
      }),
    ).toThrow();
  });

  it('rejects history with more than 10 turns', () => {
    const history = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'hello',
    }));
    expect(() =>
      ChatRequestSchema.parse({ message: 'hi', history, language: 'en' }),
    ).toThrow();
  });

  it('accepts valid message and empty history', () => {
    expect(() =>
      ChatRequestSchema.parse({ message: 'hi', history: [], language: 'en' }),
    ).not.toThrow();
  });
});

describe('SummaryResponseSchema', () => {
  it('rejects urgency values outside high/medium/low', () => {
    expect(() =>
      SummaryResponseSchema.parse({
        headline: 'test',
        priorities: [{ itemId: 'a1', urgency: 'critical', reason: 'x' }],
        narrative: 'test',
        source: 'ai',
        promptVersion: 'v1',
      }),
    ).toThrow();
  });

  it('rejects source values outside ai/fallback', () => {
    expect(() =>
      SummaryResponseSchema.parse({
        headline: 'test',
        priorities: [],
        narrative: 'test',
        source: 'human',
        promptVersion: 'v1',
      }),
    ).toThrow();
  });
});
