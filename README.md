# Prompt
You are a copywriter, design the content and hashtags A fast, cheeky, highly opinionated style that uses punchy short sentences, vivid metaphors, and sharp humor to turn expert judgement into entertaining, story-driven commentary writing style (just like the topgear style, but don't mention car if it is not car related) in traditional Chinese in hong kong vibe, don't mention topgear or 授權轉載 or Source, information source, price or test report. use your original writing. hashtags are in Chinese too. The paragraphs and images arrangement don't need to follow the original content. The image must place in the correct position between paragraphs (just the url only, don't need any decoration like 'Image URL:' or '[image:'). Also in headings and paragraphs style. Follow the fact and write in popular, entertain and interesting style.

return the content in the following json format:

{
  "title": "super very short title (stictly short, limited space)",
  "eyeblow": "very short",
  "subtitle": "super very short (stictly short, limited space)",
  "footer_line": "very short",
  "heading_hashtags": "3 main hashtags",
  "heading_image_1": {
    "url": "main heading image, prefer higher resolution. for cropping, not lower than 50% size",
    "heading": "short heading of image",
    "desc": "short description if any",
    "crop": {"x1": 0, "y1": 0, "x2": 0, "y2": 0}
  },
  "heading_image_2": {
    "url": "main heading image, prefer higher resolution",
    "heading": "short heading of image",
    "desc": "short description if any"
  },
  "paragraphs": [
    {
      "type": "p|image|hashtags",
      "heading": "heading if any (optional)",
      "url": "url for image",
      "content": "content of the type or desc of image",
      "background_color": "suggested color fit for the passage, e.g. #000000",
      "heading_color": "e.g. #000000",
      "content_color": "e.g. #000000",
      "background_image": "image url of background_image pattern/tile (repeatly) relate to the text, no real image or photo"
    }
  ]
}

# command
npx wrangler login
npx wrangler secret put JWT_SECRET
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put APPLE_PRIVATE_KEY
npx wrangler secret put APPLE_CLIENT_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY


# USE THIS TO GEN SECRET
npm install jose
node - <<'NODE'
import fs from 'fs';
import { SignJWT, importPKCS8 } from 'jose';

const teamId = '89YQ68UNXT';
const clientId = 'com.paragify.website';
const keyId = 'F5Z5WZNMJ8';
const privateKeyPem = fs.readFileSync('./AuthKey_F5Z5WZNMJ8.p8', 'utf8'); // path to your .p8

const now = Math.floor(Date.now() / 1000);
const exp = now + 60 * 60 * 24 * 180; // up to 6 months

const alg = 'ES256';
const pkcs8 = await importPKCS8(privateKeyPem, alg);

const token = await new SignJWT({})
  .setProtectedHeader({ alg, kid: keyId, typ: 'JWT' })
  .setIssuer(teamId)
  .setAudience('https://appleid.apple.com')
  .setSubject(clientId)
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .sign(pkcs8);

console.log(token);
NODE

[APPLE_CLIENT_SECRET]
eyJhbGciOiJFUzI1NiIsImtpZCI6IkY1WjVXWk5NSjgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiI4OVlRNjhVTlhUIiwiYXVkIjoiaHR0cHM6Ly9hcHBsZWlkLmFwcGxlLmNvbSIsInN1YiI6ImNvbS5wYXJhZ2lmeS53ZWJzaXRlIiwiaWF0IjoxNzcyMTQyNjQwLCJleHAiOjE3ODc2OTQ2NDB9.9TVPTWEIGtvWvfYd25nNoCA1zHK-qAU7uLRIyNv6XxtwNcdQmUtEeB1upFsS19q3Pp8rsj8AlJYiEKUqI3gwJw


## LOG
npx wrangler tail paragify


# OpenNext Starter

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Read the documentation at https://opennext.js.org/cloudflare.

## Develop

Run the Next.js development server:

```bash
npm run dev
# or similar package manager command
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Preview

Preview the application locally on the Cloudflare runtime:

```bash
npm run preview
# or similar package manager command
```

## Deploy

Deploy the application to Cloudflare:

```bash
npm run deploy
# or similar package manager command
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
