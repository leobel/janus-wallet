export async function up(knex) {
    return knex.schema.createTable('users', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('user_id').notNullable().unique();
        table.string('pwd_hash').notNullable();
        table.json('zk_verification_ref').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex) {
    return knex.schema.dropTable('users');
} 
