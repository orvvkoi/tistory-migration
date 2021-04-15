import { Router, Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { Container, Inject } from 'typedi';
import { celebrate, Joi, Segments } from 'celebrate';
import { Logger } from 'winston';
import middlewares from '../middlewares';
import OAuthService from '../../services/tistory.auth';
import MigrationService from '../../services/migration';
import { IMigrationDTO, IUniqueKey } from '../../interfaces';
import config from '../../config';
import logger from '../../loaders/logger';
import socketIO from 'socket.io';

const route = Router();

export default (app) => {
  app.use('/migration', route);

  route.get(
    '/',
    [
      middlewares.looselyAuthenticatedMiddleware,
      middlewares.migrationMiddleware,
    ],
    celebrate({
      [Segments.COOKIES]: Joi.object({
        [config.tempForAuthCookieName]: Joi.string(),
      }).unknown(),
    }),
    async (req: Request, res: Response, next) => {
      try {

        //console.log('req.clientKeys ', req.clientKeys);
        logger.debug('socketId : %s ', req.sessionID);
        logger.debug('session : %s', JSON.stringify(req.session));


        if (!req.storageId) {
          return res.render('index', { step: 1 });
        }

        const migrationDto: IMigrationDTO = req as IMigrationDTO;

        const storages = migrationDto.clientKeys.filter((storage: any) => storage.accessToken);

        if (storages.length) {
          res.render('index', {
            storages,
          });
        } else {
          res.render('index', { step: 1 });
        }
      } catch (e) {
        return next(e);
      }
    },
  );

  route.get('/blogs', [
      middlewares.authenticatedMiddleware,
      middlewares.migrationMiddleware,
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {

        const migrationDto: IMigrationDTO = { ...req.query, clientKeys: req.clientKeys } as IMigrationDTO;

        const migrationServiceInstance = Container.get(MigrationService);
        const blogs = await migrationServiceInstance.getBlogList(migrationDto);

        res.json(blogs);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    });

  route.get(
    '/categories',
    [
      middlewares.authenticatedMiddleware,
      middlewares.migrationMiddleware,
    ],
    celebrate({
      [Segments.QUERY]: Joi.object({
        uniqueKey: Joi.object().keys({
          uuid: Joi.string().alphanum(),
          blogName: Joi.string(),
        }).required(),
      }).unknown(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const migrationDto: IMigrationDTO = { ...req.query, clientKeys: req.clientKeys } as IMigrationDTO;

        const migrationServiceInstance = Container.get(MigrationService);
        const categories = await migrationServiceInstance.getCategoryList(migrationDto);

        res.json(categories);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get(
    '/posts',
    [
      middlewares.authenticatedMiddleware,
      middlewares.migrationMiddleware,
    ],
    celebrate({
      [Segments.QUERY]: Joi.object({
        uniqueKey: Joi.object().keys({
          uuid: Joi.string().alphanum(),
          blogName: Joi.string(),
          categoryId: Joi.number(),
        }).required(),
      }).unknown(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const migrationDto: IMigrationDTO = { ...req.query, clientKeys: req.clientKeys } as IMigrationDTO;

        const migrationServiceInstance = Container.get(MigrationService);
        const posts = await migrationServiceInstance.getPostList(migrationDto);

        res.json(posts);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/progress',
    [
      middlewares.authenticatedMiddleware,
      middlewares.migrationMiddleware,
    ],
    celebrate({
      [Segments.BODY]: Joi.object({

        uniqueKeys: Joi.array().items(Joi.object({
          uuid: Joi.string().alphanum(),
          postId: Joi.number(),
          blogName: Joi.string(),
          categoryId: Joi.number(),
        })).required(),
        targetUniqueKey: Joi.object({
          uuid: Joi.string().alphanum(),
          blogName: Joi.string(),
          categoryId: Joi.number(),
        }).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const migrationDto: IMigrationDTO = { ...req.body, clientKeys: req.clientKeys } as IMigrationDTO;

        migrationDto.sessionId = req.sessionID;

        const migrationServiceInstance = Container.get(MigrationService);
        const { migrationSuccess, migrationFail } = await migrationServiceInstance.progress(migrationDto);

        res.json({ migrationSuccess, migrationFail });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.delete('/tokens/:uuid', [
      middlewares.authenticatedMiddleware,
      middlewares.migrationMiddleware,
    ],
    celebrate({
      [Segments.PARAMS]: Joi.object({
        uuid: Joi.string().alphanum(),
      }).required(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {

        const migrationDTO: IMigrationDTO = { ...req.params, storageId: req.storageId} as IMigrationDTO;

        const migrationServiceInstance = Container.get(MigrationService);
        const blogs = await migrationServiceInstance.deleteToken(migrationDTO);

        res.json(blogs);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    });
};
