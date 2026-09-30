import { Router } from 'express';
import { ApprovalSchema } from '@approvals/contracts';
import fixture from '../data/approvals.fixture.json';

const router = Router();

// Validate fixture against schema at startup so a bad fixture fails loudly
const approvals = fixture.map((item) => ApprovalSchema.parse(item));

router.get('/', (_req, res) => {
  res.json(approvals);
});

export { router as approvalsRouter };
