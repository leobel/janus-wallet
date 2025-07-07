export async function up(knex) {
    return knex.schema.alterTable('change_password_txs', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    })
}

export async function down(knex) {
    return knex.schema.alterTable('change_password_txs', (table) => {
        table.dropColumn('id')
    })
}