![notify.uno header image](https://i.imgur.com/ZM2Bp3Y.jpg)

[![time tracker](https://wakatime.com/badge/github/Simolation/notify.uno.svg)](https://wakatime.com/badge/github/Simolation/notify.uno) ![Deploy](https://github.com/Simolation/notify.uno/workflows/Deploy/badge.svg?branch=master)

# notify.uno
Are you tired of waiting for your tasks to finish? Just do something more important and be notified when you need to check back on your terminal.

## Use it for free
notify.uno is currently deployed on one of my servers based on this master branch using [GitHub Actions](https://github.com/Simolation/notify.uno/actions). Use it right now: [notify.uno](https://notify.uno/?utm_source=github&utm_medium=repo&utm_campaign=readme&ref=github)

## Installing / Getting started
This service uses ```nodemon``` to start the dev server and ```pm2``` to run in production

To run an own instance of notify.uno just clone this repository and make sure you have node.js installed, then run yarn to install all dependencies and start the nodemon dev server

```shell
yarn install
yarn dev
```

Don't forget to add your own ```.env``` file to the root of the project that contains necessary environment variables

```shell
# NODE_ENV=production

DOMAIN=https://notify.uno/

MONGODB=Replace with your mongdb instance

GOOGLE_ID=Google ID for the sign in
GOOGLE_SECRET=Google OAuth secret
COOKIE_KEY=Key to encrypt the session cookie

EMAIL=E-Mail address for the vapid key
VAPID_PUBLIC=VAPID public key for push message sending
VAPID_PRIVATE=VAPID private key for push message sending
FCM_KEY=Firebase Cloud Messaging key to send alternative push messages
```