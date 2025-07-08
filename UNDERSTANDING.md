# Understanding the CaptionCraft API

This document provides a comprehensive overview of the CaptionCraft backend API, its architecture, routes, and interaction with the frontend and other services.

## 1. Core Architecture & Technology

The backend is a **NestJS** application written in **TypeScript**. It follows a modular structure, separating concerns into distinct modules for better organization and scalability.

- **Monorepo:** The project is managed within a **Turborepo** monorepo.
- **Framework:** **NestJS**, a progressive Node.js framework for building efficient and scalable server-side applications.
- **Database:** **Supabase (PostgreSQL)** is used for the database. The backend interacts with it directly for data manipulation.
- **Authentication:** **Supabase GoTrue** is used for authentication. The backend validates JWTs provided by the Supabase client.
- **Job Queue:** **BullMQ** with **Upstash Redis** is used for handling long-running, resource-intensive tasks like video transcription and subtitle burn-in. This ensures the API remains responsive.
- **Media Processing:**
    - **Cloudinary:** Used for storing and delivering video files and thumbnails.
    - **FFmpeg:** A powerful multimedia framework used for extracting audio from videos and burning subtitles into them.
- **AI Services:** **OpenAI Whisper API** is used for automatic speech recognition (transcription).

## 2. Database Schema

The database schema is defined in `schema.sql` and consists of the following tables:

- **`profiles`**: Stores public user data, including their `credits` balance. A new profile is automatically created for each new user via a database trigger.
- **`videos`**: The central table for video projects. It stores metadata about each video, including its status, Cloudinary IDs, and which transcript to use (`original` or `edited`).
- **`transcripts`**: Stores the JSON data for both the original (AI-generated) and the user-edited transcripts.
- **`credit_packs`**: Defines the purchasable credit packages.
- **`credit_transactions`**: Logs every change in a user's credit balance for auditing purposes.

### Supabase Realtime

The `videos` table is configured for **Supabase Realtime**. This means that any changes to a video record (e.g., its `status` field) are automatically pushed to any subscribed frontend client. This is the cornerstone of the application's reactive UI, eliminating the need for the frontend to poll for updates.

## 3. API Endpoints

All API endpoints are prefixed with `/v1` and are protected by a global `JwtAuthGuard`, which validates the Supabase JWT sent in the `Authorization` header.

### 3.1. Credits Module (`/credits`)

- **`GET /me`**
    - **Description:** Fetches the current user's credit balance.
    - **Returns:** `{ "credits": number }`
    - **Guards:** `JwtAuthGuard`

- **`GET /packs`**
    - **Description:** Lists all available credit packages that can be purchased.
    - **Returns:** An array of `credit_packs` objects.
    - **Guards:** `JwtAuthGuard`

### 3.2. Videos Module (`/videos`)

- **`POST /upload`**
    - **Description:** The entry point for creating a new video project. The user uploads a video file, which is temporarily stored on the server. A credit is deducted, and a transcription job is dispatched to the BullMQ queue.
    - **Request:** `multipart/form-data` with a `video` file.
    - **Returns:** `{ "message": "Video upload initiated", "videoId": "uuid" }`
    - **Guards & Interceptors:**
        - `JwtAuthGuard`: Ensures the user is authenticated.
        - `CreditGuard(1)`: Ensures the user has at least 1 credit and deducts it atomically using the `deduct_credits` PostgreSQL function.
        - `Throttler`: Rate limits uploads to 5 per minute.
        - `FileInterceptor`: Handles the file upload using `multer`, saving it to a temporary `/tmp` directory with a 250MB file size limit. It also performs robust validation using `ffprobe` to ensure the uploaded file is a valid media file.

- **`GET /`**
    - **Description:** Retrieves a list of all video projects for the authenticated user.
    - **Returns:** An array of `Video` objects.
    - **Guards:** `JwtAuthGuard`

- **`GET /:id`**
    - **Description:** Fetches detailed information for a single video project, including its associated transcript data.
    - **Returns:** A single `Video` object with transcript details.
    - **Guards:** `JwtAuthGuard`

- **`POST /:id/burn-in`**
    - **Description:** Initiates the subtitle burn-in process for a video.
    - **Returns:** `{ "message": "Burn-in process initiated.", "videoId": "uuid" }`
    - **Guards:**
        - `JwtAuthGuard`
        - `CreditGuard(5)`: Deducts 5 credits for this action.
        - `Throttler`: Rate limits burn-in requests to 5 per minute.

- **`PATCH /:id/active-transcript-type`**
    - **Description:** Toggles whether the burn-in process should use the `original` AI-generated transcript or the `edited` user-modified transcript.
    - **Request Body:** `{ "type": "original" | "edited" }`
    - **Returns:** `{ "message": "Active transcript type updated to...", "video": Video }`
    - **Guards:** `JwtAuthGuard`

- **`DELETE /:id`**
    - **Description:** Deletes a video project and all its associated data (transcripts, Cloudinary files, etc.).
    - **Returns:** `200 OK`
    - **Guards:** `JwtAuthGuard`

