export default {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'janus',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'janus_wallet'
    },
    migrations: {
        directory: './migrations',
        tableName: 'knex_migrations'
    },
    seeds: {
        directory: './seeds'
    }
}