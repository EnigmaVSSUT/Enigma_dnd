# Enigma DnD API - Bruno collection

A [Bruno](https://www.usebruno.com) collection for every endpoint exposed by the API.

## Open the collection

1. Install Bruno (desktop app).
2. Choose **Open Collection** and select this `bruno/` folder.
3. Pick the **Local** environment (top right).

The API is expected at `http://localhost:3000`. Start it with `npm run dev`, or change `baseUrl` in `environments/Local.bru`.

## What is included

| Folder | Requests |
| --- | --- |
| Auth | `POST /api/v1/auth/signup`, `POST /api/v1/auth/signin` |
| Forms | `POST /create`, `GET /all/:userId`, `GET /getform/:userId/:formId`, `PUT /updateForm`, `PUT /publish`, `PUT /getformbyurl/:formUrl`, `PUT /submit`, `GET /stats/:userId`, `GET /getFormWithSubmissions/:formId`, `DELETE /delete/:formid` |
| Health | `GET /` |

Every request has:

- a ready-to-send **sample request** (headers, path params, body),
- one or more saved **response examples** (click the arrow next to the request in the sidebar),
- **Docs** with sample request/response bodies and the error cases the handler can return.

Response examples use Bruno's `example` blocks, so open the collection with a current Bruno release.

## Suggested run order

1. **Auth -> Sign Up** (or **Sign In**) - fills `token` and `userId`.
   - Sign Up generates a unique email and 10 digit registration number on each run, so it can be re-run without a `409`.
2. **Forms -> Create Form** - fills `formId` and `formUrl`.
3. **Forms -> Update Form**, **Publish Form**, **Get Form By URL**, **Submit Form**, **Get Form Stats**.
4. **Forms -> Get Form With Submissions**, **Delete Form**.

Variables are stored in `environments/Local.bru` and overridden at runtime by post-response scripts where noted.

## Command line

```bash
cd bruno
npx @usebruno/cli run --env Local
```

## Authorization caveat

`adminCoordinatorAuthValidation` reads `decoded.userId` from the JWT, but `signIn` / `signUp` sign only `{ userEmail, userRole }`. So `req.user.id` is `undefined`, and Prisma drops the undefined filter instead of failing. These endpoints still return 200, but they do **not** check form ownership:

- `DELETE /api/v1/form/delete/:formid`
- `GET /api/v1/form/getFormWithSubmissions/:formId`

Any token with role `admin` or `coordinator` can read submissions for, or delete, any form by id. The fix is to sign `userId` in the JWT and reject requests where it is missing. Verified with a full collection run against the local Docker database.
