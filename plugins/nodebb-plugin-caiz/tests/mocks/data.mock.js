'use strict';

// Mock for ./community/data used by community-i18n.js

const calls = [];

module.exports = {
  __calls: calls,
  async setObjectField(key, field, value) {
    calls.push({ key, field, value });
    return true;
  }
};

