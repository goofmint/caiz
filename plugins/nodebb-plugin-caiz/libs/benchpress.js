const Benchpress = require.main.require('benchpressjs');

Benchpress.registerHelper('ifEqual', (...args) => {
  return `${args[0]}` === `${args[1]}`;
});
