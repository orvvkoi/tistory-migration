import { Container } from 'typedi';
import LoggerInstance from './logger';

export default ( models : { name: string; model: any }[]) => {
  try {
    models.forEach(m => {
      Container.set(m.name, m.model);
    });

  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
