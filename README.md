# CleanVentures

**Clean Together. Grow Together.**

CleanVentures is a mobile application designed to empower communities by providing a platform for organizing, funding, and participating in local cleanup and beautification projects. It connects civic-minded individuals and groups, enabling them to collaborate on "ventures" that make a tangible, positive impact on their environment.

---

## What it Does

CleanVentures is a comprehensive platform for managing local environmental initiatives from start to finish. It allows users to:

- **Discover & Join:** Find local cleanup ventures on an interactive map and request to join as a volunteer, contributor, or sponsor.
- **Create & Lead:** Initiate new ventures, defining their scope (e.g., cleaning, beautification), timeline, budget, and required roles.
- **Manage Teams & Tasks:** Venture owners can approve join requests, assign roles and permissions (Co-owner, Admin, Buyer), and create tasks for the team.
- **Collaborate:** Every venture has a dedicated group chat for seamless communication and coordination among members.
- **Manage Finances:** The app supports both free (volunteer-based) and paid (crowdfunded) ventures with a complete financial lifecycle, including:
    - A central **Marketplace** to purchase or rent supplies.
    - Dedicated **venture wallets** for managing funds.
    - **Personal wallets** for individual contributions.
    - A full transaction history for transparency.
- **Track Progress:** Users can track their contributions, earn badges, and build a reputation within the community.

## Who it is For

This application is built for:

- **Community Organizers:** Individuals who want to lead and organize local environmental projects.
- **Volunteers:** People looking for opportunities to contribute to their local community and environment.
- **Local Groups & NGOs:** Organizations that need a tool to manage their cleanup initiatives and engage with volunteers.
- **Civic-minded Individuals:** Anyone passionate about making a difference in their neighborhood.

## Tech Stack

The application is a full-stack mobile app built with a modern, type-safe stack:

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **UI:** React Native, NativeWind (Tailwind CSS for React Native)
- **Routing:** Expo Router
- **Backend API:** tRPC
- **Database:** MySQL/TiDB
- **ORM:** Drizzle ORM
- **Authentication:** Manus OAuth

## How to Run Locally

To set up and run the project on your local machine, follow these steps.

### 1. Prerequisites

- Node.js (v22.13.0 or later)
- pnpm (v9.12.0 or later)
- A running MySQL or TiDB database instance.

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/sapien2710/cleanventures.git
cd cleanventures
pnpm install
```

### 3. Environment Variables

The project uses environment variables for configuration, especially for the database connection. Create a `.env` file in the root of the project and add the necessary variables. Refer to `scripts/load-env.js` for details on required variables.

### 4. Database Migration

Once your database is running and the `.env` file is configured, apply the database schema:

```bash
pnpm db:push
```

This command uses Drizzle Kit to generate SQL migrations from your schema (`drizzle/schema.ts`) and applies them to the database.

### 5. Running the Application

The app consists of a backend server and a frontend client. The `concurrently` package is used to run them together.

- **For Web Development:**
  This command starts the tRPC backend server and the Expo Metro bundler for the web.

  ```bash
  pnpm dev
  ```

- **For Mobile Development (iOS/Android):**
  This command starts the backend server and the Expo Metro bundler for mobile. You can then scan the QR code with the Expo Go app on your device.

  ```bash
  pnpm dev:phone
  ```

  You can also run on a specific platform directly:

  ```bash
  # For iOS Simulator
  pnpm ios

  # For Android Emulator/Device
  pnpm android
  ```
