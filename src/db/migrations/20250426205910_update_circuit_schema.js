export async function up(knex) {
    return knex.schema.alterTable('circuits', (table) => {
        table.renameColumn('owner', 'signer_key');
        table.renameColumn('mint_utxo', 'mint_utxo_ref');
    });
};

export async function down(knex) {
    return knex.schema.alterTable('circuits', (table) => {
        table.renameColumn('signer_key', 'owner');
        table.renameColumn('mint_utxo_ref', 'mint_utxo');
        
    });
};