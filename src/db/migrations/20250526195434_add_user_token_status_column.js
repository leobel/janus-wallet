export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.string('token_status');
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('token_status');
    });
};
