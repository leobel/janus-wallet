import knex from 'knex';
import knexfile from './knexfile';

export const db = knex(knexfile); 