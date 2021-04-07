import 'reflect-metadata';
import config from './config';
import express from 'express';
import session from 'express-session';
import Logger from './loaders/logger';
import {Container} from "typedi";
import test2 from "./loaders";

async function startServer() {
    const app = express();

    const test33 = new test2({ expressApp: app });
    test33.listen(() => {

    })
}

startServer();