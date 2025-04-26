export async function up(knex) {
    return knex.schema.createTable('circuits', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.integer('version').notNullable().unique();
        table.string('owner');
        table.string('nonce');
        table.string('policy_id');
        table.string('asset_name');
        table.string('mint_address');
        table.json('mint_utxo').notNullable();
        table.json('mint_script').notNullable();
        table.json('zk_verification_key').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex) {
    return knex.schema.dropTable('circuits');
} 

