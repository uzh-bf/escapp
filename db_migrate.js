#!/usr/bin/env node
const dotenv = require("dotenv");
const {exec} = require("child_process");

dotenv.config();

function callback (err, stdout, stderr) {
    // Node.js will invoke this callback when process terminates.
    if (err) {
        console.error(err);
    }
    console.log(stderr);
    console.log(stdout);
}

if (process.env.DATABASE_URL) {
    exec(`./node_modules/.bin/sequelize db:migrate --uri ${process.env.DATABASE_URL}`, callback);
} else if (process.env.DATABASE_HOST && process.env.DATABASE_USER && process.env.DATABASE_PASS && process.env.DATABASE_NAME) {
    exec("./node_modules/.bin/sequelize db:migrate --config models/config.js", callback);
} else {
    throw new Error("Please define valid database credentials (DATABASE_URL or DATABASE_HOST/DATABASE_USER/DATABASE_PASS/DATABASE_NAME).");
}
