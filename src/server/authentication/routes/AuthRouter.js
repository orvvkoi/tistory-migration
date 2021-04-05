import express from 'express';
import AuthController from '@server/authentication/controllers/AuthController';

const { Router } = express;

// router instance
// eslint-disable-next-line new-cap
const AuthRouter = Router();

/**
 * Tistory login and app authorization
 */
AuthRouter.get('/authentication', (req, res) => {
    AuthController.authentication(req, res);
});

/**
 * Tistory OAuth callback
 */
AuthRouter.get('/callback', (req, res, next) => {
    AuthController.authorization(req, res);
});

export default AuthRouter;
