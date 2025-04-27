export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.renameColumn('user_id', 'token_name');
      
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.renameColumn('token_name', 'user_id');
    });
};

