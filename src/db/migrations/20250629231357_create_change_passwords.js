export async function up(knex) {
    return knex.schema.createTable('change_passwords', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
        table.string('user_id').notNullable()
        table.string('spend_address').notNullable()
        table.string('pwd_hash').notNullable()
        table.string('pwd_kdf_hash').notNullable()
        table.string('nonce').notNullable()
        table.json('spend_script').notNullable()
        table.json('mint_utxo_ref').notNullable()
        table.integer('balance').notNullable()
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    })
}

export async function down(knex) {
    return knex.schema.dropTable('change_passwords')
} 

