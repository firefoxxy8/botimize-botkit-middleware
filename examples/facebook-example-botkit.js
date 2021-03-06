/*
 * This is a sample Botkit-powered Facebook bot works with botimize.
 *
 * # RUN THIS BOT:
 *
 *   1. Setup your Facebook app and page
 *
 *   2. Install required packages and build this package:
 *
 *      npm install
 *      npm install botimize
 *      npm run build
 *
 *   3. RUN from command line:
 *
 *      PAGE_TOKEN=<your page token> VERIFY_TOKEN=<your verify token> BOTIMIZE_KEY=<your botimize api key> node
 *      facebook-example.js [--lt [--ltsubdomain LOCALTUNNEL_SUBDOMAIN]]
 *
 *      Use the --lt option to make your bot available on the web through localtunnel.me.
 *
 *   4. Setup webhook URL for your Facebook app:
 *
 *      Localtunnel will create a URL for you. Add this URL as your webhook in your Facebook app.
 *
 * # USE THE BOT:
 *
 *   1. Say: "Hello"
 *      The bot will reply "Hello!"
 *
 *   2. Say: "who are you?"
 *      The bot will tell you its name, where it running, and for how long.
 *
 *   3. Say: "Call me <nickname>"
 *      Tell the bot your nickname. Now you are friends.
 *
 *   4. Say: "who am I?"
 *      The bot will tell you your nickname, if it knows one for you.
 *
 *   5. Say: "shutdown"
 *      The bot will ask if you are sure, and then shut itself down.
 *
 *
 * # This example is modified from https://github.com/howdyai/botkit/blob/master/facebook_bot.js
 *
 */

'use strict';

if (!process.env.PAGE_TOKEN) {
  console.log('Missing PAGE_TOKEN in environment');
  process.exit(1);
}

if (!process.env.VERIFY_TOKEN) {
  console.log('Missing VERIFY_TOKEN in environment');
  process.exit(1);
}

if (!process.env.BOTIMIZE_KEY) {
  console.log('Missing BOTIMIZE_KEY in environment');
  process.exit(1);
}

var Botkit = require('botkit');
var os = require('os');
var commandLineArgs = require('command-line-args');
var localtunnel = require('localtunnel');
var botimize = require('botimize')(process.env.BOTIMIZE_KEY, 'facebook');
var botimizeBotkit = require('../lib/botimize-botkit-middleware')(botimize);

var ops = commandLineArgs([
  {
    name: 'lt',
    alias: 'l',
    args: 1,
    description: 'Use localtunnel.me to make your bot available on the web.',
    type: Boolean,
    defaultValue: false,
  }, {
    name: 'ltsubdomain',
    alias: 's',
    args: 1,
    description: 'Custom subdomain for the localtunnel.me URL. This option can only be used together with --lt.',
    type: String,
    defaultValue: null,
  },
]);

if (ops.lt === false && ops.ltsubdomain !== null) {
  console.log('error: --ltsubdomain can only be used together with --lt.');
  process.exit();
}

var controller = Botkit.facebookbot({
  access_token: process.env.PAGE_TOKEN,
  verify_token: process.env.VERIFY_TOKEN,
});

controller.middleware.receive.use(botimizeBotkit.receive);
controller.middleware.send.use(botimizeBotkit.send);

var bot = controller.spawn({
});

controller.setupWebserver(process.env.port || 3000, function(err, webserver) {
  if (err) {
    console.log(err);
    process.exit();
  }
  controller.createWebhookEndpoints(webserver, bot, function() {
    console.log('ONLINE!');
    if (ops.lt) {
      var tunnel = localtunnel(process.env.port || 3000, {subdomain: ops.ltsubdomain}, function(err, tunnel) {
        if (err) {
          console.log(err);
          process.exit();
        }
        console.log('Your bot is available on the web at the following URL: ' + tunnel.url + '/facebook/receive');
      });

      tunnel.on('close', function() {
        console.log('Your bot is no longer available on the web at the localtunnnel.me URL.');
        process.exit();
      });
    }
  });
});

controller.hears(['hello', 'hi'], 'message_received', function(bot, message) {
  controller.storage.users.get(message.user, function(err, user) {
    if (err) {
      console.log(err);
    }
    if (user && user.name) {
      bot.reply(message, 'Hello ' + user.name + '!!');
    } else {
      bot.reply(message, 'Hello.');
    }
  });
});

