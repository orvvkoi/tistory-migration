import { Router, Request, Response, NextFunction } from 'express';
import { Container, Inject } from 'typedi';
import { celebrate, Joi, Segments } from 'celebrate';
import { Logger } from 'winston';
import middlewares from '../middlewares';
import MigrationService from '../../services/migration';
import { IMigrationDTO, IUniqueKey } from '../../interfaces';
import logger from '../../loaders/logger';
import config from '../../config';


const route = Router();

export default (app) => {
  app.use('/migration', route);

  route.use([
    middlewares.authenticatedMiddleware,
    middlewares.migrationMiddleware,
  ])

  route.get(
    '/tokens',
    async (req: Request, res: Response, next) => {
      try {

        const migrationDto: IMigrationDTO = req as IMigrationDTO;

        if(!migrationDto.clientKeys) {
          return res.end();
        }
        const storages = migrationDto.clientKeys.filter((storage: any) => storage.accessToken);

        const tokens = storages.reduce(function(newArray, storage) {
          const data = {
            clientId: storage.clientId.slice(0, 15) + storage.clientId.slice(16).replace(/(?<=.{0})./gi, "*"),
            uuid: storage.uuid
          }

          newArray.push(data);

          return newArray;
        }, []);

        res.json(tokens);

      } catch (e) {
        return next(e);
      }
    },
  );

  route.get('/blogs',
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

        migrationDto.sessionId = req.session.id;

        const migrationServiceInstance = Container.get(MigrationService);
        const { migrationSuccess, migrationFail } = await migrationServiceInstance.progress(migrationDto);

        res.json({ migrationSuccess, migrationFail });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.delete('/tokens/:uuid',
    celebrate({
      [Segments.PARAMS]: Joi.object({
        uuid: Joi.string().alphanum(),
      }).required(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {

        const migrationDTO: IMigrationDTO = { ...req.params, storageId: req.storageId } as IMigrationDTO;

        const migrationServiceInstance = Container.get(MigrationService);
        const { deleteResult, remainTokens }: {deleteResult: boolean; remainTokens: number;} = await migrationServiceInstance.deleteToken(migrationDTO);

        if(!remainTokens) {
          res.clearCookie(config.jwtCookieName);
        }

        res.json({ result: deleteResult, remainTokens: remainTokens });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    });
};
