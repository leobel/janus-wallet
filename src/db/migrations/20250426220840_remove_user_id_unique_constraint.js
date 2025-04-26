export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropUnique(['user_id']);
    });
}

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.unique(['user_id']);
    })
}