controller.hears(['structured'], 'message_received', function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    if (err) {
      console.log(err);
    }
    convo.ask({
      attachment: {
        'type': 'template',
        'payload': {
          'template_type': 'generic',
          'elements': [
            {
              'title': 'Classic White T-Shirt',
              'image_url': 'http://petersapparel.parseapp.com/img/item100-thumb.png',
              'subtitle': 'Soft white cotton t-shirt is back in style',
              'buttons': [
                {
                  'type': 'web_url',
                  'url': 'https://petersapparel.parseapp.com/view_item?item_id=100',
                  'title': 'View Item',
                },
                {
                  'type': 'web_url',
                  'url': 'https://petersapparel.parseapp.com/buy_item?item_id=100',
                  'title': 'Buy Item',
                },
                {
                  'type': 'postback',
                  'title': 'Bookmark Item',
                  'payload': 'White T-Shirt',
                },
              ],
            },
            {
              'title': 'Classic Grey T-Shirt',
              'image_url': 'http://petersapparel.parseapp.com/img/item101-thumb.png',
              'subtitle': 'Soft gray cotton t-shirt is back in style',
              'buttons': [
                {
                  'type': 'web_url',
                  'url': 'https://petersapparel.parseapp.com/view_item?item_id=101',
                  'title': 'View Item',
                },
                {
                  'type': 'web_url',
                  'url': 'https://petersapparel.parseapp.com/buy_item?item_id=101',
                  'title': 'Buy Item',
                },
                {
                  'type': 'postback',
                  'title': 'Bookmark Item',
                  'payload': 'Grey T-Shirt',
                },
              ],
            },
          ],
        },
      },
    }, function(response, convo) {
      // whoa, I got the postback payload as a response to my convo.ask!
      convo.next();
    });
  });
});

controller.on('facebook_postback', function(bot, message) {
  bot.reply(message, 'Great Choice!!!! (' + message.payload + ')');
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'message_received', function(bot, message) {
  var name = message.match[1];
  controller.storage.users.get(message.user, function(err, user) {
    if (err) {
      console.log(err);
    }
    if (!user) {
      user = {
        id: message.user,
      };
    }
    user.name = name;
    controller.storage.users.save(user, function(err, id) {
      if (err) {
        console.log(err);
      }
      bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
    });
  });
});

controller.hears(['what is my name', 'who am i'], 'message_received', function(bot, message) {
  controller.storage.users.get(message.user, function(err, user) {
    if (err) {
      console.log(err);
    }
    if (user && user.name) {
      bot.reply(message, 'Your name is ' + user.name);
    } else {
      bot.startConversation(message, function(err, convo) {
        if (!err) {
          convo.say('I do not know your name yet!');
          convo.ask('What should I call you?', function(response, convo) {
            convo.ask('You want me to call you `' + response.text + '`?', [
              {
                pattern: 'yes',
                callback: function(response, convo) {
                  // since no further messages are queued after this,
                  // the conversation will end naturally with status == 'completed'
                  convo.next();
                },
              }, {
                pattern: 'no',
                callback: function(response, convo) {
                  // stop the conversation. this will cause it to end with status == 'stopped'
                  convo.stop();
                },
              }, {
                default: true,
                callback: function(response, convo) {
                  convo.repeat();
                  convo.next();
                },
              },
            ]);
            convo.next();
          }, {'key': 'nickname'}); // store the results in a field called nickname

          convo.on('end', function(convo) {
            if (convo.status === 'completed') {
              bot.reply(message, 'OK! I will update my dossier...');

              controller.storage.users.get(message.user, function(err, user) {
                if (err) {
                  console.log(err);
                }
                if (!user) {
                  user = {
                    id: message.user,
                  };
                }
                user.name = convo.extractResponse('nickname');
                controller.storage.users.save(user, function(err, id) {
                  if (err) {
                    console.log(err);
                  }
                  bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                });
              });
            } else {
              // this happens if the conversation ended prematurely for some reason
              bot.reply(message, 'OK, nevermind!');
            }
          });
        }
      });
    }
  });
});

controller.hears(['shutdown'], 'message_received', function(bot, message) {
  bot.startConversation(message, function(err, convo) {
    if (err) {
      console.log(err);
    }
    convo.ask('Are you sure you want me to shutdown?', [
      {
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
          convo.say('Bye!');
          convo.next();
          setTimeout(function() {
            process.exit();
          }, 3000);
        },
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function(response, convo) {
          convo.say('*Phew!*');
          convo.next();
        },
      },
    ]);
  });
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'message_received',
  function(bot, message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());
    bot.reply(message, ':|] I am a bot. I have been running for ' + uptime + ' on ' + hostname + '.');
  }
);

controller.on('message_received', function(bot, message) {
  bot.reply(message, 'Try: `what is my name` or `structured` or `call me captain`');
  return false;
});

function formatUptime(uptime) {
  var unit = 'second';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'minute';
  }
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'hour';
  }
  if (uptime !== 1) {
    unit = unit + 's';
  }

  uptime = uptime + ' ' + unit;
  return uptime;
}
