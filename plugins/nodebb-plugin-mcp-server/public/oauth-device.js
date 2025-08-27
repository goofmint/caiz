'use strict';

define('oauth-device', function() {
    const OAuthDevice = {};

    /**
     * Initialize device authorization page
     */
    OAuthDevice.init = function() {
        const userCodeInput = document.getElementById('user_code');
        const forms = document.querySelectorAll('form');
        
        if (userCodeInput) {
            // Format user code input (add hyphen automatically)
            userCodeInput.addEventListener('input', function(e) {
                const formatted = OAuthDevice.formatUserCode(e.target.value);
                if (formatted !== e.target.value) {
                    const cursorPos = e.target.selectionStart;
                    e.target.value = formatted;
                    // Restore cursor position
                    e.target.setSelectionRange(cursorPos, cursorPos);
                }
            });

            // Validate on blur
            userCodeInput.addEventListener('blur', function(e) {
                const isValid = OAuthDevice.validateUserCode(e.target.value);
                if (!isValid && e.target.value.length > 0) {
                    e.target.classList.add('is-invalid');
                } else {
                    e.target.classList.remove('is-invalid');
                }
            });

            // Focus on load
            userCodeInput.focus();
        }

        // Handle form submissions with loading states
        forms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    OAuthDevice.showLoadingState(submitBtn);
                }
            });
        });

        // Handle countdown timer if expires_at is present
        const expiresElement = document.querySelector('[data-expires]');
        if (expiresElement) {
            const expiresAt = parseInt(expiresElement.dataset.expires);
            if (expiresAt) {
                OAuthDevice.startCountdown(expiresAt);
            }
        }
    };

    /**
     * Format user code with hyphen
     * @param {string} code - Raw user input
     * @returns {string} Formatted code (XXXX-XXXX)
     */
    OAuthDevice.formatUserCode = function(code) {
        if (!code) return '';

        // Remove non-alphanumeric characters and convert to uppercase
        let cleaned = code.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
        
        // Limit to 8 characters
        cleaned = cleaned.substring(0, 8);
        
        // Insert hyphen after 4 characters
        if (cleaned.length > 4) {
            return cleaned.substring(0, 4) + '-' + cleaned.substring(4);
        }
        
        return cleaned;
    };

    /**
     * Validate user code format
     * @param {string} code - User code to validate
     * @returns {boolean} Whether code format is valid
     */
    OAuthDevice.validateUserCode = function(code) {
        if (!code) return false;

        // Check format: XXXX-XXXX
        if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code)) {
            return false;
        }

        // Validate character set (no ambiguous chars: 0, O, I, 1, L)
        return !/[01IOL]/.test(code);
    };

    /**
     * Show loading state on button
     * @param {Element} button - Button element
     */
    OAuthDevice.showLoadingState = function(button) {
        if (!button) return;

        const originalText = button.textContent;
        const originalHtml = button.innerHTML;
        
        button.disabled = true;
        button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> ' + 
                          (button.name === 'action' && button.value === 'approve' ? 
                           'Approving...' : 
                           button.name === 'action' && button.value === 'deny' ?
                           'Denying...' : 
                           'Processing...');

        // Restore original state after timeout (fallback)
        setTimeout(function() {
            if (button.disabled) {
                button.disabled = false;
                button.innerHTML = originalHtml;
            }
        }, 10000);
    };

    /**
     * Handle countdown timer for code expiration
     * @param {number} expiresAt - Expiration timestamp
     */
    OAuthDevice.startCountdown = function(expiresAt) {
        const countdownElement = document.createElement('div');
        countdownElement.className = 'countdown-timer alert alert-warning mt-2';
        countdownElement.innerHTML = '<i class="fa fa-clock-o"></i> <span class="countdown-text"></span>';

        const deviceInfo = document.querySelector('.device-info');
        if (deviceInfo) {
            deviceInfo.appendChild(countdownElement);
        }

        const countdownText = countdownElement.querySelector('.countdown-text');
        const forms = document.querySelectorAll('form');

        function updateCountdown() {
            const now = Date.now();
            const remaining = expiresAt - now;

            if (remaining <= 0) {
                // Expired
                countdownElement.className = 'countdown-timer alert alert-danger mt-2';
                countdownText.textContent = 'Code has expired. Please request a new code.';
                
                // Disable forms
                forms.forEach(function(form) {
                    const buttons = form.querySelectorAll('button[type="submit"]');
                    buttons.forEach(function(btn) {
                        btn.disabled = true;
                    });
                });
                
                return;
            }

            // Calculate time components
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            // Format time
            let timeText = '';
            if (minutes > 0) {
                timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                timeText = `${seconds}s`;
            }

            countdownText.textContent = `Code expires in ${timeText}`;

            // Show warning when less than 2 minutes remain
            if (remaining < 120000 && !countdownElement.classList.contains('alert-warning')) {
                countdownElement.className = 'countdown-timer alert alert-warning mt-2';
            }

            // Show urgent warning when less than 30 seconds remain
            if (remaining < 30000) {
                countdownElement.className = 'countdown-timer alert alert-danger mt-2';
            }
        }

        // Update immediately and then every second
        updateCountdown();
        const intervalId = setInterval(updateCountdown, 1000);

        // Clean up interval if page unloads
        window.addEventListener('beforeunload', function() {
            clearInterval(intervalId);
        });
    };

    return OAuthDevice;
});