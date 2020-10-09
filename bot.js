const HTTPS = require('https');
const fs = require('fs');
const request = require('request');
const ImageService = require('groupme').ImageService;
const snoowrap = require('snoowrap');


const botID = process.env.BOT_ID;

const reddit = new snoowrap({
  userAgent: process.env.USER_AGENT,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  username: process.env.USERNAME,
  password: process.env.PASSWORD
});

const subReddits = ['OTmemes', 'PrequelMemes', 'SequelMemes'];

function getRandom() {
  return Math.floor(Math.random() * 3);
}

function sendMeme() {
  var subReddit = subReddits[getRandom()];
  reddit.getSubreddit(subReddit).getHot({limit:5}).map(post => [post.title, post.url]).then(
    function (post) {
      var i;
      for (i = 0; i < post.length; ++i) {
        var e = post[i][1].search('jpg');
        if (e != -1) {
          console.log(post[i][0]);
          uploadImage({'title': post[i][0], 'url': post[i][1]});
          break;
        }
      }
    })
}

function uploadImage(meme) {
  var imageStream = fs.createWriteStream('tmp-image');
  request(meme['url']).pipe(imageStream);
  imageStream.on('close', () => {
    ImageService.post(
      'tmp-image',
      (err, ret) => {
        if (err) {
          console.log(err);
        } else {
          console.log(ret);
          postMessage({'title': meme['title'], 'url': ret['url']})
        }
      })
  })
}

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      botRegex = /^\/new meme$/;

  if(request.text && botRegex.test(request.text)) {
    this.res.writeHead(200);
    sendMeme();
    this.res.end();
  } else {
    console.log("don't care");
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage(meme) {
  var options, body, botReq;

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id" : botID,
    "text" : meme['title'],
    "attachments" : [{
      "type"  : "image",
      "url"   : meme['url']
    }]
  };

  console.log('sending meme titled: ' + meme['title']);
  console.log(meme['url']);

  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}

sendMeme();

exports.respond = respond;

