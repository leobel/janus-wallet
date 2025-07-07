export async function up(knex) {
    return knex.schema.createTable('change_password_txs', (table) => {
        table.uuid('change_password_id').notNullable()
        table.string('tx_id').notNullable()
        table.string('tx_cbor').notNullable()
        table.integer('amount').notNullable()
        table.string('type').notNullable()
        table.string('status').notNullable()
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
    })
}

export async function down(knex) {
    return knex.schema.dropTable('change_password_txs')
}