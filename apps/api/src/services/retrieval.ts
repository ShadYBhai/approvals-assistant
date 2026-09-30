export interface PolicyChunk {
  id: string;
  heading: string;
  body: string;
}

// The 4 policy chunks — loaded once at startup
const CHUNKS: PolicyChunk[] = [
  {
    id: 'general-review',
    heading: 'General review',
    body: 'Before approving any submission, the reviewer opens the item, confirms the title and type match the actual content, and checks that the submitter and date are recorded. Every decision (approve, return for changes, or reject) must include a short written reason so the audit trail stays complete. Items are reviewed in the order they were submitted, unless a safety-related item is waiting, in which case it goes first.',
  },
  {
    id: 'safety',
    heading: 'Safety-related material',
    body: 'Documents describing safety equipment, sensor specifications or patrol checklists are reviewed with extra care and take priority over routine content. The reviewer confirms that model numbers, operating ranges and inspection intervals are stated, that instructions do not conflict with existing site procedures, and that the document names an owner responsible for keeping it current. If any safety value is missing or unclear, return the item to the submitter instead of approving it.',
  },
  {
    id: 'video-image',
    heading: 'Video and image submissions',
    body: 'For videos, confirm that the recording plays fully, shows the stated location or procedure, and does not expose personal information about bystanders. For images and layout maps, confirm that zones and camera positions are clearly labelled, the image is readable when enlarged, and it matches the site it is filed under. Folders are reviewed by opening each contained item; a folder is approved only when every item inside it passes.',
  },
  {
    id: 'rejection-escalation',
    heading: 'Rejection and escalation',
    body: 'Return an item for changes when the content is correct but incomplete or unclear. Reject it when it is inaccurate, belongs to a different site, or duplicates an approved item. Escalate to a senior administrator when an item affects safety procedures and the reviewer is unsure, or when the submitter and the reviewer are the same person. Every rejection must state what should change so the submitter can resubmit.',
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'i', 'you', 'we', 'they',
  'it', 'this', 'that', 'what', 'how', 'when', 'where', 'which', 'who',
  'me', 'my', 'your', 'their', 'its',
]);

const MIN_SCORE = 1;
const MAX_RESULTS = 2;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function matches(queryToken: string, chunkToken: string): boolean {
  // exact match OR one is a prefix of the other (handles plurals: video/videos, submission/submissions)
  if (queryToken === chunkToken) return true;
  if (queryToken.length >= 4 && chunkToken.startsWith(queryToken)) return true;
  if (chunkToken.length >= 4 && queryToken.startsWith(chunkToken)) return true;
  return false;
}

function score(queryTokens: string[], chunk: PolicyChunk): number {
  const chunkTokens = tokenize(chunk.heading + ' ' + chunk.body);
  return queryTokens.filter((qt) => chunkTokens.some((ct) => matches(qt, ct))).length;
}

export function retrieve(question: string): PolicyChunk[] {
  const queryTokens = tokenize(question);
  if (queryTokens.length === 0) return [];

  return CHUNKS
    .map((chunk) => ({ chunk, s: score(queryTokens, chunk) }))
    .filter(({ s }) => s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_RESULTS)
    .map(({ chunk }) => chunk);
}
