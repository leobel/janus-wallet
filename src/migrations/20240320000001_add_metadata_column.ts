import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.alterTable('users', (table) => {
        table.jsonb('metadata').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('metadata');
    });
} 