import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import { Container } from 'typedi';
import config from '../config';
import socketIO from 'socket.io';

export default () => {
  const app = Router();

  app.get(
    '/',
    async (req: Request, res: Response, next) => {
      try {

        /**
         * socket에 쓰려고 cookie session을 생성함.
         */
        if(!req.session.id) {
          req.session.id = uuidv4().replace(/-/g, '');
        }

        if(req.cookies[config.jwtCookieName]) {
          const token = req.cookies[config.jwtCookieName];

          jwt.verify(token, config.jwtSecret, function(err, decoded) {
            console.log('decoded ', decoded);
            if (err) {
              throw createError(419, 'Authentication Timeout.')
            }

            const now = new Date();
            const expireCheckDate = new Date( (parseInt(decoded.exp) * 1000) - 2 * 24 * 60 * 60 * 100 );

            if(now > expireCheckDate) {
              const socket: socketIO.Socket = Container.get('socket');

              socket.sockets.to(req.session.id).emit('expireNotification', {
                title :  `Client ID renewal required.`,
                message: `Only two days before the expiration date. Renewable with client ID authentication.` ,
              });
            }
          });
        }

        res.render('index');

      } catch (e) {
        return next(e);
      }
    },
  );

  return app;
};
