export async function up(knex) {
    return knex.schema.alterTable('change_password_txs', (table) => {
        table.text('tx_cbor')
    })
}

export async function down(knex) {
    return knex.schema.alterTable('change_password_txs', (table) => {
        table.dropColumn('tx_cbor')
    })
}