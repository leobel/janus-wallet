export async function up(knex) {
    await knex.schema.alterTable('change_password_txs', (table) => {
      table.bigInteger('amount').notNullable().alter();
    });
  }
  
  export async function down(knex) {
    await knex.schema.alterTable('change_password_txs', (table) => {
      table.integer('amount').notNullable().alter();
    });
  }
