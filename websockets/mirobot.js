{
  const DEFAULT_IP = 'local.mirobot.io';
  const noop = () => {};
  function mirobotAsync (ip = DEFAULT_IP) {
    const defaultError = () => console.error('Error in socket');
    const socket = new window.WebSocket(`ws://${ip}:8899/websocket`);
    socket.onclose = () => {
      console.log('[mirobot] Socket disconnected, you must now reload the page to reconnect.');
    };

    const bot = {
      send,
      close: () => socket.close()
    };

    return new Promise((resolve, reject) => {
      console.log('[mirobot] Connecting...');
      socket.onerror = () => {
        socket.onopen = noop;
        socket.onerror = defaultError;
        reject(new Error('Could not connect'));
      };
      socket.onopen = () => {
        console.log('[mirobot] Connected');
        socket.onopen = noop;
        socket.onerror = defaultError;
        resolve(bot);
      };
    });
    
    function receive (prevCommand) {
      return new Promise((resolve, reject) => {
        socket.onerror = () => handleError(reject);
        socket.onmessage = ({ data }) => {
          try {
            const msg = JSON.parse(data);
            if (msg.status === 'error') {
              if (prevCommand && msg.msg.includes('not recognised')) {
                console.warn('[mirobot]', msg.msg, `"${prevCommand}"`);
              } else {
                console.warn('[mirobot]', msg.msg);
              }
            }
            socket.onmessage = noop;
            socket.onerror = defaultError;
            resolve(msg);
          } catch (_) {
            handleError(reject);
          }
        };
      })
    }

    function handleError (reject) {
      socket.onerror = defaultError;
      socket.onmessage = noop;
      reject(new Error('Error from Mirobot'));
    }

    async function send (command, argument) {
      return new Promise(async (resolve, reject) => {
        const opt = { cmd: command };
        if (command === 'beep' && (!isFinite(argument) || argument < 2 || argument > 10000)) {
          argument = 500;
        }
        if (argument != null) opt.arg = argument;
        socket.send(JSON.stringify(opt));
        let msg = await receive(command);
        if (msg.status === 'accepted') {
          console.log('[mirobot]', command, msg.status);
          msg = await receive(command);
          console.log('[mirobot]', command, msg.status);
          resolve(msg);
        } else {
          resolve(msg);
        }
      });
    }
  }

  function mirobot (ip = DEFAULT_IP) {
    let stack = [];
    let closing = false;
    let curBot;
    let p = mirobotAsync(ip).then(bot => {
      if (closing) {
        bot.close();
      } else {
        curBot = bot;
        next();
      }
    });

    async function next () {
      if (closing) return;
      if (!curBot) {
        console.error('[mirobot] No bot connected');
        return;
      }
      if (stack.length > 0) {
        const args = stack.shift();
        await curBot.send(...args);
        next();
      }
    }

    function send (...args) {
      if (closing) return;
      stack.push(args);
      if (curBot) next();
    }

    return {
      // Familiar API as mirobot JS
      forward (amount = 100) { send('forward', amount); },
      back (amount = 100) { send('back', amount); },
      left (degrees = 90) { send('left', degrees); },
      right (degrees = 90) { send('right', degrees); },
      penup () { send('penup'); },
      pendown () { send('pendown'); },
      beep (duration = 250) { send('beep', duration); },

      // Raw send commands
      send,

      // Stop the bot immediately and kill command queue
      stop () {
        stack.length = 0;
        stack.push([ 'stop' ]);
        if (curBot) next();
      },

      // Stop the bot and close connection
      close () {
        closing = true;
        stack.length = 0;
        if (curBot) {
          curBot.send('stop').then(() => {
            curBot.close();
            curBot = null;
          });
        }
      }
    };
  }
  window.mirobot = mirobot;
  window.mirobot.interface = mirobotAsync;
}