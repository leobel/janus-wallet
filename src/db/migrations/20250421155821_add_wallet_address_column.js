export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.string('wallet_address');
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('wallet_address');
    });
};