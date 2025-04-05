const Translator = require.main.require('./src/translator');
const fs = require('fs');
const path = require('path');
const winston = require.main.require('winston');

class Base {
  static router;
  static middleware;
  static controllers;
}

module.exports = Base;