# mirobot with JavaScript

This uses WebSockets in the browser to connect to a mirobot on your local WiFi.

First download this repository as a ZIP and extract it into a folder in your Documents or Desktop.

## Approach A: Chrome App

The simplest way to use mirobot locally is with the Chrome app:

https://chrome.google.com/webstore/detail/mirobot/bjkfmkklaabeoomedlpgfplgndpiijea

First turn the mirobot on and connect to its WiFi, then in the Mirobot apps connect to the following IP:

`local.mirobot.io`

## Approach B: Running apps.mirobot.io in the Browser

If for some reason you don't want to use the Chrome App, you can still locally run the `apps.mirobot.io` site:

First turn the mirobot on and connect to its WiFi.

Then `cd` or open the `apps.mirobot.io/` folder in your Terminal:

```sh
cd apps.mirobot.io
```

Now you need to start a local server, you can do this with Python like so:

```sh
python -m SimpleHTTPServer
```

Or in Node.js + npm if you have that setup:

```sh
# first install serve globally (just do this once)
npm install serve -g

# then you can always serve this folder
serve .
```

Now you can use the apps as usual, but connect to the following IP within the apps:

```sh
local.mirobot.io
```

# Approach C: Using Raw Websockets

Let's say you want something really advanced, like connecting Face Tracking or some other cool JavaScript-based app to your Mirobot.

For this you can use my simple `websockets/` interface:

1. Turn the mirobot on.
2. Connect your computer to its WiFi.
3. Open up `websockets/move.html` HTML page within the repository folder. Use Chrome or FireFox to open it.
4. The bot should start moving! Open the DevTools console so you can see the messages sent and received.

### Code Example

Here's an example script that draws a rectangle:

```js
const bot = mirobot();

// Send a 'stop' to kill any previously running commands
bot.stop();

// draw a square
bot.pendown();
bot.forward(250);
bot.left(90);
bot.forward(250);
bot.left(90);
bot.forward(250);
bot.left(90);
bot.forward(250);
bot.penup();

// beep for 250 milliseconds
bot.beep(250);
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