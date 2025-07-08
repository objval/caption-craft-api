# CaptionCraft: Project TODO List

This list is broken down by priority, from critical MVP features to post-launch improvements.

### 🚨 P0: Critical Path (MVP Foundation)

*These tasks are essential for the first functional version of the application.*

- [x] **Project Setup:** Initialize the Turborepo monorepo with `apps/api` and `apps/web`.
- [x] **Supabase Setup:**
    - [x] Create a new Supabase project.
    - [x] Design and create the database schema (`profiles`, `videos`, `transcripts`, `credit_packs`, `credit_transactions`).
    - [x] Implement Row Level Security (RLS) policies for all tables.
    - [x] Set up the database trigger to create a `profile` when a new user signs up in `auth.users`.
- [x] **Backend (API): Core Infrastructure:**
    - [x] Set up the NestJS application with the modular structure.
    - [x] Implement the `core/auth` module (`JwtAuthGuard`, `JwtStrategy`) to validate Supabase JWTs.
    - [x] Configure environment variables (`.env`) for Supabase, Cloudinary, OpenAI, and Redis.
- [x] **Backend (API): Credits System:**
    - [x] Implement the `credits` module (`controller`, `service`).
    - [x] Implement the `CreditGuard` and `@UseCredits` decorator.
    - [x] Implement the `GET /credits/me` endpoint.
- [x] **Backend (API): Video Upload Flow:**
    - [x] Implement the `POST /videos/upload` endpoint.
    - [x] Integrate `multer` for temporary file storage.
    - [x] Connect the endpoint to the `CreditGuard`.
- [x] **Backend (Workers): Transcription Job:**
    - [x] Set up BullMQ with a Redis connection.
    - [x] Create the `transcription-queue`.
    - [x] Implement the `TranscriptionProcessor` worker.
        - [x] Logic to upload original video to Cloudinary.
        - [x] Logic to extract audio with FFmpeg.
        - [x] Logic to call OpenAI Whisper API.
        - [x] Logic to save transcript and update video status in the database.
- [x] **Frontend (Web): Core Setup:**
    - [x] Set up the Next.js application.
    - [x] Configure Tailwind CSS.
    - [x] Set up the Supabase client (`supabase-js`).
- [x] **Frontend (Web): Authentication:**
    - [x] Create login, sign-up, and password-reset pages using the Supabase client UI.
    - [x] Implement logic to handle session state and securely store the JWT.
- [x] **Frontend (Web): Dashboard & Upload:**
    - [x] Create the main dashboard page.
    - [x] Implement the file upload component.
    - [x] Wire the upload component to the `POST /v1/videos/upload` backend endpoint.
    - [x] Implement the Supabase Realtime subscription to show live status updates for videos.

### 🏃 P1: Core Functionality (Completing the Loop)

*With these tasks, the main user journey will be complete.*

- [x] **Backend (API & Workers): Burn-In Flow:**
    - [x] Implement the `POST /v1/videos/:id/burn-in` endpoint with its `CreditGuard`.
    - [x] Create the `burn-in-queue` and the `BurnInProcessor` worker.
        - [x] Logic to generate an `.ass` or `.srt` subtitle file from the transcript.
        - [x] Logic to use FFmpeg to burn subtitles into the video.
        - [x] Logic to upload the final video to Cloudinary.
        - [x] Logic to update the video status and `final_video_cloudinary_id` in the database.
- [x] **Backend (API): Transcripts Module:**
    - [x] Implement the `transcripts` module (`controller`, `service`).
    - [x] Implement the `PUT /v1/transcripts/:id` endpoint.
- [x] **Frontend (Web): Video Gallery:**
    - [x] Implement the component to fetch and display the user's video projects from `GET /v1/videos`.
    - [x] Each video should show its thumbnail, title, status, and have a link to the editor.
- [x] **Frontend (Web): Transcript Editor:**
    - [x] Create the editor page (`/dashboard/edit=[id]`).
    - [x] Fetch video and transcript data from `GET /v1/videos/:id`.
    - [x] Implement the video player (using Cloudinary's player or a standard HTML5 player).
    - [x] Display the transcript in an editable format (e.g., a series of text inputs).
    - [x] Implement auto-saving of transcript edits to `PUT /v1/transcripts/:id`.
- [x] **Frontend (Web): Final Video & Download:**
    - [x] On the editor page, show the "Burn In" button.
    - [x] When status is `complete`, show a "Download" button linking to the final video URL.

### ✨ P2: Polish & User Experience

*These tasks will make the application feel professional and complete.*

- [ ] **UI/UX:** Implement a polished design system with consistent branding.
- [ ] **Frontend (Web):** Add a notification system (`react-hot-toast`) for user feedback.
- [ ] **Frontend (Web):** Add loading skeletons and spinners for a better perceived performance.
- [ ] **Editor:** Synchronize video playback with the transcript, highlighting the currently spoken word.
- [ ] **Emails:** Set up transactional emails (e.g., via Supabase) for welcome messages or important notifications.
- [ ] **Error Handling:** Implement comprehensive error handling on both the frontend and backend to gracefully manage failures (e.g., OpenAI API is down, video format is invalid).

### 🚀 P3: Post-Launch & Future Features

*Ideas for future expansion.*

- [ ] **Payments:** Implement a payment gateway (e.g., Stripe) to allow users to purchase credit packs.
- [ ] **Teams/Organizations:** Allow users to create teams and share video projects.
- [ ] **Customization:** Allow users to customize the appearance of the burned-in subtitles (font, color, size, position).
- [ ] **API for Developers:** Create a public API for other developers to use the transcription and burn-in service.
- [ ] **Admin Dashboard:** Create a dashboard for administrators to monitor system health, manage users, and view analytics.