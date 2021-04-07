import express from 'express';
import session from './express.session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import routes from '../api';
import config from '../config';
import logger from 'morgan';
import {  isCelebrateError, errors } from 'celebrate';

export default ({ app, session }: { app: express.Application; session}) => {
    /**
     * Health Check endpoints
     * @TODO Explain why they are here
     */
    app.get('/status', (req, res) => {
        res.status(200).end();
    });
    app.head('/status', (req, res) => {
        res.status(200).end();
    });

    app.use(cors());
    app.use(require('method-override')());
    app.use(session);

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(cookieParser());
    // Load API routes
    app.use(config.api.prefix, routes());

    // Temp view engine
    app.use(express.static('public'));
    app.set('view engine', 'pug');

    app.use(logger('dev'));

    // catch 404 and forward to error handler
    app.use((req, res, next) => {
        const err = new Error('Not Found');
        err['status'] = 404;
        next(err);
    });

    // Celebrate errorhandler
    app.use(errors);
    /// error handlers
    app.use((err, req, res, next) => {
        // If this isn't a Celebrate error, send it to the next error handler
        if (isCelebrateError(err)) {
            console.log("err ", err)
            let result = {}
            for (const [key, { details }] of err.details) {
                result[key] = details.reduce((acc, { path, message,context }) => {
                    const customMsg = context.message || message;
                    acc[path.join('.')] = {
                        customMsg
                    }
                    return acc
                }, {})
            }


            console.log("result ", result)

           /* return res
                .status(400)
                .send({ message: err.message })
                .end();*/
        }
        /**
         * Handle 401 thrown by express-jwt library
         */
        if (err.name === 'UnauthorizedError') {
            return res
                .status(err.status)
                .send({ message: err.message })
                .end();
        }

        return next(err);

    });

    app.use((err, req, res, next) => {
        res.status(err.status || 500);
        res.json({
            errors: {
                message: err.message,
            },
        });
    });
};