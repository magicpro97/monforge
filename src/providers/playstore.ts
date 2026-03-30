import type { ReviewProvider, Review, RatingSummary } from '../types/index.js';

export class PlayStoreProvider implements ReviewProvider {
  name = 'Google Play';
  private appId = '';
  private keyFilePath = '';
  private authToken = '';

  configure(config: Record<string, string>): void {
    this.appId = config.appId || '';
    this.keyFilePath = config.keyFilePath || '';
    this.authToken = config.authToken || '';
  }

  isConfigured(): boolean {
    return !!(this.appId && (this.authToken || this.keyFilePath));
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getReviews(limit: number): Promise<Review[]> {
    if (!this.isConfigured()) return [];

    // Google Play Developer API v3
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${this.appId}/reviews?maxResults=${Math.min(limit, 100)}`;

    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Google Play API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      reviews?: Array<{
        reviewId: string;
        authorName: string;
        comments: Array<{
          userComment: {
            text: string;
            starRating: number;
            appVersionName: string;
            lastModified: { seconds: string };
            reviewerLanguage: string;
          };
        }>;
      }>;
    };

    return (data.reviews || []).map((review) => {
      const comment = review.comments?.[0]?.userComment;
      return {
        id: review.reviewId,
        author: review.authorName || 'Anonymous',
        rating: comment?.starRating || 0,
        title: '',
        body: comment?.text || '',
        version: comment?.appVersionName || '',
        date: comment?.lastModified
          ? new Date(parseInt(comment.lastModified.seconds, 10) * 1000).toISOString()
          : '',
        platform: 'android' as const,
        language: comment?.reviewerLanguage || 'en',
      };
    });
  }

  async getRatingSummary(): Promise<RatingSummary> {
    if (!this.isConfigured()) {
      throw new Error('Google Play is not configured');
    }

    // Fetch reviews to compute ratings (API has no aggregated endpoint)
    const reviews = await this.getReviews(50);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of reviews) {
      const star = Math.round(review.rating);
      if (star >= 1 && star <= 5) {
        distribution[star]++;
        totalRating += review.rating;
      }
    }

    const average = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      average: Math.round(average * 10) / 10,
      total: reviews.length,
      distribution: distribution as RatingSummary['distribution'],
      platform: 'android',
    };
  }
}
