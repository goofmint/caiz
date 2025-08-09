const winston = require.main.require('winston');
const Base = require('./base');

class Header extends Base {
  static async customizeSidebarCommunities(data) {
    // このフックは現在使用していないが、将来的にサーバーサイドでデータを渡す場合に使用可能
    return data;
  }
}

module.exports = Header;
