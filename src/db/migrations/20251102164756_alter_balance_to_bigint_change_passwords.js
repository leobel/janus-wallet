export async function up(knex) {
    await knex.schema.alterTable('change_passwords', (table) => {
      table.bigInteger('balance').notNullable().alter();
    });
  }
  
  export async function down(knex) {
    await knex.schema.alterTable('change_passwords', (table) => {
      table.integer('balance').notNullable().alter();
    });
  }