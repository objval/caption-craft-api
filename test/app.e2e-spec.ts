import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(60000); // Global timeout for all tests in this suite

describe('API End-to-End Tests', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let testUserToken: string;
  let testUserId: string;
  let adminSupabaseClient: any;
  let uploadedVideoId: string;
  let uploadedTranscriptId: string;

  let SUPABASE_URL: string;
  let SUPABASE_ANON_KEY: string;

  const TEST_MP4_PATH = path.join(__dirname, '..\/..\/..\/test.mp4');
  const TEST_TXT_PATH = path.join(__dirname, '..\/..\/..\/test.txt');
  const LARGE_TEST_BIN_PATH = path.join(
    __dirname,
    '..\/..\/..\/large_test.bin',
  );

  // Helper function to get a fresh token for a user
  const getAuthToken = async (
    email: string,
    password: string,
    supabaseUrl: string,
    supabaseAnonKey: string,
  ) => {
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      throw new Error(`Failed to sign in user ${email}: ${error?.message}`);
    }
    return data.session.access_token;
  };

  beforeAll(async () => {
    // Create dummy test files (excluding test.mp4, which should be provided manually)
    // if (!fs.existsSync(TEST_MP4_PATH)) {
    //   fs.writeFileSync(TEST_MP4_PATH, Buffer.alloc(1024 * 1024, 'video_data')); // 1MB dummy video
    // }
    fs.writeFileSync(TEST_TXT_PATH, 'This is a test file.');
    fs.writeFileSync(LARGE_TEST_BIN_PATH, Buffer.alloc(300 * 1024 * 1024, 'a')); // 300MB dummy file

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    configService = app.get(ConfigService);

    SUPABASE_URL = configService.get<string>('SUPABASE_URL')!;
    SUPABASE_ANON_KEY = configService.get<string>('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    )!;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'Missing Supabase URL, Anon Key, or Service Role Key in environment variables for E2E tests.',
      );
    }

    adminSupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create a test user for the suite
    const uniqueId = Date.now();
    const testEmail = `testuser-${uniqueId}@example.com`;
    const testPassword = 'password123';

    const { data, error } = await adminSupabaseClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(
        `Failed to create test user via Admin API: ${error?.message}`,
      );
    }
    testUserId = data.user.id;

    // Sign in the created user to get a session token
    testUserToken = await getAuthToken(
      testEmail,
      testPassword,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );

    // Ensure the test user has credits (e.g., 100 credits)
    await adminSupabaseClient
      .from('profiles')
      .update({ credits: 100 })
      .eq('id', testUserId);
  });

  afterAll(async () => {
    // Clean up test user from Supabase
    if (testUserId) {
      await adminSupabaseClient.auth.admin.deleteUser(testUserId);
    }
    await app.close();

    // Clean up dummy test files
    if (fs.existsSync(TEST_MP4_PATH)) fs.unlinkSync(TEST_MP4_PATH);
    if (fs.existsSync(TEST_TXT_PATH)) fs.unlinkSync(TEST_TXT_PATH);
    if (fs.existsSync(LARGE_TEST_BIN_PATH)) fs.unlinkSync(LARGE_TEST_BIN_PATH);
  });

  // --- Test Cases ---

  it('GET /credits/me should return user credits', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('credits');
    expect(typeof response.body.credits).toBe('number');
    expect(response.body.credits).toBeGreaterThanOrEqual(0); // Should be 100 initially
  });

  it('POST /videos/upload should upload a video and deduct credits', async () => {
    const videoPath = TEST_MP4_PATH; // Use the created dummy file

    const response = await request(app.getHttpServer())
      .post('/v1/videos/upload')
      .set('Authorization', `Bearer ${testUserToken}`)
      .attach('video', videoPath)
      .expect(HttpStatus.CREATED); // 201 Created

    expect(response.body).toHaveProperty('message', 'Video upload initiated');
    expect(response.body).toHaveProperty('videoId');
    uploadedVideoId = response.body.videoId;

    // Verify credits deducted
    const creditsResponse = await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.OK);
    expect(creditsResponse.body.credits).toBe(99); // Assuming starting with 100
  });

  it('POST /videos/upload should fail with insufficient credits', async () => {
    // Create a new user with 0 credits
    const uniqueId = Date.now() + 1;
    const email = `nocredit-${uniqueId}@example.com`;
    const password = 'password123';
    const { data: newUser } = await adminSupabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    await adminSupabaseClient
      .from('profiles')
      .update({ credits: 0 })
      .eq('id', newUser.user.id);
    const noCreditToken = await getAuthToken(
      email,
      password,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );

    const videoPath = TEST_MP4_PATH;
    const response = await request(app.getHttpServer())
      .post('/v1/videos/upload')
      .set('Authorization', `Bearer ${noCreditToken}`)
      .attach('video', videoPath)
      .expect(HttpStatus.BAD_REQUEST); // 400 Bad Request due to insufficient credits

    expect(response.body).toHaveProperty(
      'message',
      'Insufficient credits. You need at least 1 credits to perform this action.',
    );

    // Clean up this user
    await adminSupabaseClient.auth.admin.deleteUser(newUser.user.id);
  });

  it('POST /videos/upload should fail for unsupported file type', async () => {
    const textFilePath = TEST_TXT_PATH; // Use the created dummy file

    const response = await request(app.getHttpServer())
      .post('/v1/videos/upload')
      .set('Authorization', `Bearer ${testUserToken}`)
      .attach('video', textFilePath)
      .expect(HttpStatus.BAD_REQUEST); // 400 Bad Request

    expect(response.body).toHaveProperty(
      'message',
      expect.stringContaining(
        'Invalid media file: test.txt. Please upload a valid video or audio file.',
      ),
    );
  });

  it('POST /videos/upload should fail for file size exceeding limit', async () => {
    const largeFilePath = LARGE_TEST_BIN_PATH; // Use the created dummy file

    const response = await request(app.getHttpServer())
      .post('/v1/videos/upload')
      .set('Authorization', `Bearer ${testUserToken}`)
      .attach('video', largeFilePath)
      .expect(HttpStatus.PAYLOAD_TOO_LARGE); // 413 Payload Too Large

    expect(response.body).toHaveProperty(
      'message',
      expect.stringContaining('File too large'),
    );
  });

  it('PUT /transcripts/:id should update a transcript', async () => {
    // Wait for the uploaded video to be ready and have a transcript
    let videoStatus = '';
    let attempts = 0;
    const maxAttempts = 60; // Max 60 attempts, 2s delay = 2 minutes
    while (
      videoStatus !== 'ready' ||
      (!uploadedTranscriptId && attempts < maxAttempts)
    ) {
      const { body } = await request(app.getHttpServer())
        .get(`/v1/videos/${uploadedVideoId}`)
        .set('Authorization', `Bearer ${testUserToken}`);
      videoStatus = body.status;
      uploadedTranscriptId = body.transcripts[0]?.id; // Get transcript ID
      if (videoStatus !== 'ready' || !uploadedTranscriptId) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
      attempts++;
    }
    expect(videoStatus).toBe('ready');
    expect(uploadedTranscriptId).toBeDefined();

    const newTranscriptContent = {
      text: 'This is an updated transcript for testing purposes.',
    };
    const response = await request(app.getHttpServer())
      .put(`/v1/transcripts/${uploadedTranscriptId}`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(newTranscriptContent)
      .expect(HttpStatus.OK);

    expect(response.body).toHaveProperty('edited_transcript_data');
    expect(response.body.edited_transcript_data).toEqual(newTranscriptContent);
  });

  it('POST /videos/:id/burn-in should initiate burn-in and deduct credits', async () => {
    const response = await request(app.getHttpServer())
      .post(`/v1/videos/${uploadedVideoId}/burn-in`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.CREATED); // 201 Created

    expect(response.body).toHaveProperty(
      'message',
      'Burn-in process initiated.',
    );
    expect(response.body).toHaveProperty('videoId', uploadedVideoId);

    // Verify credits deducted (assuming 99 - 5 = 94)
    const creditsResponse = await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.OK);
    expect(creditsResponse.body.credits).toBe(94); // Assuming starting with 100, 1 for upload, 5 for burn-in
  });

  it('POST /videos/:id/burn-in should fail with insufficient credits', async () => {
    // Create a new user with 0 credits
    const uniqueId = Date.now() + 2;
    const email = `nocredit-burnin-${uniqueId}@example.com`;
    const password = 'password123';
    const { data: newUser } = await adminSupabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    await adminSupabaseClient
      .from('profiles')
      .update({ credits: 0 })
      .eq('id', newUser.user.id);
    const noCreditToken = await getAuthToken(
      email,
      password,
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );

    const response = await request(app.getHttpServer())
      .post(`/v1/videos/${uploadedVideoId}/burn-in`)
      .set('Authorization', `Bearer ${noCreditToken}`)
      .expect(HttpStatus.BAD_REQUEST); // 400 Bad Request due to insufficient credits

    expect(response.body).toHaveProperty(
      'message',
      expect.stringContaining('Insufficient credits'),
    );

    // Clean up this user
    await adminSupabaseClient.auth.admin.deleteUser(newUser.user.id);
  });

  it('GET /videos should return a list of videos for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/videos')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.OK);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1); // At least the one we uploaded
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('title');
    expect(response.body[0]).toHaveProperty('status');
  });

  it('DELETE /videos/:id should delete a video', async () => {
    // Create a new video to delete
    const videoPath = TEST_MP4_PATH;
    const uploadResponse = await request(app.getHttpServer())
      .post('/v1/videos/upload')
      .set('Authorization', `Bearer ${testUserToken}`)
      .attach('video', videoPath)
      .expect(HttpStatus.CREATED);
    const videoToDeleteId = uploadResponse.body.videoId;

    const response = await request(app.getHttpServer())
      .delete(`/v1/videos/${videoToDeleteId}`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.OK);

    expect(response.body).toEqual({}); // Successful delete usually returns empty body or success message

    // Verify it's gone
    await request(app.getHttpServer())
      .get(`/v1/videos/${videoToDeleteId}`)
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(HttpStatus.INTERNAL_SERVER_ERROR); // Expect 500 because findOne throws if not found
  });

  // --- Authentication Failure Tests ---
  it('should return 401 Unauthorized if no token is provided', async () => {
    await request(app.getHttpServer())
      .get('/v1/credits/me')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should return 401 Unauthorized if an invalid token is provided', async () => {
    await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // --- Rate Limiting Tests ---
  it('POST /videos/upload should be rate-limited', async () => {
    jest.setTimeout(60000); // Increase timeout for this test
    const videoPath = TEST_MP4_PATH;

    // Make requests up to the limit to trigger rate limit
    for (let i = 0; i < 5; i++) {
      // Assuming 5 requests per minute for upload
      await request(app.getHttpServer())
        .post('/v1/videos/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('video', videoPath)
        .expect(HttpStatus.CREATED); // Expect 201 for successful uploads
    }

    // The next request should be rate-limited
    const response = await request(app.getHttpServer())
      .post('/v1/videos/upload')
      .set('Authorization', `Bearer ${testUserToken}`)
      .attach('video', videoPath)
      .expect(HttpStatus.TOO_MANY_REQUESTS); // 429 Too Many Requests

    expect(response.body).toHaveProperty(
      'message',
      'ThrottlerException: Too Many Requests',
    );
  });
});
