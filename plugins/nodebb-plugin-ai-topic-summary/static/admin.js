// AI Topic Summary - Admin Panel

define('admin/plugins/ai-topic-summary', ['settings', 'alerts'], function (settings, alerts) {
  'use strict';

  const AiTopicSummary = {};

  AiTopicSummary.init = function () {
    settings.load('ai-topic-summary', $('.ai-summary-settings'), function() {
      console.log('[ai-topic-summary] Settings loaded');
    });

    $('#save-settings').on('click', function(e) {
      e.preventDefault();
      saveSettings();
    });

    $('#test-connection').on('click', function(e) {
      e.preventDefault();
      testConnection();
    });
  };

  function saveSettings() {
    const button = $('#save-settings');
    const originalText = button.text();
    
    button.prop('disabled', true).text('Saving...');
    
    // Collect form data
    const formData = {};
    $('.ai-summary-settings').find('[data-key]').each(function() {
      const $this = $(this);
      const key = $this.attr('data-key');
      const value = $this.val();
      formData[key] = value;
    });
    
    window.socket.emit('plugins.aiTopicSummary.saveSettings', formData, function(err, data) {
      button.prop('disabled', false).text(originalText);
      
      if (err) {
        alerts.error(err.message || 'Failed to save settings');
      } else {
        alerts.success('Settings saved successfully!');
      }
    });
  }

  function testConnection() {
    const apiKey = $('#gemini-api-key').val();
    
    if (!apiKey || !apiKey.trim()) {
      alerts.error('Please enter a Gemini API key first');
      return;
    }

    const button = $('#test-connection');
    const originalText = button.html();
    
    button.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-1"></i>Testing...');

    window.socket.emit('plugins.aiTopicSummary.testConnection', { apiKey: apiKey }, function(err, data) {
      button.prop('disabled', false).html(originalText);
      
      if (err) {
        alerts.error(err.message || 'Connection failed');
      } else {
        alerts.success('Connection successful! Gemini API is working.');
      }
    });
  }

  return AiTopicSummary;
});