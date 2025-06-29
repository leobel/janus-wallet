export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.string('circuit_id')
    })
}

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('circuit_id')
    })
}