# @ash0080/hasura-oauth-service

This is a full-featured OAuth proxy service, It works with hasura to provide users with login, logout and authentication features.

For now, it's OAuth proxy only, does not provide local registration, the biggest reason is that I do not need it, in addition to the 
implementation of registration also involves email/SMS verification, etc., which will make the size and complexity of the project greatly increased, however, this does not mean that you do not own the user data, the service still provides the basic user data, including, id, email, bio, avatar_url, etc., and the user can update these data through hasura.

## Changelog
1.0.0 - A full-featured oauth service used to extend [HASURA]()

## Architecture
![](../hasura-auth/image/architecture.png)

## Features

`OAuth:` Based on [grant](https://www.npmjs.com/package/grant), so it is easy to add 200+ OAuth Providers through a single configuration
file. without adding any new dependencies.

`Automatic Setup:` Based on my [@ash0080/fastify-hasura](https://www.npmjs.com/package/@ash0080/fastify-hasura) When the service starts and
connects to hasura, it automatically sets up the database and metadata. Hands free.

`Roles:` public, user, subscriber

`Redis Cache:` The actual use is [keyDB](https://keydb.dev) (an enhanced version of redis), which includes out-of-the-box data persistence
and some other features. It is used to cache basic user data and tokens. Reduce the time of token exchanging and the pressure on the
database from frequent exchanges.

`Finger Print:` A simple back-end user fingerprint verification based on
my [@ash0080/one-char-hash](https://www.npmjs.com/package/@ash0080/one-char-hash)

`Rate Limiting:` Based on [fastify-rate-limiter](https://www.npmjs.com/package/fastify-rate-limiter).

`Multi-device login:` Supports multiple device login for the same account, and the local Redis database keeps track of the user's tokens;

`Protected Hooks:` A built-in hooks endpoint validation.

`Internal Event Triggers:` Out of the box, you don't have to worry much about it, for synchronizing basic user data and roles, still for a
faster token exchange mechanism.

`Remote Cron Jobs:` Currently there are two,

* Auto-downgrade expired subscribers
* Auto-clean processed events and events logs. These take up a lot of space in hasura, and I saw someone say that he has 1.8G events_logs in
  the database.

`Unified endpoints:` Unified OAuth callback endpoint at `/token` and unified event webhook endpoint at `/events`, In fact, I actually don't
really like mixing Graphql and REST, so I want to expose as few endpoints as possible if I have to use them, This also has the advantage
that when you need to extend this project, you only need to extend these few endpoints, and the code is clearer and easier to understand.

| Features     | Highlights                                            |
|--------------|:------------------------------------------------------|
| OAuth        | Based on grant, Easy to expand to 200+ providers;     |
| Auto         | Auto set up, Hands free;                              |
| Cache        | keyDB for jwt and basic user profile caching;         |
| Rate-Limit   | Rate limiting;                                        |
| Multi-Device | Supports multiple device login;                       |
| Security     | Fingerprint & Protected Hooks;                        |
| Cron         | Roles cleaning and logs cleaning;                     |
| Unified      | Few exposed endpoints, easier to maintain and extend; |

## Prepare

Step 1: rename .example.env as .env and configure it with your data;

Step 2: run src/config/key/jwtRS256.sh to generate keys, 1 pair for jwt, the other for session;

Step 3: copy .jwt.example.json as .env to HASURA's path, fill it with the public_key you generated in step 2;

Step 4: config and restart your hasura with this new HASURA_GRAPHQL_JWT_SECRET environment variable;

## Run Service

Step 5: ```yarn i```

Step 6: ```yarn start```

Step 7: This service will config your hasura and database automatically, if no exception is thrown, The service will be started and exposed
at 0.0.0.0:${port} DONE!

## Routers

/- healthz check return 'ok'::string

/$ROUTE_PREFIX/:provider_name - the entry point user start login (eg: /oauth/github)

/$ROUTE_PREFIX/:provider_name/callback - the oauth callback url  (eg: /oauth/github/callback)

/token - the final redirect url after oauth callback, you GET {access_token, refresh_token}::json

/refresh - refresh token, you POST {refresh_token}, GET {access_token, refresh_token?}::json

/revoke - revoke token, you POST {refresh_token}, GET {success}::json

/events - the hasura events webhook endpoint

## Q&A

1. Why REST but not Remote Schema?  
   The oauth process is a series of redirects but nothing; All necessary basic user data is redis cached, there is no need to forward it
   through hasura;


2. Can I use Redis replace keyDB?  
   For now, Yes, you can. But in the future I may add some features unique to keydb, which may only be available in the Redis enterprise version

## Todo

1. Rewrite with typescript;
2. Add a function to limit the number of devices for multi-device login;
3. More Tests;

## Thanks
Thanks all people who helped develop this project, especially,

@simov - Author of [Grant](https://github.com/simov/grant)

@Johan Eliasson - Author of [nhost/hasura-auth](https://github.com/nhost/hasura-auth) 

## Contributing

Everyone is welcome to contribute. Please take a moment to review the [contributing guidelines](Contributing.md).

## Authors and license

[ash0080](Eldarion) and [contributors](/graphs/contributors).

MIT License, see the included [License.md](License.md) file.
