# Turnkey <> Openfort


### Database setup

On Mac, follow these instructions to install Postgres:

    brew install postgresql@14
    createuser -s postgres

You'll find more about the `createuser` step [here](https://stackoverflow.com/a/15309551).

Next, create the database with:

    npx prisma db push

If it errors out (perhaps due to permission issues), simply run the included script:

    ./db/setup-database.postgres.sh

This script creates a local Postgres `issuing_treasury` database.

### Application launch

After necessary setups, launch the application with `npm run dev`.

*Note: This application serves as an example and should not proceed to production deployment as it is.*