### 3.3. Transcripts Module (`/transcripts`)

- **`PUT /:id`**
    - **Description:** Updates the `edited_transcript_data` for a specific transcript. This is used by the frontend editor's auto-save functionality.
    - **Request Body:** `UpdateTranscriptDto` containing the new transcript JSON.
    - **Returns:** The updated transcript object.
    - **Guards:** `JwtAuthGuard`

## 4. Background Processing (Job Queues)

The API offloads heavy tasks to background workers using **BullMQ**.

### 4.1. `transcription-queue`

- **Processor:** `TranscriptionProcessor`
- **Triggered by:** `POST /videos/upload`
- **Workflow:**
    1.  Uploads the original video from the `/tmp` directory to **Cloudinary**.
    2.  Generates a thumbnail URL from the Cloudinary video.
    3.  Updates the video's status to `processing` in the database.
    4.  Uses **FFmpeg** to extract the audio into an `.mp3` file.
    5.  Sends the audio file to the **OpenAI Whisper API** for transcription.
    6.  Saves the resulting transcript data into the `transcripts` table.
    7.  Updates the video's status to `ready`. This change is pushed to the frontend via **Supabase Realtime**.
    8.  Cleans up the temporary video and audio files from the local disk.

### 4.2. `burn-in-queue`

- **Processor:** `BurnInProcessor`
- **Triggered by:** `POST /videos/:id/burn-in`
- **Workflow:**
    1.  Fetches the video record and its associated transcript.
    2.  Checks the `active_transcript_type` on the video to decide whether to use the `transcript_data` or `edited_transcript_data`.
    3.  Generates a subtitle file (e.g., `.srt`) from the chosen transcript data.
    4.  Uses **FFmpeg** to burn the subtitles directly onto the video stream, creating a new video file.
    5.  Uploads the final, subtitled video to **Cloudinary**.
    6.  Updates the video record with the `final_video_cloudinary_id` and sets the status to `complete`. This change is pushed to the frontend via **Supabase Realtime**.
    7.  Cleans up the temporary subtitle and video files.

### 4.3. `cleanup-queue`

- **Processor:** `CleanupProcessor`
- **Triggered by:** A recurring job scheduled every 5 minutes.
- **Workflow:**
    - Scans the `/tmp` directory and deletes any files that are older than a certain threshold. This is a crucial housekeeping task to prevent the server's disk from filling up with orphaned temporary files from failed or interrupted jobs.

## 5. Frontend Interaction Strategy

The frontend is expected to interact with the backend in the following manner:

1.  **Authentication:** The frontend handles all user authentication (login, signup) directly with `supabase-js`. It is responsible for obtaining and securely storing the JWT.
2.  **API Requests:** For every request to the NestJS backend, the frontend must include the `Authorization: Bearer <SUPABASE_JWT>` header.
3.  **Uploads:** The frontend uploads video files to the `/v1/videos/upload` endpoint. It should be prepared to handle a `402 Payment Required` error if the user has insufficient credits.
4.  **Realtime Updates:** The frontend should open a **Supabase Realtime** subscription to the user's `videos` table. It should listen for `UPDATE` events and reactively update the UI to reflect changes in video `status` (e.g., from `processing` to `ready` to `complete`). This creates a seamless, live user experience without any need for manual page refreshes or HTTP polling.
5.  **Media Display:** Video thumbnails and final videos are served directly from **Cloudinary**. The backend provides the necessary Cloudinary URLs in its API responses.
6.  **Editing:** The transcript editor should fetch the video and transcript data from `/v1/videos/:id`. As the user makes changes, it should automatically save them by sending `PUT` requests to `/v1/transcripts/:id`.

## 6. Business Logic & Services

- **`CreditsService`**: Manages user credit balances. It uses a PostgreSQL function `deduct_credits` to ensure atomic credit deductions, preventing race conditions where a user might spend more credits than they have.
- **`VideosService`**: Orchestrates the entire video lifecycle. It creates video records in the database, dispatches jobs to the appropriate BullMQ queues (`transcription-queue`, `burn-in-queue`), and handles the cleanup of temporary files from the server.
- **`TranscriptsService`**: A straightforward service responsible for updating the `edited_transcript_data` field in the `transcripts` table when a user saves their changes in the editor.
- **`CreditGuard`**: A custom NestJS Guard that protects routes requiring credits. It intercepts the request, checks if the `USE_CREDITS` decorator is present, and calls the `CreditsService` to deduct the specified amount *before* the route's main logic is executed. This is a clean and declarative way to handle resource costs.

### Shared Services

- **`CloudinaryService`**: A wrapper around the Cloudinary Node.js SDK. It abstracts away the details of uploading videos, generating thumbnails, and constructing the correct URLs for accessing media.
- **`FfmpegService`**: A service that encapsulates the use of the `fluent-ffmpeg` library. It provides methods to perform complex multimedia operations like extracting audio from a video, generating standard `.srt` subtitle files from the transcript data, and burning those subtitles into a new video file.
- **`OpenaiService`**: A simple service that interacts with the OpenAI API, specifically for sending audio files to the Whisper model for transcription.