const withSSL = typeof process.env.DATABASE_SSL !== "undefined" && process.env.DATABASE_SSL === "true";

module.exports = {
    "host": process.env.DATABASE_HOST,
    "username": process.env.DATABASE_USER,
    "password": process.env.DATABASE_PASS,
    "database": process.env.DATABASE_NAME,
    "ssl": withSSL,
    "dialect": "postgres",
    "dialectOptions": withSSL ? {"ssl": {"rejectUnauthorized": false}} : undefined
};
