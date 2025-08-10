const winston = require.main.require('winston');

/**
 * AI Moderation Service
 * Integrates with external AI APIs for content moderation
 */

// Circuit breaker simulation (simplified for demo)
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailTime = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}

// Provider-specific category mapping
const CATEGORY_MAPPING = {
  openai: {
    'harassment': { internal: 'harassment', weight: 1.0 },
    'hate': { internal: 'hate', weight: 1.0 },
    'violence': { internal: 'violence', weight: 1.0 },
    'sexual': { internal: 'sexual', weight: 1.0 },
    'self-harm': { internal: 'violence', weight: 0.8 }
  }
};

class ModerationService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
    this.apiKey = process.env.OPENAI_API_KEY;
    
    if (!this.apiKey) {
      winston.warn('[moderation] OpenAI API key not found. Moderation will use fallback scoring.');
    }
  }

  async analyzeContent(content, language = 'ja', options = {}) {
    const startTime = Date.now();
    const requestId = options.idempotencyKey || `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    winston.info(`[moderation] Analyzing content, requestId: ${requestId}`);
    
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.callOpenAIModerationAPI(content, requestId);
      });
      
      const latency = Date.now() - startTime;
      return this.normalizeResponse(result, requestId, latency, 'openai');
    } catch (error) {
      winston.error(`[moderation] Analysis failed for requestId ${requestId}:`, error);
      const latency = Date.now() - startTime;
      return this.getFallbackResult(content, requestId, latency, error);
    }
  }

  async callOpenAIModerationAPI(content, requestId) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Request-ID': requestId
      },
      body: JSON.stringify({
        input: content
      }),
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  normalizeResponse(providerResponse, requestId, latency, provider) {
    const result = {
      provider: provider,
      model: providerResponse.model || 'text-moderation-latest',
      latency: latency,
      requestId: requestId,
      rawResponsePointer: `moderation_raw_${requestId}`, // In production, store in separate table/cache
      normalizedScore: 0,
      categories: {
        harassment: 0,
        hate: 0,
        violence: 0,
        sexual: 0,
        spam: 0,
        misinformation: 0
      }
    };

    if (provider === 'openai' && providerResponse.results && providerResponse.results.length > 0) {
      const moderationResult = providerResponse.results[0];
      const categories = moderationResult.categories;
      const categoryScores = moderationResult.category_scores;

      // Map OpenAI categories to internal categories
      const mapping = CATEGORY_MAPPING.openai;
      let maxScore = 0;

      for (const [openaiCategory, score] of Object.entries(categoryScores)) {
        const normalizedScore = Math.round(score * 100); // Convert to 0-100 scale
        maxScore = Math.max(maxScore, normalizedScore);

        if (mapping[openaiCategory]) {
          const internalCategory = mapping[openaiCategory].internal;
          const weight = mapping[openaiCategory].weight;
          result.categories[internalCategory] = Math.max(
            result.categories[internalCategory], 
            Math.round(normalizedScore * weight)
          );
        }
      }

      result.normalizedScore = maxScore;
    }

    winston.info(`[moderation] Normalized result for ${requestId}: score=${result.normalizedScore}, categories=${JSON.stringify(result.categories)}`);
    return result;
  }

  getFallbackResult(content, requestId, latency, error) {
    winston.warn(`[moderation] Using fallback scoring for ${requestId}: ${error.message}`);
    
    // Simple keyword-based fallback scoring
    const fallbackScore = this.calculateFallbackScore(content);
    
    return {
      provider: 'fallback',
      model: 'keyword-based',
      latency: latency,
      requestId: requestId,
      rawResponsePointer: null,
      normalizedScore: fallbackScore,
      categories: {
        harassment: fallbackScore > 70 ? fallbackScore : 0,
        hate: 0,
        violence: 0,
        sexual: 0,
        spam: 0,
        misinformation: 0
      },
      error: error.message
    };
  }

  calculateFallbackScore(content) {
    // Simple keyword-based scoring for fallback
    const harmfulKeywords = [
      '死ね', 'バカ', 'アホ', 'クソ', 'ウザい', 'キモい',
      'kill', 'hate', 'stupid', 'idiot', 'fuck', 'shit'
    ];
    
    const lowercaseContent = content.toLowerCase();
    const matches = harmfulKeywords.filter(keyword => 
      lowercaseContent.includes(keyword.toLowerCase())
    );
    
    // Simple scoring: 20 points per harmful keyword, max 80
    return Math.min(matches.length * 20, 80);
  }

  async getHarmfulnessScore(content) {
    const result = await this.analyzeContent(content);
    return result.normalizedScore;
  }
  
  async detectRiskCategories(content) {
    const result = await this.analyzeContent(content);
    return Object.entries(result.categories)
      .filter(([_, score]) => score > 50)
      .map(([category]) => category);
  }

  async isSpam(content, userHistory = {}) {
    // Simple spam detection based on content patterns
    const spamIndicators = [
      /http[s]?:\/\/[^\s]+/gi, // URLs
      /\b(?:buy|sale|discount|offer|deal|money|free|click|visit)\b/gi, // Commercial terms
      /(.)\1{4,}/gi, // Repeated characters
    ];
    
    let spamScore = 0;
    spamIndicators.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        spamScore += matches.length * 10;
      }
    });
    
    // Consider user history
    if (userHistory.recentPostCount > 10 && userHistory.timespan < 3600) { // 10 posts in 1 hour
      spamScore += 30;
    }
    
    return spamScore > 50;
  }
}

module.exports = ModerationService;