'use strict'

var https = require('https')
var path = require('path')
var fs = require('graceful-fs')
var request = require('request')
var concat = require('concat-stream')
var bail = require('bail')
var unified = require('unified')
var html = require('rehype-parse')
var query = require('hast-util-select')
var toString = require('hast-util-to-string')
var collapse = require('collapse-white-space')
var debug = require('debug')('build')

// 😬 emojipedia seems to complain if we open more sockets.
https.globalAgent.maxSockets = 2

var proc = unified().use(html)

// 🤔 random user agent to keep emojipedia happy.
var ua = 'Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.1'
var root = 'https://emojipedia.org'

// 🤓 places we store emoji info and platforms.
var data = {}
var platforms = {}

debug.enabled = true

// 👍 we save stuff here on exit :hackerman:
process.on('exit', onexit)

// 🏃🏿‍♀️ Don’t walk into modifiers multiple times.
var seen = []

// 📒 Categories on https://emojipedia.org.
var categories = [
  'people',
  'nature',
  'food-drink',
  'activity',
  'travel-places',
  'objects',
  'symbols',
  'flags'
]

var modifier = /(light|dark|medium(-(light|dark))?)-skin-tone\/$/

// 🏃‍💨  fetch those categories!
var index = -1
while (++index < categories.length) {
  request(
    {url: root + '/' + categories[index] + '/', headers: {'User-Agent': ua}},
    oncategory
  )
}

function onexit() {
  debug('Done! Got %s emoji!', Object.keys(data).length)
  fs.writeFileSync(path.join('src', 'emoji.json'), JSON.stringify(data) + '\n')
  fs.writeFileSync(
    path.join('src', 'platforms.json'),
    JSON.stringify(platforms) + '\n'
  )
}

function oncategory(error, response, body) {
  bail(error)

  var tree = proc.parse(body)

  debug('Category: %s', collapse(toString(query.select('h1', tree))).trim())

  var nodes = query.selectAll('.emoji-list a', tree)
  var index = -1

  while (++index < nodes.length) {
    get(nodes[index])
  }
}

function get(node) {
  var id = node.properties.href

  if (!seen.includes(id)) {
    seen.push(id)
    setImmediate(go)
  }

  function go() {
    request({url: root + id, headers: {'User-Agent': ua}}, onemoji)
  }
}

function onemoji(error, response, body) {
  bail(error)

  var tree = proc.parse(body)
  var related = query.selectAll('.emoji-list > li > a', tree)
  var emoji = query.select('#emoji-copy', tree).properties.value
  var title = query.select('h1', tree)
  var id = query
    .select('[property="og:url"]', tree)
    .properties.content.slice(1, -1)
  var entry = {
    id: id,
    title: collapse(toString(title.children[title.children.length - 1])).trim(),
    platforms: []
  }

  data[emoji] = entry

  debug('Emoji: %s (%s, %s)', entry.id, emoji, entry.title)

  var nodes = query.selectAll(
    '.vendor-list > ul > li > .vendor-container',
    tree
  )
  var index = -1

  while (++index < nodes.length) {
    one(nodes[index])
  }

  var rels = related.filter(function (node) {
    var url = node.properties.href
    return url.startsWith('/' + id) && modifier.test(url)
  })

  index = -1

  while (++index < rels.length) {
    get(rels[index])
  }

  function one(node) {
    var platform = collapse(toString(query.select('.vendor-info', node))).trim()
    var img = query.select('.vendor-image img', node).properties.src
    var pid = platform.toLowerCase().replace(/\s+/g, '')
    var dir = path.join('src', 'image', pid)

    entry.platforms.push(pid)

    if (!(pid in platforms)) {
      platforms[pid] = platform

      try {
        fs.mkdirSync(dir)
      } catch (error) {
        if (error.code !== 'EEXIST') {
          bail(error)
        }
      }
    }

    setImmediate(go)

    function go() {
      var fp = path.join(dir, entry.id + '.png')

      fs.exists(fp, onexists)

      function onexists(exists) {
        if (!exists) {
          request({url: img, headers: {'User-Agent': ua}}).pipe(
            concat(onimagebuf)
          )
        }

        function onimagebuf(buf) {
          debug('Emoji: %s on %s', emoji, pid)
          fs.writeFile(fp, buf, bail)
        }
      }
    }
  }
}
