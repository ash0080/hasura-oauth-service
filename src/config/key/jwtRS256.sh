npx fastify-secure-session > secret.key
openssl genrsa -out private.key 2048
# Don't add passphrase
openssl rsa -in private.key -pubout > public.key
cat private.key
cat public.key
