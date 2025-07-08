# Project Breakdown: "CaptionCraft"

### 1. High-Level Summary

**CaptionCraft** is a modern, full-stack web application designed to automate the process of transcribing videos and burning in visually appealing, TikTok-style subtitles. The user uploads a video, and the system automatically generates a word-level transcript using AI. The user can then review and edit the transcript in a purpose-built editor before initiating a "burn-in" process, which creates a new video file with the subtitles permanently rendered onto the frames.

The application is built for performance and scalability, using a reactive, non-blocking architecture with a job queue system to handle intensive media processing in the background, ensuring a smooth and responsive user experience.

### 2. Core Technology Stack

*   **Monorepo:** Turborepo
*   **Frontend:** Next.js with TypeScript & Tailwind CSS
*   **Backend:** NestJS with TypeScript (Modular Architecture with Repository Pattern)
*   **Database & Auth:** Supabase (PostgreSQL, GoTrue Auth, Realtime)
*   **Job Queue:** BullMQ with Upstash Redis
*   **Media Storage & Transformation:** Cloudinary
*   **Video/Audio Processing:** FFmpeg
*   **AI Transcription:** OpenAI Whisper API
*   **Configuration Management:** Environment-specific configs with validation
*   **Type Safety:** Comprehensive DTOs and Entity interfaces
*   **Error Handling:** Global exception filters and type-safe decorators

### 3. The User Flow: A Seamless Journey

1.  **Onboarding & Authentication:**
    *   The user lands on a marketing page describing the service.
    *   The user signs up or logs in using their email/password or a social provider via the **Supabase client-side library**. The backend is not involved in this step.
    *   Upon login, the frontend securely stores the JWT provided by Supabase.

2.  **The Dashboard:**
    *   The user is taken to their dashboard, which displays a gallery of their existing video projects.
    *   Their current credit balance is clearly visible.
    *   A prominent "Upload Video" button is the primary call-to-action.

3.  **Video Upload & Credit Deduction:**
    *   The user clicks "Upload Video" and selects a file.
    *   The frontend sends a `POST` request to the backend's `/videos/upload` endpoint, including the JWT in the `Authorization` header.
    *   The backend's **File Upload Interceptor** validates the file type using `ffprobe` for robust media validation.
    *   The backend's `CreditGuard` intercepts the request, verifies the user has at least 1 credit, and **atomically deducts 1 credit** from their account.
    *   **Rate limiting** is applied to prevent abuse (5 uploads per minute).
    *   The backend immediately adds a job to the `transcription-queue` and responds with the video ID. The UI shows a "Processing..." state for the new video.

4.  **Realtime Processing Updates:**
    *   The frontend **does not poll** for status. It opens a **Supabase Realtime** connection, subscribing to changes on the user's `videos` table.
    *   As the backend worker processes the video, it updates the video's status in the database (`processing` -> `ready`).
    *   These database changes are pushed instantly to the frontend, which reactively updates the UI (e.g., the "Processing..." spinner is replaced by a thumbnail and an "Edit" button).

5.  **The Editor Experience:**
    *   The user clicks "Edit" and is taken to the `/dashboard/edit=<video-id>` page.
    *   The UI features a Cloudinary video player on one side and the editable transcript on the other. The transcript is synchronized with the video playback, highlighting words as they are spoken.
    *   The user can correct words, adjust timing, and re-assign speakers. Changes are saved automatically via `PUT` requests to `/transcripts/:id`.
    *   The user can switch between `original` and `edited` transcript types using the `PATCH /videos/:id/active-transcript-type` endpoint.

6.  **The "Burn-In" Process:**
    *   Once satisfied, the user clicks "Burn In".
    *   The frontend sends a `POST` request to `/videos/:id/burn-in`. This endpoint has a higher credit cost (5 credits), which is handled by the `CreditGuard`.
    *   **Rate limiting** is applied to prevent system abuse.
    *   The backend adds a job to the `burn-in-queue` and the UI shows a "Burning in subtitles..." status, again updated in real-time.

7.  **Error Handling & Recovery:**
    *   If any processing fails, the video status changes to `failed` and an error message is stored.
    *   Users can retry failed processes using the `POST /videos/:id/retry` endpoint at no additional cost.
    *   The system automatically determines whether to retry transcription or burn-in based on the failure point.

8.  **Download the Final Product:**
    *   When the burn-in worker is finished, the video status changes to `complete`.
    *   The UI updates to show a "Download" button, linking directly to the final video's Cloudinary URL. The user can re-edit and re-burn at any time, which will overwrite the previous final video.

