import { Router, Request, Response, NextFunction } from 'express';

import { Container, Inject } from 'typedi';
import { celebrate, Joi, Segments } from 'celebrate';
import { Logger } from 'winston';
import middlewares from '../middlewares';
import OAuthService from '../../services/tistory.auth';
import MigrationService from '../../services/migration';
import { IMigration } from '../../interfaces/IMigration';
import config from '../../config';

const route = Router();

export default (app) => {
  app.use('/migration', route);

  route.get(
    '/',
    middlewares.isAuth,
    middlewares.migrationMiddleware,
    celebrate({
      [Segments.COOKIES]: Joi.object({
        [config.tempForAuthCookieName]: Joi.string(),
      }).unknown(),
    }),
    async (req: Request, res: Response) => {
      try {

        console.log(`test req.session.id ||||||${config.jwtSecret}|||||||${config.jwtAlgorithm}||||||||`);
        console.log("test req.session.id ", req.session.id);
        console.log("test req.token ", req[config.authProperty]);

        if (!req.storageId) {
          return res.render('index', { step: 1 });
        }

        const { storageData } = req;

        const storages = Object.values(storageData).filter((storage: any) => storage.accessToken);

        if (storages.length) {
          res.render('index', {
            step: 3,
            storages,
          });
        } else {
          res.render('index', { step: 1 });
        }
      } catch (e) {
        res.render('index', { step: 1 });
      }
    },
  );

  route.get('/blogs', middlewares.migrationMiddleware, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');

    try {
      const auth: IMigration = { ...req.query, ...{ storageData: req.storageData } };

      const migrationServiceInstance = Container.get(MigrationService);

      const blogs = await migrationServiceInstance.getBlogList(auth);

      res.json(blogs);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  route.get(
    '/categories',
    middlewares.migrationMiddleware,
    celebrate({
      [Segments.QUERY]: Joi.object({
        uniqueKey: Joi.string().required(),
      }).unknown(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const auth: IMigration = { ...req.query, ...{ storageData: req.storageData } };

        const migrationServiceInstance = Container.get(MigrationService);
        const categories = await migrationServiceInstance.getCategoryList(auth);

        res.json(categories);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get(
    '/posts',
    middlewares.migrationMiddleware,
    celebrate({
      [Segments.QUERY]: Joi.object({
        uniqueKey: Joi.string().required(),
      }).unknown(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const auth: IMigration = { ...req.query, ...{ storageData: req.storageData } };

        const migrationServiceInstance = Container.get(MigrationService);
        const posts = await migrationServiceInstance.getPostList(auth);

        res.json(posts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/progress',
    middlewares.migrationMiddleware,
    celebrate({
      [Segments.BODY]: Joi.object({
        uniqueKeys: Joi.array().items(Joi.string()).required(),
        targetUniqueKey: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const auth: IMigration = { ...req.body, ...{ storageData: req.storageData } };

        auth.socketId = req.session.socketId as string;

        const migrationServiceInstance = Container.get(MigrationService);
        const progress = await migrationServiceInstance.progress(auth);

        res.json(progress);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
