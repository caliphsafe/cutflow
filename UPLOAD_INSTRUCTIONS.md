# Upload this patch over CutFlow v2.2

Upload the folders and files in this patch to the root of the existing GitHub repository, preserving the same paths and replacing the existing files.

## Delete from GitHub

Delete this tracked file if it exists:

```text
package-lock.json
```

## Vercel variables

Delete:

```text
STRIPE_CONNECT_CLIENT_ID
```

Add:

```text
STRIPE_CONNECTED_ACCOUNT_COUNTRY=US
```

Keep:

```text
STRIPE_SECRET_KEY
STRIPE_PRICE_PRO
STRIPE_WEBHOOK_SECRET
STRIPE_CONNECT_WEBHOOK_SECRET
```

No Supabase SQL migration is required for this patch.

Redeploy without using the previous build cache.
