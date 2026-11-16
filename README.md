# Borradores de viaje

A place to sketch your next adventure. Build an itinerary on an interactive globe, compare equipment options and costs, and keep useful links and files alongside your trip.

Built with Nuxt, Vue, TypeScript, and Supabase. Available in **Spanish, English, and Catalan**.

## Features

- **Interactive itinerary:** search for destinations, add places to a MapLibre globe, write notes, assign days, and reorder stops.
- **Trip details:** edit the trip name, description, and start date.
- **Equipment planning:** organize items into groups and categories, compare options, record prices and quantities, and calculate totals for selected options.
- **Trip resources:** save links, descriptions, and uploaded files, with link and file previews.
- **Accounts:** sign up and sign in with email and password using Supabase Auth.
- **Trip discovery:** browse trips marked as public and load your own trips when signed in.
- **Responsive interface:** switch between the globe and places on mobile; view them side by side on desktop.
- **Custom themes:** choose Wild Nature (`wild-nature`), Psico (`psico`), or Minimal (`mnm`).

> Under active development. Token generation is present, but shared-link routes and token-based authorization are not implemented in the current source. See [Access and current limitations](#access-and-current-limitations).

## Tech stack

| Area           | Technology                               |
| -------------- | ---------------------------------------- |
| Application    | Nuxt 4, Vue 3, TypeScript                |
| UI and styling | Nuxt UI 4, Tailwind CSS 4, Lucide icons  |
| Maps           | MapLibre GL JS, OpenFreeMap tiles        |
| Place search   | Photon, through a Nuxt server endpoint   |
| Backend        | Supabase Postgres, Auth, and Storage     |
| Localization   | `@nuxtjs/i18n`                           |
| Code checks    | ESLint, `nuxt typecheck`, GitHub Actions |

## Getting started

### Requirements

- Node.js 22, matching CI, and npm.
- A Supabase project with the application's tables, relationships, access policies, and Storage bucket configured.
- Internet access for Supabase, map tiles, and place search.

### 1. Clone and install

```bash
git clone https://github.com/lauragonzalezcomalada/esborranysdeviatge.git
cd esborranysdeviatge
npm ci
```

The install lifecycle runs `nuxt prepare` automatically.

### 2. Configure the environment

Create a `.env` file in the project root:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-client-api-key
```

Use the client API key provided by your Supabase project, not a service-role or secret key. These variables are consumed by `@nuxtjs/supabase`; see its [configuration documentation](https://supabase.nuxtjs.org/getting-started/introduction).

The repository does not include a `.env.example`. Keep `.env` out of version control.

### 3. Configure Supabase

**The checked-in migrations are incremental, not a complete database bootstrap.** They assume existing tables. Use an existing compatible project, or recreate the base schema before applying the migrations.

The source expects these tables and fields. This overview is not a complete SQL schema:

| Table        | Fields used by the app                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `trips`      | `id`, `created_at`, `name`, `description`, `start_date`, `public`, `owner_id`, `public_token`         |
| `places`     | `id`, `created_at`, `trip_id`, `name`, `description`, `days`, `order_weight`, `longitude`, `latitude` |
| `groups`     | `id`, `trip_id`, `name`                                                                               |
| `categories` | `id`, `group_id`, `name`                                                                              |
| `options`    | `id`, `category_id`, `name`, `unit_price`, `link`, `quantity`, `selected`                             |
| `resources`  | `id`, `trip_id`, `name`, `description`, `link`, `file_path`                                           |

Trips belong to Auth users through `owner_id`. Places, groups, and resources belong to trips. Categories belong to groups, and options belong to categories. The nested equipment query requires PostgREST to recognize the corresponding foreign-key relationships.

The migrations in `supabase/migrations/`:

- Add place coordinates and a `get_trip_places` function, and configure trips and places policies.
- Create a public Storage bucket named `resources` and configure its object policy.
- Configure public reads for resource records.

Review the policy definitions before applying them; see [Access and current limitations](#access-and-current-limitations).

Enable email/password authentication in Supabase. Configure Auth URLs for your local and deployed environments. If email confirmation is enabled, users must complete the project's confirmation flow before signing in.

### 4. Start development

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

## Using the app

1. Browse a public trip, or sign in and create a trip of your own.
2. Open **Itinerary** to search for places, add stops, and organize their order and duration.
3. Open **Planning** to create equipment groups, categories, and options. Select options to include them in the cost totals.
4. Open **Resources** to collect links and files for the trip.
5. Use the language and theme selectors to customize the interface.

The interface exposes trip editing controls to the signed-in owner. Database policies must enforce the same permissions independently.

## Routes and server endpoints

| Route                           | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `/`                             | Home, public trips, account controls, and personal trips |
| `/login`                        | Email/password sign-in                                   |
| `/signup`                       | Account registration                                     |
| `/trip/:slug`                   | Itinerary; `slug` is currently a trip UUID               |
| `/trip/:slug/planning`          | Equipment planning and costs                             |
| `/trip/:slug/resources`         | Links and uploaded files                                 |
| `GET /api/places/search?q=...`  | Place search through Photon                              |
| `GET /api/link-preview?url=...` | Retrieve a preview image from a public web page          |

Spanish is the default locale and has no URL prefix. English and Catalan pages use `/en` and `/ca`. API endpoints are not localized.

## Project structure

| Path                                  | Contents                                                     |
| ------------------------------------- | ------------------------------------------------------------ |
| `app/pages/`                          | Home, authentication, and trip pages                         |
| `app/layouts/trip.vue`                | Shared trip layout, navigation, and trip editor              |
| `app/components/`                     | Globe, place cards, selectors, and resource previews         |
| `app/composables/useTripShell.ts`     | Shared trip state, ownership checks, and trip detail editing |
| `app/composables/useTripPlaces.ts`    | Trip and place data access and row mapping                   |
| `app/composables/useTripEquipment.ts` | Equipment group, category, and option data access            |
| `app/composables/useTripResources.ts` | Resource records and Storage uploads                         |
| `app/composables/useAppColorMode.ts`  | Custom theme selection                                       |
| `app/types/database.types.ts`         | Database types currently used by the app                     |
| `app/assets/css/main.css`             | Global styles and theme palettes                             |
| `i18n/locales/`                       | Spanish, English, and Catalan translations                   |
| `server/api/`                         | Place search and link-preview endpoints                      |
| `supabase/migrations/`                | Incremental database and Storage migrations                  |

The globe is a client-only component (`GlobeMap.client.vue`). Server endpoints run through Nuxt's server runtime.

## Development commands

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the development server         |
| `npm run build`     | Build for production                 |
| `npm run preview`   | Preview the production build locally |
| `npm run lint`      | Run ESLint                           |
| `npm run typecheck` | Run Nuxt's TypeScript checks         |

GitHub Actions runs lint and type checks on pushes using Node.js 22. No automated unit or end-to-end test suite is currently configured.

## Deployment

Use a Nuxt-compatible host that supports server endpoints. The application calls `/api/places/search` and `/api/link-preview`, so serving static files alone does not provide the full app.

Configure the Supabase environment variables on the hosting provider, update Supabase Auth URLs for the deployed domain, and build with:

```bash
npm run build
```

For a Node server deployment, start the generated server with:

```bash
node .output/server/index.mjs
```

For managed hosting, use the provider's Nuxt/Nitro integration and generated deployment output. No provider-specific deployment configuration is checked in.

## Access and current limitations

- **Trip visibility needs database enforcement.** The UI filters public trips and owner trips, but the checked-in trips and places policies allow all operations for both `anon` and `authenticated`. They do not enforce private trips or owner-only writes.
- **Resource files are public.** The `resources` bucket is public, its checked-in object policy allows all operations for both roles within that bucket, and the resources table has an unrestricted SELECT policy. Configure appropriate database and Storage policies before using sensitive files.
- **Shared links are unfinished.** Trip creation generates a six-character `public_token`. The router and trip loader still use UUIDs; there is no shared-token endpoint, sharing toggle, or collision-retry logic in the source.
- **Database setup is incomplete in version control.** Initial table creation and a full schema export are not included. The TypeScript database definitions cover only part of the data model.
- **External services affect availability.** Map rendering depends on OpenFreeMap, place search depends on Photon, and resource previews depend on the linked site's response.

## Contributing

Issues and pull requests are welcome. Describe the behavior you want to change, keep changes focused, and run:

```bash
npm run lint
npm run typecheck
```

When changing database fields or relationships, include the relevant migrations and update the database types. Add translations in all three locale files when introducing interface text.

## License

This repository includes an [MIT license](LICENSE) with the original Nuxt UI Templates copyright notice.

## Acknowledgements

- [Nuxt](https://nuxt.com/) and [Nuxt UI](https://ui.nuxt.com/)
- [Supabase](https://supabase.com/)
- [MapLibre](https://maplibre.org/), [OpenFreeMap](https://openfreemap.org/), and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- [Photon](https://photon.komoot.io/)
