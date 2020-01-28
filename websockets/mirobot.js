function mirobot (ip = 'local.mirobot.io') {
  let receivers = {};
  const randomHash = () => {
    let hash;
    do {
      hash = Math.random().toString(36).substr(2, 10);
    } while (hash in receivers);
    return hash;
  }
  const noop = () => {};
  let closing = false;
  let socket;
  let processInterval;
  let connected = false;
  let queue = [];
  let listeners = [];
  let msgID = 0;
  let idle = true;
  connect();

  return {
    collision (cb) {
      let enabled = true;
      setTimeout(() => {
        this.collideState((result) => {
          if (enabled && result.status === 'complete' && result.msg !== 'none') {
            cb(result.msg);
          }
        });
      }, 0);
      listeners.push(cb);
      return () => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
        enabled = false;
      };
    },

    enableCollisionListener (cb) {
      return send('collideNotify', 'true', cb);
    },
    disableCollisionListener (cb) {
      return send('collideNotify', 'false', cb);
    },

    collideState (cb) { return send('collideState', cb); },
    stop (cb) { return send('stop', cb); },
    forward (n = 100, cb) { return send('forward', n, cb); },
    backward (n = 100, cb) { return send('backward', n, cb); },
    left (deg = 90, cb) { return send('left', deg, cb); },
    right (deg = 90, cb) { return send('right', deg, cb); },
    penup (cb) { return send('penup', cb); },
    pendown (cb) { return send('pendown', cb); },
    version (cb) { return send('version', cb); },
    ping (cb) { return send('ping', cb); },
    pause (cb) { return send('pause', cb); },
    resume (cb) { return send('resume', cb); },
    beep (duration = 250, cb) { return send('beep', duration, cb); },

    get idle () {
      return idle;
    },

    reset () {
      queue.length = 0;
    },

    send,
    send_msg,

    close () {
      closing = true;
      if (socket) socket.close();
      if (processInterval != null) clearInterval(processInterval);
      processInterval = null;
    }
  }

  function log (...args) {
    console.log(...args);
  }

  function onConnect () {
    connected = true;
    log('[mirobot] Connected');
  }

  function onClose () {
    connected = false;
    if (!closing) {
      log('[mirobot] Reconnecting...');
      connect();
    } else {
      log('[mirobot] Connection closed. Reload the page to reconnect.');
    }
    socket = null;
    closing = false;
  }

  function onMessage (ev) {
    if (ev.data && typeof ev.data === 'string') {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.status === 'error') {
          console.warn('[mirobot] Error:', msg.msg, msg);
        }
        
        if (msg.id && msg.id in receivers) {
          receivers[msg.id].callback(msg);
          log('[mirobot] Receiving', receivers[msg.id].data.cmd, msg.status, `(${msg.id})`);
          if (msg.status === 'complete' || msg.status === 'error') {
            receivers[msg.id].finish(msg);
            delete receivers[msg.id];
          }

          if (msg.status === 'complete') {
            idle = true;
          }
        } else if (msg.id === 'collide') {
          listeners.forEach(cb => {
            cb(msg.msg);
          });
        } else {
          // No point in logging this
          // console.warn('[mirobot] Message received from previous session, skipping.');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  }

  function onError (err) {
    console.error(err);
  }

  function connect () {
    if (socket) {
      throw new Error('Already connected to a socket');
    }
    log('[mirobot] Connecting...');
    const url = `ws://${ip}:8899/websocket`;
    socket = new window.WebSocket(url);
    socket.onopen = onConnect;
    socket.onclose = onClose;
    socket.onmessage = onMessage;
    socket.onerror = onError;

    processInterval = setInterval(send_queued, 1000 / 24);
  }

  async function send (command, arg, cb = noop) {
    if (typeof arg === 'function') {
      cb = arg;
      arg = undefined;
    }
    return new Promise((resolve, reject) => {
      const opt = { cmd: command };
      if (arg != null) opt.arg = arg;
      send_msg(opt, msg => {
        resolve(msg);
      });
    }).then(resp => {
      cb(resp);
      return resp;
    });
  }

  function send_msg (data, finish = noop, callback = noop) {
    const id = randomHash();
    data = { id, ...data }
    if (data.arg != null) data.arg = data.arg.toString();
    const message = JSON.stringify(data);
    if (id in receivers) {
      console.warn('Command already exists in queue', id);
    }
    receivers[id] = { callback, data, finish };
    queue.push({ message, data });
    send_queued();
  }

  function send_queued () {
    if (idle && socket && queue.length > 0 && connected && socket.readyState === WebSocket.OPEN) {
      idle = false;
      const { message, data } = queue.shift();
      log('[mirobot] Sending', data.cmd, `(${data.id})`);
      socket.send(message);
    }
  }
}