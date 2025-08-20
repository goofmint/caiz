'use strict';

/* globals $, app, socket */

$(document).ready(function() {
    
    /**
     * Process OGP placeholders and fetch data
     */
    function processOGPPlaceholders() {
        $('.ogp-card-placeholder[data-ogp-url]').each(function() {
            const $placeholder = $(this);
            const url = $placeholder.attr('data-ogp-url');
            
            // Skip if already processing
            if ($placeholder.hasClass('processing')) {
                return;
            }
            
            $placeholder.addClass('processing');
            
            // Fetch OGP data from server
            $.ajax({
                url: '/api/ogp-embed/fetch',
                method: 'GET',
                data: { url: url },
                success: function(data) {
                    if (data && data.url) {
                        // Build OGP card HTML
                        const cardHtml = buildOGPCard(data);
                        $placeholder.replaceWith(cardHtml);
                    } else {
                        // Show fallback link
                        const fallbackHtml = `<div class="ogp-card-fallback">
                            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
                        </div>`;
                        $placeholder.replaceWith(fallbackHtml);
                    }
                },
                error: function() {
                    // Show fallback link on error
                    const fallbackHtml = `<div class="ogp-card-fallback">
                        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>
                    </div>`;
                    $placeholder.replaceWith(fallbackHtml);
                }
            });
        });
    }
    
    /**
     * Build OGP card HTML from data
     */
    function buildOGPCard(data) {
        let html = `<div class="ogp-card" data-url="${escapeHtml(data.url)}">`;
        
        // Add image if available
        if (data.image) {
            html += `
                <div class="ogp-card-image">
                    <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || '')}" loading="lazy" onerror="this.parentElement.style.display='none'">
                </div>`;
        }
        
        // Add content
        html += `
            <div class="ogp-card-content">
                <div class="ogp-card-title">
                    <a href="${escapeHtml(data.url)}" target="_blank" rel="noopener noreferrer">
                        ${escapeHtml(data.title || 'No title')}
                    </a>
                </div>`;
        
        // Add description if available
        if (data.description) {
            html += `
                <div class="ogp-card-description">
                    ${escapeHtml(data.description)}
                </div>`;
        }
        
        // Add domain info
        html += `
                <div class="ogp-card-domain">`;
        
        if (data.favicon) {
            html += `<img src="${escapeHtml(data.favicon)}" alt="" class="ogp-card-favicon" onerror="this.style.display='none'">`;
        }
        
        html += `
                    <span>${escapeHtml(data.domain || '')}</span>
                </div>
            </div>
        </div>`;
        
        return html;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    /**
     * Handle dynamically loaded content
     */
    $(window).on('action:posts.loaded action:chat.loaded action:composer.preview', function() {
        setTimeout(processOGPPlaceholders, 100);
    });
    
    /**
     * Handle topic load
     */
    $(window).on('action:topic.loaded', function() {
        processOGPPlaceholders();
    });
    
    /**
     * Process on initial page load
     */
    processOGPPlaceholders();
    
    /**
     * Admin cache clear functionality
     */
    if (app.user && app.user.isAdmin) {
        $(window).on('action:ajaxify.end', function() {
            // Add cache clear button to admin pages if needed
            if (window.location.pathname.indexOf('/admin') === 0) {
                // Admin-specific functionality can be added here
            }
        });
    }
});