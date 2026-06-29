import {Router} from 'express';
import applicationsRouter from './applications';
import feedbackRouter from './feedback';

const router = Router();

// Mount sub-routers
router.use('/applications', applicationsRouter);
router.use('/feedback', feedbackRouter);

export default router;