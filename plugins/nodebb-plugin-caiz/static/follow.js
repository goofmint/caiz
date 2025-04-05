document.addEventListener('DOMContentLoaded', async () => {
  const followButton = $('#community-follow-button');
  const messageKeys = [
    'caiz:follow',
    'caiz:unfollow',
    'caiz:follow_success',
    'caiz:unfollow_success',
    'caiz:error.generic',
    'caiz:unfollowing',
    'caiz:following',
  ];
  if (followButton.length === 0) return;
  const { alert } = await getAlert();
  const translator = await getTranslate();
  const messages = Object.fromEntries(await Promise.all (messageKeys.map(key => new Promise((resolve) => translator.translate(`[[${key}]]`, (t) => resolve([key, t]))))))
  const cid = followButton.attr('data-cid');
  const follow = {
    status: false
  };

  const getText = (key) => messages[key] || key;

  const changeButtonLabel = async () => {
    const key = follow.status ? 'caiz:follow' : 'caiz:unfollow';
    followButton.text(getText(key));
  };

  socket.emit('plugins.caiz.isFollowed', { cid }, function(err, response) {
    console.log({ response });
    if (err) {
      return alert({
        type: 'error',
        message: err.message || getText('caiz:error.generic'),
        timeout: 3000,
      });
    }
    const { isFollowed } = response;
    follow.status = isFollowed;
    changeButtonLabel();
  });

  followButton.on('mouseenter', () => {
    const key = follow.status ? 'caiz:unfollowing' : 'caiz:following';
    followButton.text(getText(key));
  });

  followButton.on('mouseleave', () => {
    const key = follow.status ? 'caiz:follow' : 'caiz:unfollow';
    followButton.text(getText(key));
  });

  followButton.on('click', () => {
    const action = follow.status ?
      'plugins.caiz.unfollowCommunity' :
      'plugins.caiz.followCommunity';
    socket.emit(action, { cid }, function(err, response) {
      if (err) {
        return alert({
          type: 'error',
          message: err.message || getText('caiz:error.generic'),
          timeout: 3000,
        });
      }
      const { isFollowed } = response;
      follow.status = isFollowed;
      alert({
        type: 'success',
        message: getText(follow.status ? 'caiz:follow_success' : 'caiz:unfollow_success'),
        timeout: 3000,
      });
      changeButtonLabel();
    });
  });
});