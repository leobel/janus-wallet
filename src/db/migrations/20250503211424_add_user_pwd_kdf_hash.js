export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.string('pwd_kdf_hash');
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.dropColumn('pwd_kdf_hash');
    });
};
