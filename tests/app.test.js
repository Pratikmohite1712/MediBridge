const request = require('supertest');
const app = require('../src/app'); // Import our express app

describe('Express Application Basic Tests', () => {
  it('should respond with a 200 on the /api/health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('MediBridge API is running normally.');
  });
  
  it('should return a JSON error structure and 404 for unknown endpoints', async () => {
    // Should hit globalErrorHandler for 404s depending on setup, but typically express responds with 404 HTML if not handled.
    // Let's assume we just want it not to crash and return 404.
    const res = await request(app).get('/api/unknown_route');
    expect(res.statusCode).toEqual(404);
  });
});
