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
            
            console.info('[ogp-embed/client] fetch:start', { url });
            socket.emit('plugins.ogp-embed.fetch', { url: url }, function(err, data) {
                if (err) {
                    console.error('[ogp-embed/client] fetch:error', { url, error: err && err.message ? err.message : err });
                } else {
                    console.info('[ogp-embed/client] fetch:success', { url, hasData: !!(data && data.url) });
                }
                if (err || !data || !data.url) {
                    $placeholder.replaceWith(
                        '<div class="ogp-card-fallback">' +
                        '<a href="' + sanitizeHrefUrl(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + '</a>' +
                        '</div>'
                    );
                } else {
                    renderOGPCard(data).then(function($card) {
                        console.info('[ogp-embed/client] fetch:replace', { url });
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

// Allow only http/https for href to prevent javascript: and other dangerous schemes
function sanitizeHrefUrl(raw) {
    try {
        var u = new URL(String(raw), window.location.origin);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
            return u.href;
        }
    } catch (e) {
        // fall through to safe default
    }
    return '#';
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

        console.info('[ogp-embed/client] refetch:emit', { payload });
        socket.emit('plugins.ogp-embed.refetch', payload, function(err, res) {
            $btn.prop('disabled', false);
            $icon.removeClass('fa-spin');
            try {
                if (err) {
                    console.error('[ogp-embed/client] refetch:error', { url, error: err && err.message ? err.message : err });
                    const msg = err.message || '[[ogp-embed:ogp-refetch-internal-error]]';
                    if (/\[\[.*\]\]/.test(msg)) {
                        require(['translator', 'alerts'], function(translator, alerts) {
                            translator.translate(msg, function(text) { alerts.error(text); });
                        });
                    } else {
                        require(['alerts'], function(alerts) { alerts.error(msg); });
                    }
                    return;
                }
                if (res && res.accepted) {
                    console.info('[ogp-embed/client] refetch:accepted', { url, nextAllowedAt: res.nextAllowedAt });
                    require(['translator', 'alerts'], function(translator, alerts) {
                        translator.translate('[[ogp-embed:ogp-refetch-accepted]]', function(text) { alerts.success(text); });
                    });

                    // Immediately fetch updated OGP and replace this card
                    console.info('[ogp-embed/client] fetch-after-refetch:start', { url });
                    socket.emit('plugins.ogp-embed.fetch', { url: url }, function(err2, data2) {
                        if (!err2 && data2 && data2.url) {
                            console.info('[ogp-embed/client] fetch-after-refetch:success', { url });
                            renderOGPCard(data2).then(function($newCard) {
                                console.info('[ogp-embed/client] fetch-after-refetch:replace', { url });
                                $card.replaceWith($newCard);
                            });
                        } else {
                            console.error('[ogp-embed/client] fetch-after-refetch:error', { url, error: err2 && err2.message ? err2.message : err2 });
                        }
                    });
                } else if (res && res.error) {
                    console.warn('[ogp-embed/client) refetch:rejected', { url, code: res.error.code, message: res.error.message, nextAllowedAt: res.nextAllowedAt });
                    const message = res.error.message || '[[ogp-embed:ogp-refetch-internal-error]]';
                    if (/\[\[.*\]\]/.test(message)) {
                        require(['translator', 'alerts'], function(translator, alerts) {
                            translator.translate(message, function(text) { alerts.error(text); });
                        });
                    } else {
                        require(['alerts'], function(alerts) { alerts.error(message); });
                    }
                }
            } catch (err) {
                console.error('[ogp-embed/client] refetch:exception', { url, error: err && err.message ? err.message : err });
                require(['translator', 'alerts'], function(translator, alerts) {
                    translator.translate('[[ogp-embed:ogp-refetch-internal-error]]', function(text) { alerts.error(text); });
                });
            }
        });
    });
});
