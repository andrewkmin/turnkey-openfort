# Turnkey <> Openfort

## Backend setup
### Database

On Mac, follow these instructions to install Postgres:

    brew install postgresql@14
    createuser -s postgres

You'll find more about the `createuser` step [here](https://stackoverflow.com/a/15309551).

Next, `cd` into `/backend`, install dependencies with `npm install`, and create the database with:

    npx prisma db push

If it errors out (perhaps due to permission issues), simply run the included script:

    ./db/setup-database.postgres.sh

This script creates a local Postgres `issuing_treasury` database.

## Frontend setup

```sh
$ cd/frontend
$ npm install
```

## Application launch

After necessary setups, launch the application with `npm run dev` in both `/frontend` and `/backend` respectively.

*Note: This application serves as an example and should not proceed to production deployment as it is.*