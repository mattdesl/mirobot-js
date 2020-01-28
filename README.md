# mirobot with JavaScript

This uses WebSockets in the browser to connect to a mirobot on your local WiFi.

# Setup

1. Download this repository as a ZIP and extract it into a folder in your Documents or Desktop
2. Turn the mirobot on.
3. Connect your computer to its WiFi.
4. Double-click `move.html` within the repository folder to open it in Chrome or FireFox
5. The bot should start moving! Open the DevTools console so you can see the messages sent and received.

# Code Example

Here's an example script that draws a rectangle:

```js
const bot = mirobot();

// sends a 'stop' to the bot to kill any commands
bot.stop();

// draw a square
bot.send('pendown');
bot.send('forward', 50);
bot.send('left', 90);
bot.send('forward', 50);
bot.send('left', 90);
bot.send('forward', 50);
bot.send('left', 90);
bot.send('forward', 50);
bot.send('penup');

// beep for N milliseconds
bot.send('beep', 250);
```

The code goes inside an HTML page, like this:

```html
<html>
  <body>
    <p>hello world</p>

    <!-- Include the mirobot.js library -->
    <script src='mirobot.js'></script>

    <!-- Now you can run your code -->
    <script>
      .. YOUR MIROBOT CODE HERE ..
    </script>
  </body>
</html>
```

The `mirobot()` function also takes an ip address if you want to connect to something other than `local.mirobot.io`, e.g. if you want to use the internet to drive your robot.

```js
const bot = mirobot('192.168.2.10');
...
```