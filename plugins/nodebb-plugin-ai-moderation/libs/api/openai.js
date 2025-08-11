'use strict';

const logger = require.main.require('./src/logger');

class OpenAIModerator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.openai.com/v1/moderations';
        this.timeout = 30000; // 30秒
    }

    async moderateContent(content) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        if (!content || typeof content !== 'string') {
            throw new Error('Content must be a non-empty string');
        }

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest',
                    input: content
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`OpenAI API request failed: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            
            if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
                throw new Error('Invalid response format from OpenAI API');
            }

            const result = data.results[0];
            
            // スコアの計算（0-100のスケール）
            const categoryScores = result.category_scores || {};
            const values = Object.values(categoryScores);
            const maxScore = values.length === 0 ? 0 : Math.max(...values);
            const score = Math.round(maxScore * 100);

            return {
                flagged: result.flagged,
                score: score,
                categories: result.categories,
                categoryScores: categoryScores,
                raw: data
            };

        } catch (error) {
            if (error.name === 'TimeoutError' || error.name === 'AbortError' || error.code === 'ERR_ABORTED') {
                logger.error('[ai-moderation] OpenAI API request timed out', { 
                    timeout: this.timeout 
                });
                throw new Error('OpenAI API request timed out');
            }

            logger.error('[ai-moderation] OpenAI moderation failed', { 
                error: error.message 
            });
            throw error;
        }
    }

    // APIキーのテスト
    async testConnection() {
        try {
            await this.moderateContent('This is a test message');
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // レート制限の処理
    async moderateWithRetry(content, maxRetries = 3) {
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                return await this.moderateContent(content);
            } catch (error) {
                attempt++;
                
                // レート制限エラーの場合は指数バックオフで再試行
                if (error.message.includes('429') && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2^attempt seconds
                    logger.warn(`[ai-moderation] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                throw error;
            }
        }
    }

    // バッチモデレーション（複数コンテンツを効率的に処理）
    async moderateBatch(contents, batchSize = 5) {
        if (!Array.isArray(contents)) {
            throw new Error('Contents must be an array');
        }

        const results = [];
        
        for (let i = 0; i < contents.length; i += batchSize) {
            const batch = contents.slice(i, i + batchSize);
            const batchPromises = batch.map(content => 
                this.moderateWithRetry(content).catch(error => ({
                    error: error.message,
                    content: content.substring(0, 100) // 最初の100文字のみをログに含める
                }))
            );

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // バッチ間で少し待機（レート制限対策）
            if (i + batchSize < contents.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }
}

module.exports = OpenAIModerator;