### 4. Backend API Endpoints

All routes are prefixed with `/videos`, `/credits`, or `/transcripts` and protected by the `JwtAuthGuard` unless otherwise specified. Rate limiting is applied to upload and burn-in endpoints.

| Method | Endpoint | Description | Guards & Features |
| :--- | :--- | :--- | :--- |
| **Credits** | | | |
| `GET` | `/credits/me` | Gets the current user's credit balance. | `JwtAuthGuard` |
| `GET` | `/credits/packs` | Lists all purchasable credit packages. | `JwtAuthGuard` |
| **Videos** | | | |
| `POST` | `/videos/upload` | Uploads a new video. **Costs 1 credit.** | `JwtAuthGuard`, `CreditGuard(1)`, `VideoUploadInterceptor`, Rate Limited (5/min) |
| `GET` | `/videos` | Gets a list of the user's videos. | `JwtAuthGuard` |
| `GET` | `/videos/:id` | Gets full data for a single video project. | `JwtAuthGuard` |
| `POST` | `/videos/:id/burn-in` | Starts the subtitle burn-in process. **Costs 5 credits.** | `JwtAuthGuard`, `CreditGuard(5)`, Rate Limited (5/min) |
| `POST` | `/videos/:id/retry` | Retries a failed video processing job. **No cost.** | `JwtAuthGuard` |
| `PATCH` | `/videos/:id/active-transcript-type` | Switches between original/edited transcript. | `JwtAuthGuard` |
| `DELETE` | `/videos/:id` | Deletes a video project and all associated data. | `JwtAuthGuard` |
| **Transcripts** | | | |
| `PUT` | `/transcripts/:id` | Updates the content of an edited transcript. | `JwtAuthGuard` |

### 5. Frontend Capabilities & Backend Interaction

*   **Authentication:** The frontend owns 100% of the auth flow (sign-up, login, password reset) using `supabase-js`. It is responsible for acquiring and refreshing the JWT.
*   **API Communication:** Every request to the backend API includes the JWT. The frontend uses a library like Axios or `fetch` to interact with the REST endpoints defined above.
*   **State Management:** Uses a state management solution (like Zustand, Redux, or React Context) to manage application state, including the user's session, video list, and credit balance.
*   **Realtime UI:** Leverages Supabase Realtime to listen for database changes and provide a live, responsive experience without needing manual refreshes or polling mechanisms.
*   **Media Display:** Renders video and thumbnails directly from the Cloudinary URLs provided by the backend.
*   **User Feedback:** Implements a notification system (e.g., `react-hot-toast`) to give users clear feedback on actions (e.g., "Upload started!", "Not enough credits.", "Final video is ready!").

### 6. Enhanced Backend Architecture

**CaptionCraft** now features a robust, enterprise-grade backend architecture with the following improvements:

#### **Modular Design**
- **Repository Pattern:** Separation of database logic from business logic for better testability and maintainability
- **Service Layer:** Clean business logic isolated from controllers
- **DTO Layer:** Comprehensive Data Transfer Objects with validation
- **Entity Management:** Type-safe entity interfaces for all database models

#### **Configuration Management**
- **Environment-specific configs:** Separate configuration files for app, database, redis, and upload settings
- **Validation:** Runtime validation of environment variables using `class-validator`
- **Type Safety:** Strongly typed configuration objects throughout the application

#### **Security & Validation**
- **File Upload Interceptor:** Advanced file validation using `ffprobe` for media type verification
- **Rate Limiting:** Configurable rate limits on sensitive endpoints
- **Type-safe Decorators:** Strongly typed `@GetUser()` decorator with `AuthenticatedUser` interface
- **Input Validation:** Comprehensive DTO validation on all endpoints

#### **Error Handling & Monitoring**
- **Global Exception Filters:** Centralized error handling with consistent response formats
- **Retry Logic:** Intelligent retry system that can resume from failure points
- **Job Error Tracking:** Detailed error messages stored for debugging failed operations

#### **Code Organization**
```
src/
├── core/                    # Core application infrastructure
│   ├── auth/               # Authentication (guards, strategies, decorators)
│   ├── config/             # Configuration management
│   ├── database/           # Database connection and utilities
│   └── filters/            # Global exception filters
├── modules/                # Feature modules
│   ├── credits/            # Credit management
│   ├── videos/             # Video processing and management
│   ├── transcripts/        # Transcript editing
│   └── queues/             # Background job processing
└── shared/                 # Shared utilities and types
    ├── helpers/            # Utility functions
    ├── services/           # Shared services
    └── types/              # Common type definitions
```
