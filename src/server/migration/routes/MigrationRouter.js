import express from 'express';
import MigrationController from '@server/migration/controllers/MigrationController';

const { Router } = express;

const MigrationRouter = Router();

MigrationRouter.get('/', MigrationController.migration);

MigrationRouter.get('/blogs', MigrationController.blogs);

MigrationRouter.get('/categories', MigrationController.categories);

MigrationRouter.get('/posts', MigrationController.posts);

MigrationRouter.post('/progress', MigrationController.progress);

export default MigrationRouter;
