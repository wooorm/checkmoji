import https from 'https'
import path from 'path'
import fs from 'graceful-fs'
import request from 'request'
import concat from 'concat-stream'
import {bail} from 'bail'
import unified from 'unified'
import html from 'rehype-parse'
import {select, selectAll} from 'hast-util-select'
import toString from 'hast-util-to-string'
import {collapseWhiteSpace} from 'collapse-white-space'
import createDebug from 'debug'

const debug = createDebug('build')

// 😬 emojipedia seems to complain if we open more sockets.
https.globalAgent.maxSockets = 2

const proc = unified().use(html)

// 🤔 random user agent to keep emojipedia happy.
const ua = 'Mozilla/5.0 (Windows NT 6.1; rv:31.0) Gecko/20100101 Firefox/31.1'
const root = 'https://emojipedia.org'

// 🤓 places we store emoji info and platforms.
const data = {}
const platforms = {}

debug.enabled = true

// 👍 we save stuff here on exit :hackerman:
process.on('exit', onexit)

// 🏃🏿‍♀️ Don’t walk into modifiers multiple times.
const seen = []

// 📒 Categories on https://emojipedia.org.
const categories = [
  'people',
  'nature',
  'food-drink',
  'activity',
  'travel-places',
  'objects',
  'symbols',
  'flags'
]

const modifier = /(light|dark|medium(-(light|dark))?)-skin-tone\/$/

// 🏃‍💨  fetch those categories!
let index = -1
while (++index < categories.length) {
  request(
    {url: root + '/' + categories[index] + '/', headers: {'User-Agent': ua}},
    oncategory
  )
}

function onexit() {
  debug('Done! Got %s emoji!', Object.keys(data).length)
  fs.writeFileSync(
    path.join('src', 'emoji.js'),
    "export const emoji = JSON.parse('" + JSON.stringify(data) + "')\n"
  )
  fs.writeFileSync(
    path.join('src', 'platforms.json'),
    "export const platforms = JSON.parse('" + JSON.stringify(platforms) + "')\n"
  )
}

function oncategory(error, response, body) {
  bail(error)

  const tree = proc.parse(body)

  debug('Category: %s', collapseWhiteSpace(toString(select('h1', tree))).trim())

  const nodes = selectAll('.emoji-list a', tree)
  let index = -1

  while (++index < nodes.length) {
    get(nodes[index])
  }
}

function get(node) {
  const id = node.properties.href

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

  const tree = proc.parse(body)
  const related = selectAll('.emoji-list > li > a', tree)
  const emoji = select('#emoji-copy', tree).properties.value
  const title = select('h1', tree)
  const id = select('[property="og:url"]', tree).properties.content.slice(1, -1)
  const entry = {
    id,
    title: collapseWhiteSpace(
      toString(title.children[title.children.length - 1])
    ).trim(),
    platforms: []
  }

  data[emoji] = entry

  debug('Emoji: %s (%s, %s)', entry.id, emoji, entry.title)

  const nodes = selectAll('.vendor-list > ul > li > .vendor-container', tree)
  let index = -1

  while (++index < nodes.length) {
    one(nodes[index])
  }

  const rels = related.filter(
    (node) =>
      node.properties.href.startsWith('/' + id) &&
      modifier.test(node.properties.href)
  )

  index = -1

  while (++index < rels.length) {
    get(rels[index])
  }

  function one(node) {
    const platform = collapseWhiteSpace(
      toString(select('.vendor-info', node))
    ).trim()
    const img = select('.vendor-image img', node).properties.src
    const pid = platform.toLowerCase().replace(/\s+/g, '')
    const dir = path.join('src', 'image', pid)

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
      const fp = path.join(dir, entry.id + '.png')

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
