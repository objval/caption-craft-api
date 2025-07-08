# CaptionCraft API

A robust NestJS API for video transcription and caption generation with automatic subtitle creation.

## Features

- **Video Upload & Processing**: Upload videos with validation and format support
- **Automatic Transcription**: AI-powered transcription using OpenAI Whisper
- **Subtitle Generation**: Generate captions with timestamps and formatting
- **User Management**: JWT-based authentication with Supabase integration
- **Queue System**: Background processing with BullMQ and Redis
- **Credits System**: Token-based usage tracking
- **File Management**: Cloudinary integration for media storage
- **Type Safety**: Full TypeScript support with strict typing

## Architecture

The API follows a modular NestJS architecture with:

- **Core Modules**: Authentication, configuration, database, filters
- **Business Modules**: Videos, transcripts, credits, queues
- **Repository Pattern**: Data access layer abstraction
- **DTOs & Validation**: Request/response validation with class-validator
- **Interceptors**: File upload handling and validation
- **Guards**: Authentication and authorization
- **Workers**: Background job processing

## Tech Stack

- **Framework**: NestJS 11
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with Passport
- **Queue**: BullMQ + Redis
- **File Storage**: Cloudinary
- **AI**: OpenAI Whisper API
- **Video Processing**: FFmpeg/FFprobe
- **Validation**: class-validator + class-transformer

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Redis server
- Supabase account
- Cloudinary account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd caption-craft-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
JWT_SECRET=your_jwt_secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# App
PORT=3000
NODE_ENV=development
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run prod

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Lint code
npm run lint
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get user profile

### Videos
- `GET /videos` - List user videos
- `POST /videos/upload` - Upload video
- `GET /videos/:id` - Get video details
- `DELETE /videos/:id` - Delete video
- `POST /videos/:id/transcribe` - Start transcription

### Transcripts
- `GET /transcripts/:videoId` - Get video transcript
- `POST /transcripts/:videoId/export` - Export transcript

### Credits
- `GET /credits` - Get user credits
- `POST /credits/purchase` - Purchase credits

## Database Schema

The API uses Supabase with the following main tables:

- `users` - User accounts and profiles
- `videos` - Video metadata and status
- `transcriptions` - Generated transcripts
- `credits` - User credit balances and transactions

## Background Jobs

The API uses BullMQ for background processing:

- **Transcription Worker**: Processes video transcription
- **Cleanup Worker**: Removes temporary files
- **Burn-in Worker**: Generates subtitled videos

## Docker Support

```bash
# Build image
docker build -t caption-craft-api .

# Run container
docker run -p 3000:3000 caption-craft-api
```

## PM2 Deployment

```bash
# Start with PM2
npm run start:pm2

# Monitor processes
pm2 monit

# View logs
pm2 logs
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
