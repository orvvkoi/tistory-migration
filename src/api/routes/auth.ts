import {Router, Request, Response, NextFunction} from 'express';
import {Container} from 'typedi';
import AuthService from '../../services/auth';
import middlewares from '../middlewares';
import config from '../../config';
import {IAuth, IAuthInputDTO} from '../../interfaces/IAuth';
import {Logger} from 'winston';
import {celebrate, Joi, errors, Segments} from 'celebrate';

const route = Router();

export default (app) => {
    app.use('/oauth', route);

    route.get(
'/authentication',
        celebrate({
            [Segments.QUERY]: Joi.object({
                clientId: Joi.string().required(),
                clientSecret: Joi.string().required(),
                callbackUrl: Joi.alternatives().try(Joi.string().uri(), Joi.string().ip()).required(),
            })
        }),
        async (req: Request, res: Response, next: NextFunction) => {
            const logger: Logger = Container.get('logger');
            logger.debug('Calling authentication endpoint with query: %o', req.query);

            try {
                const data: IAuthInputDTO = req.query as any;
                const authToken = req.cookies[config.authTokenName];


                const authServiceInstance = Container.get(AuthService);

                const auth: IAuth = authServiceInstance.getAuthInterface(data, authToken);

                const {auth: temp, redirectUrl} = await authServiceInstance.authentication(auth);

                res.cookie(config.authTokenName, auth.authToken, {
                    maxAge: 90000000,
                    httpOnly: false
                });

                res.redirect(redirectUrl);
                // return res.status(200).json({ redirectUrl: redirectUrl });
            } catch (e) {
                logger.error('🔥 error: %o', e);
                return next(e);
            }
        }
    );

    route.get(
        '/callback',
        celebrate({
            [Segments.QUERY]:  Joi.object({
                code: Joi.string().token(),
                error: Joi.any().optional(),
                error_reason: Joi.any().optional(),
                error_description: Joi.any().optional(),
                state: Joi.string().optional().allow(null).allow(''),
            }).or('code', 'error', 'error_reason'),
            [Segments.COOKIES]: Joi.object({
                [config.authTokenName]: Joi.string().required()
            }).unknown()
        }),
        async (req: Request, res: Response, next: NextFunction) => {

        const logger: Logger = Container.get('logger');
        logger.debug('Calling authentication endpoint with query: %o', req.query);

        try {
            const data: IAuthInputDTO = req.query as any;
            const authToken = req.cookies[config.authTokenName];

            const authServiceInstance = Container.get(AuthService);
            const auth: IAuth = authServiceInstance.getAuthInterface(data, authToken);

            auth.socketId = req.session.socketio as string;

            await authServiceInstance.authorization(auth);

            res.send("<script>window.close();</script>");
            // return res.status(200).json({ redirectUrl: redirectUrl });
        } catch (e) {
            logger.error('🔥 error: %o', e);
            return next(e);
        }
    });


}
