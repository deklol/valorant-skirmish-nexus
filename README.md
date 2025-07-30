# The Last Resort Skirmish Hub — System Architecture & Technical Overview

Welcome to the technical deep dive into The Last Resort Skirmish Hub! This document outlines the core architecture, advanced algorithms, and robust systems that power our competitive gaming events, providing a seamless and fair experience for all participants.

---

## 🚀 Technology Stack

Our platform is built with a modern, scalable, and developer-friendly stack:

### Frontend:
- **React + TypeScript:** A robust and type-safe foundation for building dynamic user interfaces.  
- **Vite:** A fast development build tool that provides instant hot module replacement.  
- **Tailwind CSS:** A utility-first CSS framework for rapid and consistent styling.  
- **shadcn/ui:** A collection of reusable components built with Radix UI and Tailwind CSS, ensuring accessibility and a polished look.  
- **React Router:** For efficient client-side navigation and routing within the application.  

### Backend & Database:
- **Supabase:** Our chosen backend-as-a-service, providing:  
  - **PostgreSQL:** A powerful and reliable relational database.  
  - **Row Level Security (RLS):** Granular control over data access, ensuring users can only view or modify data they are authorized for.  
  - **Real-time Subscriptions:** Instant data synchronization for live updates across the platform.  
  - **Supabase Auth:** Secure user authentication and management.  

### Other:
- **Custom-built Tournament and Team Management Logic:** Tailored algorithms and services designed specifically for our unique event formats.

---

## 🏁 Tournament Lifecycle

Our tournaments progress through distinct, well-defined stages, each managed by automated systems and real-time updates:

1. **Draft:** The initial phase where tournament administrators configure rules, game modes, and participant limits.  
2. **Open:** Player registration active. Participants can sign up, form teams, and prepare for the event.  
3. **Balancing:** A critical automated phase where teams are intelligently created or rebalanced based on our proprietary rank weighting system to ensure competitive fairness.  
4. **Live:** Matches are in progress. Scores, match statuses, and bracket progressions are updated in real-time.  
5. **Completed:** The tournament has concluded, winners are determined, final statistics are recorded, and historical data is archived.  

---

## 🏆 Bracket Generation Logic

At the heart of our tournament system is a sophisticated bracket generation and management engine:

- **Algorithm:** `calculateBracketStructure()`  
  - Dynamically generates optimal single-elimination bracket structures.  
  - Intelligently handles various participant counts, including non-power-of-2 numbers, by implementing appropriate byes.  
  - Ensures fair seeding based on player ranks or other defined criteria.  
- **Progression:** Automated match advancement. As soon as a match result is confirmed, the winning team/player is automatically moved to the next round, updating the bracket in real-time.  
- **Validation:** Real-time bracket health monitoring continuously checks for structural integrity, potential errors, and ensures smooth progression, flagging any anomalies proactively.  

---

## ⚖️ Rank Weight System & Team Balancing

| Rank       | Points       | Description               |
|------------|--------------|---------------------------|
| Iron 1-3   | 10 - 20 pts  | Entry-level players       |
| Bronze 1-3 | 20 - 40 pts  | Developing players        |
| Silver 1-3 | 40 - 70 pts  | Intermediate players      |
| Gold 1-3   | 70 - 90 pts  | Above average players     |
| Platinum 1-3 | 90 - 120 pts | Skilled players         |
| Diamond 1-3 | 120 - 180 pts | Mid skilled players     |
| Ascendant+ | 180 - 300 pts | High players             |
| Immortal+  | 300 - 500 pts | Top-tier players         |

- **Ranking Algorithm:** `rankingSystemWithOverrides()`  
  - Calculates an effective player rank by combining multiple data points:  
    - **Base Rank:** The player's primary competitive rank.  
    - **Peak Rank:** Accounts for a player's highest achieved rank to prevent "smurfing" or sandbagging.  
    - **Manual Overrides:** Allows administrators to make fine-tuned adjustments for specific player circumstances or known skill levels not reflected by automated data.  
- **Team Balancing:** `TeamBalancingLogic.generateTeams()`  
  - Utilizes an iterative optimization algorithm to distribute players across teams.  
  - The primary goal is to minimize the rank variance (or skill differential) between all participating teams, ensuring that matches are as balanced and exciting as possible.  

---

## 🗺️ Veto Flow (Best-of-1)

Our interactive map veto system provides strategic depth for best-of-1 matches:

