'use strict';

/* globals $, app, socket */

$(document).ready(function() {
    
    let isProcessing = false;
    
    /**
     * Process OGP placeholders and fetch data
     */
    function processOGPPlaceholders() {
        if (isProcessing) return;
        isProcessing = true;
        
        const $placeholders = $('.ogp-card-placeholder[data-ogp-url]:not(.processing)');
        if ($placeholders.length === 0) {
            isProcessing = false;
            return;
        }
        
        $placeholders.each(function() {
            const $placeholder = $(this);
            const url = $placeholder.attr('data-ogp-url');
            
            $placeholder.addClass('processing');
            
            socket.emit('ogp-embed.fetch', { url: url }, function(err, data) {
                if (err || !data || !data.url) {
                    $placeholder.replaceWith(
                        '<div class="ogp-card-fallback">' +
                        '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>' +
                        '</div>'
                    );
                } else {
                    const cardHtml = buildOGPCard(data);
                    $placeholder.replaceWith(cardHtml);
                }
            });
        });
        
        isProcessing = false;
    }
    
    /**
     * Build OGP card HTML from data
     */
    function buildOGPCard(data) {
        let html = '<div class="ogp-card" data-url="' + escapeHtml(data.url) + '">';
        
        if (data.image) {
            html += '<div class="ogp-card-image">' +
                   '<img src="' + escapeHtml(data.image) + '" alt="' + escapeHtml(data.title || '') + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">' +
                   '</div>';
        }
        
        html += '<div class="ogp-card-content">' +
               '<div class="ogp-card-title">' +
               '<a href="' + escapeHtml(data.url) + '" target="_blank" rel="noopener noreferrer">' +
               escapeHtml(data.title || 'No title') +
               '</a>' +
               '</div>';
        
        if (data.description) {
            html += '<div class="ogp-card-description">' +
                   escapeHtml(data.description) +
                   '</div>';
        }
        
        html += '<div class="ogp-card-domain">';
        
        if (data.favicon) {
            html += '<img src="' + escapeHtml(data.favicon) + '" alt="" class="ogp-card-favicon" onerror="this.style.display=\'none\'">';
        }
        
        html += '<span>' + escapeHtml(data.domain || '') + '</span>' +
               '</div>' +
               '</div>' +
               '</div>';
        
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
    
    $(window).on('action:posts.loaded action:topic.loaded', function() {
        processOGPPlaceholders();
    });
    
    processOGPPlaceholders();
});