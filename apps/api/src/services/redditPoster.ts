/**
 * Reddit Automated Posting Service
 * Uses Stagehand browser automation to post deals to relevant subreddits
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

interface RedditPost {
  subreddit: string;
  title: string;
  body: string;
  productUrl: string;
}

interface PostResult {
  success: boolean;
  subreddit: string;
  postUrl?: string;
  error?: string;
}

export class RedditPosterService {
  private stagehand: Stagehand | null = null;
  private isInitialized = false;

  /**
   * Initialize Stagehand browser
   */
  private async initialize() {
    if (this.isInitialized) return;

    console.log('🤖 Initializing Reddit poster (Stagehand)...');

    this.stagehand = new Stagehand({
      env: 'LOCAL',
      headless: true,
      enableCaching: true,
      logger: (message: string) => console.log(`   [Stagehand] ${message}`),
    });

    await this.stagehand.init();
    this.isInitialized = true;

    console.log('✅ Reddit poster initialized');
  }

  /**
   * Login to Reddit
   */
  private async login(username: string, password: string): Promise<boolean> {
    if (!this.stagehand) throw new Error('Stagehand not initialized');

    try {
      console.log(`🔐 Logging into Reddit as ${username}...`);

      await this.stagehand.page.goto('https://www.reddit.com/login');

      // Fill login form
      await this.stagehand.act({
        action: `fill in the username field with "${username}"`,
      });

      await this.stagehand.act({
        action: `fill in the password field with "${password}"`,
      });

      await this.stagehand.act({
        action: 'click the log in button',
      });

      // Wait for redirect
      await this.stagehand.page.waitForURL('https://www.reddit.com/', { timeout: 10000 });

      console.log('✅ Logged into Reddit');
      return true;
    } catch (error: any) {
      console.error(`❌ Reddit login failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Post to a subreddit
   */
  async post(post: RedditPost, redditUsername?: string, redditPassword?: string): Promise<PostResult> {
    try {
      await this.initialize();

      // Login if credentials provided
      if (redditUsername && redditPassword) {
        const loginSuccess = await this.login(redditUsername, redditPassword);
        if (!loginSuccess) {
          return {
            success: false,
            subreddit: post.subreddit,
            error: 'Login failed',
          };
        }
      }

      console.log(`📝 Posting to r/${post.subreddit}...`);

      // Navigate to subreddit
      await this.stagehand!.page.goto(`https://www.reddit.com/r/${post.subreddit}/submit`);

      // Wait for submit form
      await this.stagehand!.page.waitForTimeout(2000);

      // Fill post title
      await this.stagehand!.act({
        action: `fill in the title field with "${post.title}"`,
      });

      // Switch to text post tab if needed
      await this.stagehand!.act({
        action: 'click the text post tab',
      });

      // Fill post body
      await this.stagehand!.act({
        action: `fill in the text field with "${post.body}"`,
      });

      // Submit post
      await this.stagehand!.act({
        action: 'click the post button',
      });

      // Wait for redirect to post page
      await this.stagehand!.page.waitForTimeout(3000);

      const postUrl = this.stagehand!.page.url();

      console.log(`✅ Posted to r/${post.subreddit}: ${postUrl}`);

      return {
        success: true,
        subreddit: post.subreddit,
        postUrl,
      };
    } catch (error: any) {
      console.error(`❌ Failed to post to r/${post.subreddit}: ${error.message}`);
      return {
        success: false,
        subreddit: post.subreddit,
        error: error.message,
      };
    }
  }

  /**
   * Post product deals to multiple subreddits
   */
  async postProductDeals(
    products: Array<{
      title: string;
      price: number;
      link: string;
      profit?: number;
    }>,
    redditUsername?: string,
    redditPassword?: string
  ): Promise<PostResult[]> {
    const results: PostResult[] = [];

    // Generate posts for top products
    const posts: RedditPost[] = [];

    // Top deal for r/buildapcsales (mega post)
    if (products.length > 0) {
      const topProducts = products.slice(0, 5);
      const deals = topProducts
        .map((p) => `• ${p.title} - $${p.price.toFixed(2)}`)
        .join('\n');

      posts.push({
        subreddit: 'buildapcsales',
        title: '[Arbi Market] Tech Deals - Multiple Products (Limited Stock)',
        body: `Found some solid tech deals today:\n\n${deals}\n\nAll available at: https://arbi.market\n\nFree shipping. Secure Stripe checkout. Products ship from authorized retailers.\n\nStock changes based on supplier availability.`,
        productUrl: 'https://arbi.market',
      });
    }

    // Individual product posts
    for (const product of products.slice(0, 3)) {
      // Determine best subreddit
      let subreddit = 'deals';
      if (product.title.toLowerCase().includes('switch')) subreddit = 'NintendoSwitch';
      else if (product.title.toLowerCase().includes('gopro')) subreddit = 'gopro';
      else if (product.title.toLowerCase().includes('macbook')) subreddit = 'apple';
      else if (product.title.toLowerCase().includes('airpods')) subreddit = 'headphones';

      const discount = product.profit ? `(Save ~$${product.profit.toFixed(0)})` : '';

      posts.push({
        subreddit,
        title: `${product.title} - $${product.price.toFixed(2)} ${discount}`,
        body: `Found the ${product.title} for $${product.price.toFixed(2)} on Arbi Market.\n\n${product.link}\n\nFree shipping. Secure checkout via Stripe. Ships from authorized retailers.`,
        productUrl: product.link,
      });
    }

    // Post to Reddit (with 5 second delay between posts)
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      const result = await this.post(post, redditUsername, redditPassword);
      results.push(result);

      // Wait 5 seconds between posts (rate limiting)
      if (i < posts.length - 1) {
        console.log('⏳ Waiting 5 seconds before next post...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  async close() {
    if (this.stagehand) {
      await this.stagehand.close();
      this.isInitialized = false;
    }
  }
}

// Export singleton
export const redditPoster = new RedditPosterService();
