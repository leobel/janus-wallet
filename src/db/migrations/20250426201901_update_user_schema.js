export async function up(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.renameColumn('wallet_address', 'spend_address');
        table.renameColumn('zk_verification_ref', 'mint_utxo_ref');
        table.string('policy_id');
        table.string('nonce');
        table.json('spend_script');
    });
};

export async function down(knex) {
    return knex.schema.alterTable('users', (table) => {
        table.renameColumn('spend_address', 'wallet_address');
        table.renameColumn('mint_utxo_ref', 'zk_verification_ref');
        table.dropColumn('policy_id');
        table.dropColumn('nonce');
        table.dropColumn('spend_script');
    });
};
