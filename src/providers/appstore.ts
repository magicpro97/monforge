import type { ReviewProvider, Review, RatingSummary } from '../types/index.js';

export class AppStoreProvider implements ReviewProvider {
  name = 'App Store';
  private appId = '';
  private issuerId = '';
  private keyId = '';
  private privateKey = '';

  configure(config: Record<string, string>): void {
    this.appId = config.appId || '';
    this.issuerId = config.issuerId || '';
    this.keyId = config.keyId || '';
    this.privateKey = config.privateKey || '';
  }

  isConfigured(): boolean {
    return !!this.appId;
  }

  async getReviews(limit: number): Promise<Review[]> {
    if (!this.isConfigured()) return [];

    // App Store Connect API v1
    const url = `https://api.appstoreconnect.apple.com/v1/apps/${this.appId}/customerReviews?limit=${Math.min(limit, 200)}&sort=-createdDate`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.issuerId && this.keyId && this.privateKey) {
      headers.Authorization = `Bearer ${await this.generateJWT()}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`App Store Connect API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{
        id: string;
        attributes: {
          reviewerNickname: string;
          rating: number;
          title: string;
          body: string;
          createdDate: string;
          territory: string;
        };
      }>;
    };

    return (data.data || []).map((review) => ({
      id: review.id,
      author: review.attributes.reviewerNickname || 'Anonymous',
      rating: review.attributes.rating,
      title: review.attributes.title || '',
      body: review.attributes.body || '',
      version: '',
      date: review.attributes.createdDate,
      platform: 'ios' as const,
      language: review.attributes.territory || 'en',
    }));
  }

  async getRatingSummary(): Promise<RatingSummary> {
    if (!this.isConfigured()) {
      throw new Error('App Store is not configured');
    }

    // Use the RSS feed for public rating data
    const url = `https://itunes.apple.com/lookup?id=${this.appId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        averageUserRating: number;
        userRatingCount: number;
        userRatingCountForCurrentVersion: number;
      }>;
    };

    const app = data.results?.[0];
    if (!app) throw new Error('App not found');

    return {
      average: app.averageUserRating || 0,
      total: app.userRatingCount || 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      platform: 'ios',
    };
  }

  private async generateJWT(): Promise<string> {
    // App Store Connect JWT generation would go here
    // For now, return the key as-is if it looks like a JWT
    return this.privateKey;
  }
}
