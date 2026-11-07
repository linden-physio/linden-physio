# Linden Physio

The booking page for Linden Physio, a physiotherapy clinic.

## Build

    npm install
    npm run build

## Test

    npm test

## Opening hours

The hours, holidays and bookings are in `src/booking.ts` until the clinic has a server.

The tests in `src/slots.test.ts` cover the free-times rules.

## Deploys

Every push to main is built by the host and goes live at lindenphysio.com.
