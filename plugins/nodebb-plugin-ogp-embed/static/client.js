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
            
            socket.emit('plugins.ogp-embed.fetch', { url: url }, function(err, data) {
                if (err || !data || !data.url) {
                    $placeholder.replaceWith(
                        '<div class="ogp-card-fallback">' +
                        '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>' +
                        '</div>'
                    );
                } else {
                    renderOGPCard(data).then(function($card) {
                        $placeholder.replaceWith($card);
                    });
                }
            });
        });
        
        isProcessing = false;
    }
    
    // Render OGP card using Benchpress template on client
    function renderOGPCard(data) {
        return new Promise((resolve) => {
            const tplData = {
                url: data.url,
                title: data.title || '',
                description: data.description || '',
                image: data.image || '',
                domain: data.domain || '',
                favicon: data.favicon || ''
            };
            app.parseAndTranslate('partials/ogp-card', tplData, function(html) {
                resolve($(html));
            });
        });
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
        require(['translator'], function(translator) {
            $('.ogp-embed-card').each(function() { translator.translate(this); });
        });
    });
    
    processOGPPlaceholders();
    require(['translator'], function(translator) {
        $('.ogp-embed-card').each(function() { translator.translate(this); });
    });

    // Refetch handler
    $(document).on('click', '[data-action="ogp-refetch"]', function(e) {
        e.preventDefault();
        const $btn = $(this);
        const $card = $btn.closest('.ogp-embed-card');
        const url = $card.attr('data-ogp-url');
        if (!url) return;

        // Disable button during request
        $btn.prop('disabled', true);

        // Ensure label is translated
        require(['translator'], function(translator) {
            translator.translate($btn.get(0));
        });

        const payload = { url: url };
        if (typeof window.topicId !== 'undefined') payload.topicId = window.topicId;
        // Add spin feedback
        const $icon = $btn.find('i.fa');
        $icon.addClass('fa-spin');

        socket.emit('plugins.ogp-embed.refetch', payload, function(res) {
            $btn.prop('disabled', false);
            $icon.removeClass('fa-spin');
            try {
                if (res && res.accepted) {
                    if (typeof app !== 'undefined' && app.alertSuccess) {
                        require(['translator'], function(translator) {
                            translator.translate('[[ogp-embed:ogp-refetch-accepted]]', function(text) {
                                app.alertSuccess(text);
                            });
                        });
                    }

                    // Immediately fetch updated OGP and replace this card
                    socket.emit('plugins.ogp-embed.fetch', { url: url }, function(err2, data2) {
                        if (!err2 && data2 && data2.url) {
                            renderOGPCard(data2).then(function($newCard) {
                                $card.replaceWith($newCard);
                            });
                        }
                    });
                } else if (res && res.error && res.error.message) {
                    if (typeof app !== 'undefined' && app.alertError) {
                        app.alertError(res.error.message);
                    }
                }
            } catch (err) {
                if (typeof app !== 'undefined' && app.alertError) {
                    app.alertError('Error');
                }
            }
        });
    });
});
