
# Ideal Frontend for CaptionCraft

This document outlines the ideal architecture, user flows, and component structure for the CaptionCraft web application. The goal is to fully leverage the powerful, reactive backend API and Supabase features to create a seamless and intuitive user experience.

## 1. Core Philosophy: A Reactive & Optimistic UI

The frontend should be built with a **reactive-first mindset**. Thanks to the backend's use of Supabase Realtime on the `videos` table, we can create a user interface that updates instantly without requiring manual refreshes or constant polling. The UI should also be **optimistic** where appropriate, assuming that operations will succeed and immediately reflecting changes in the UI while the backend processes the request in the background.

## 2. Key User Flows & API Integration

### 2.1. Authentication

- **Technology:** `supabase-js` library.
- **Flow:**
    1.  The frontend is entirely responsible for user sign-up, login, and password reset flows using the `supabase-js` UI components or by building a custom form that calls `supabase.auth.signInWithPassword()`, etc.
    2.  Upon successful login, `supabase-js` automatically handles storing the JWT in local storage.
    3.  A global state listener (e.g., `supabase.auth.onAuthStateChange`) should be used to manage the user's session state throughout the application.

### 2.2. The Dashboard & Video Gallery

- **API Endpoint:** `GET /v1/videos`
- **Realtime Subscription:** `supabase.channel('videos').on('postgres_changes', ...)`
- **Flow:**
    1.  On dashboard mount, fetch the initial list of videos using the `GET /v1/videos` endpoint.
    2.  Simultaneously, establish a Supabase Realtime subscription to the `videos` table for the current user.
    3.  When a new video is uploaded, the UI should optimistically add a new video card in a "Processing..." state.
    4.  The Realtime subscription will automatically push updates to the video's `status` (`processing` -> `ready` -> `burning_in` -> `complete`). The UI should react to these changes, updating the video card's appearance and available actions (e.g., showing an "Edit" button when the status becomes `ready`).

### 2.3. Video Upload

- **API Endpoint:** `POST /v1/videos/upload`
- **Flow:**
    1.  A prominent "Upload Video" button opens a modal with a file dropzone.
    2.  Upon file selection, the frontend sends a `multipart/form-data` request to the backend.
    3.  The UI should immediately show a loading indicator and provide feedback to the user (e.g., "Uploading...").
    4.  **Crucially**, the frontend should handle a `402 Payment Required` status code, which indicates the user has insufficient credits. This should trigger a user-friendly notification.
    5.  Upon a successful `201 Created` response, the upload modal can be closed, and the new video will appear in the gallery (as described above).

### 2.4. The Transcript Editor

- **API Endpoints:**
    - `GET /v1/videos/:id` to fetch initial data.
    - `PUT /v1/transcripts/:id` for auto-saving changes.
    - `POST /v1/videos/:id/burn-in` to start the final render.
    - `PATCH /v1/videos/:id/active-transcript-type` to select the transcript version.
- **Flow:**
    1.  The editor page is the heart of the application. It fetches all necessary data for a video, including the `transcript_data` and `edited_transcript_data`.
    2.  The UI should display a video player (using the `original_video_cloudinary_id`) and the transcript side-by-side.
    3.  The transcript should be rendered as a series of editable text segments or even individual words.
    4.  **Auto-saving:** As the user types or modifies the transcript, the frontend should debounce the input and send `PUT` requests to `/v1/transcripts/:id` with the updated transcript JSON. This provides a seamless, Google Docs-like editing experience.
    5.  **Transcript Versioning:** A toggle or dropdown should allow the user to switch between the `original` and `edited` transcripts. This will call the `PATCH /v1/videos/:id/active-transcript-type` endpoint.
    6.  **Burn-In:** The "Burn In" button triggers the `POST /v1/videos/:id/burn-in` endpoint. The UI should then show a "Burning in..." status, which will be updated in real-time via the Supabase subscription.
    7.  When the video status becomes `complete`, a "Download" button should appear, linking directly to the `final_video_cloudinary_id` URL.

## 3. Component Breakdown (React Example)

- **`AuthProvider`**: A context provider that wraps the application and manages the user's session state.
- **`DashboardPage`**: The main layout, which includes the video gallery and upload functionality.
- **`VideoGallery`**: Fetches and displays the list of videos. Listens for realtime updates.
- **`VideoCard`**: A single card in the gallery, representing one video. Its appearance and actions change based on the video's `status`.
- **`UploadModal`**: A modal dialog for uploading new videos.
- **`EditorPage`**: The main page for editing a video and its transcript.
- **`CloudinaryPlayer`**: A reusable component for displaying Cloudinary videos.
- **`TranscriptEditor`**: The core editing interface. It manages the state of the transcript, handles user input, and triggers auto-saves.
- **`Word` / `Segment`**: Individual, editable components within the `TranscriptEditor`.
- **`CreditBalance`**: A small component, likely in the main navigation, that displays the user's current credit balance, fetched from `GET /v1/credits/me`.
- **`NotificationSystem`**: A global system (e.g., using `react-hot-toast`) to display success messages, errors, and other feedback to the user.

## 4. State Management

- **Zustand** or **React Context** with `useReducer` would be excellent choices for managing global state, such as the user's session and credit balance.
- For complex local state, like the transcript data in the editor, `useState` or `useReducer` within the component itself is likely sufficient.

## 5. Future-Proofing & Advanced Features

The current backend is well-structured to support future frontend features with minimal changes:

- **Payment Flow:** The `GET /v1/credits/packs` endpoint is already in place. A new page could be built to display these packs and integrate with a payment provider like Stripe.
- **Team Collaboration:** The database schema could be extended with an `organizations` table. The frontend could then be updated to allow users to switch between personal and team workspaces.
- **Advanced Editor Customization:** The `burn-in` process could be extended to accept more parameters (e.g., font color, size, position). The frontend could add a settings panel to the editor to control these options, which would then be passed to the `POST /v1/videos/:id/burn-in` endpoint.