1. Home team bans map: The first team removes a map from the pool.  
2. Away team bans map: The second team removes another map.  
3. Away team bans map: The second team removes a third map.  
4. Home team bans map: The first team removes a fourth map.  
5. Away team bans map: The second team removes a fifth map.  
6. Home team bans map: The first team removes a sixth map.  
7. Map is auto-picked: The final remaining map is automatically selected for play.  
8. Home team chooses side: The home team then selects their starting side (e.g., Attack/Defense).  

This process is reflected in real-time within the user interface, allowing captains to make informed decisions.

---

## 🎲 Cryptographically Secure Dice Rolling

For fair and transparent in-game decisions (e.g., tie-breakers, side selection where not vetoed), we implement a cryptographically secure dice rolling mechanism:

- **Secure Randomness:** Leverages the browser's native `window.crypto.getRandomValues()` API, which provides high-quality, unpredictable random numbers suitable for cryptographic purposes.  
- **Verifiable Seed:** Each roll's seed is generated by combining:  
  - A precise timestamp for temporal uniqueness.  
  - The user ID of the initiator for accountability.  
  - Additional cryptographic random data from `getRandomValues()`.  
- **Transparency:** All dice rolls, along with their full contextual data (seed, participants, outcome), are meticulously logged in the `audit_logs` database table, maintaining complete transparency and verifiability for all events.  

---

## 🗄️ Core Database Tables

Our Supabase PostgreSQL database schema is structured to efficiently manage all tournament-related data:

- `tournaments`: Stores details about each tournament (status, dates, rules).  
- `teams`: Manages team information (names, logos, current roster).  
- `matches`: Records individual match data (teams, scores, status, associated tournament).  
- `users`: User profiles and authentication details.  
- `team_members`: Junction table linking users to teams.  
- `map_veto_sessions`: Tracks the state of ongoing map veto processes.  
- `map_veto_actions`: Logs each ban/pick action within a veto session.  
- `maps`: Reference data for available game maps.  
- `match_maps`: Links matches to specific maps played.  
- `audit_logs`: Comprehensive log of critical system actions and user interactions (including dice rolls).  
- `notifications`: Stores user notifications.  
- `user_notification_preferences`: User-specific settings for notification delivery.  
- `vods`: Stores video-on-demand (VOD) links and metadata for past matches/tournaments.  

---

## 🔒 Security & Access Control

Security is paramount. Our platform implements robust measures to protect data and ensure authorized access:

- **Row Level Security (RLS):** Implemented across all critical database tables. This ensures that:  
  - Users can only access or modify data they explicitly own (e.g., their profile, their team's data).  
  - Public data is accessible to all, while sensitive data is restricted.  
  - Administrators have elevated privileges where necessary, strictly controlled.  
- **Supabase Authentication:** Handles secure user registration, login, and session management.  
- **Audit Trails:** Comprehensive audit logs are maintained for all critical actions, providing a clear, immutable record of who did what and when, crucial for transparency and debugging.  

---

## ⚡ Real-Time Features

Leveraging PostgreSQL's NOTIFY/LISTEN capabilities via Supabase real-time subscriptions, we provide an engaging, live experience:

- **Live Matches:** Instantaneous propagation of score updates, match status changes, and player actions to all connected clients.  
- **Veto Actions:** Real-time display of map bans and picks as they occur during the veto phase.  
- **Team Changes:** Immediate updates when team rosters are modified or players join/leave.  
- **Notifications:** Push real-time notifications to users about match starts, results, and other relevant events.  

---

## 🩺 Health Monitoring & Emergency Tools

To ensure continuous operation and rapid response to issues, we have integrated proactive monitoring and recovery tools:

- **BracketHealthAnalyzer:** A dedicated system that continuously monitors the integrity and progression of tournament brackets in real time, flagging any inconsistencies or stalled matches.  
- **TournamentHealthDashboard:** Provides administrators with a high-level overview of all active tournaments, highlighting potential issues, performance metrics, and critical alerts.  
- **Emergency Reset:** A controlled mechanism allowing safe rollback of a tournament to a previous stable state in case of critical errors, with all actions meticulously recorded in the `audit_logs`.  
- **Team Reconstruction:** Advanced tools to facilitate the re-assignment of players and rebalancing of teams in complex scenarios (e.g., player dropouts, unforeseen imbalances), minimizing disruption to ongoing events.  

---

## 🧑‍💻 Developer Instructions

### Getting Started Locally

To get the Skirmish Hub running on your local machine, follow these simple steps:

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
npm run dev
