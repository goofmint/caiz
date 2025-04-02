const winston = require.main.require('winston'); 
const Base = require('./base');

class Header extends Base {
  static async customizeSidebarLeft(data) {
    winston.info('[plugin/caiz] customizeSidebarLeft');
    winston.info(data);
    return data;
  }
}

module.exports = Header;
