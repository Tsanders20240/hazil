# HÄZIL — KRUCIAL 10/10 Website

This package contains the complete front end plus a Cloudflare Worker backend for real fan signups and business inquiries.

## Production deployment

1. Install/login to Wrangler.
2. From this folder, create the database:
   `npx wrangler d1 create hazil-signups`
3. Copy the returned `database_id` into `wrangler.toml`.
4. Create the tables:
   `npx wrangler d1 execute hazil-signups --remote --file=./schema.sql`
5. Deploy:
   `npx wrangler deploy`
6. In Cloudflare Workers & Pages, bind `hazil.atechspot.com` as a Custom Domain to this Worker.

## Optional inquiry email alerts

The forms already store submissions in D1. To also email a notification, add a Resend secret:
`npx wrangler secret put RESEND_API_KEY`

Then set a verified sender in `wrangler.toml` as `RESEND_FROM_EMAIL`.

## Important

- Do not put API keys in `public/` or browser JavaScript.
- The frontend no longer uses mailto as its form submission mechanism.
- Merchandise is intentionally not fabricated. Add commerce only when actual products, prices and fulfillment are ready.
- KRUCIAL is the featured campaign; Someday, Greater and We Up are catalog support.
