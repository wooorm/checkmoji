'use strict'

var doc = require('global/document')
var debounce = require('debounce')
var regex = require('emoji-regex')()
var data = require('./emoji.json')
var platforms = require('./platforms.json')

var $form = doc.querySelector('#form')
var $input = doc.querySelector('#in')
var $options = doc.querySelector('#options')
var $output = doc.querySelector('#out')
var $current = doc.querySelector('#current')

var own = {}.hasOwnProperty

var value = 'To be or not to 🐝, that is the ❓'
var defaults = new Set(['apple', 'google', 'facebook', 'twitter'])

var key

for (key in platforms) {
  if (own.call(platforms, key)) {
    each(key)
  }
}

$form.addEventListener('submit', onsubmit)
$input.addEventListener('input', debounce(onchange, 200))

onchange()

init()

function init() {
  var index = -1

  $input.value = ''

  tick()

  function tick() {
    var char = value.charAt(++index)

    if (char) {
      $input.value += char
      onchange()

      setTimeout(tick, 100)
    }
  }
}

function each(platform) {
  var $label = doc.createElement('label')
  var $check = $label.appendChild(doc.createElement('input'))

  $check.checked = defaults.has(platform)
  $check.type = 'checkbox'
  $check.name = 'platform'
  $check.id = platform
  $check.addEventListener('change', onchange)

  $label.append(doc.createTextNode(platforms[platform]))
  $options.append($label)
}

function onchange() {
  var $head = $output.lastChild
  var key

  while ($head) {
    if ($head === $current) {
      break
    }

    $head.remove()
    $head = $output.lastChild
  }

  $current.textContent = $input.value

  for (key in platforms) {
    if (own.call(platforms, key)) {
      add(key)
    }
  }
}

function onsubmit(ev) {
  onchange()
  ev.preventDefault()
}

function add(pid) {
  var $check = doc.querySelector('#' + pid)
  var value = $input.value
  var lastIndex = 0
  var $dd
  var $img
  var match
  var emoji
  var info

  if (!$check.checked) {
    return
  }

  $dd = doc.createElement('dd')

  while ((match = regex.exec(value))) {
    emoji = match[0]
    info = data[emoji]

    if (lastIndex !== regex.lastIndex - emoji.length) {
      $dd.append(
        doc.createTextNode(
          value.slice(lastIndex, regex.lastIndex - emoji.length)
        )
      )
    }

    $img = doc.createElement('img')

    if (info) {
      $img.title = info.title + ' (on ' + platforms[pid] + ')'
      $img.alt = emoji
      $img.src = './image/' + pid + '/' + info.id + '.png'
      $dd.append($img)
    } else {
      console.log('else:', info, emoji)
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex !== value.length) {
    $dd.append(doc.createTextNode(value.slice(lastIndex)))
  }

  $output.appendChild(doc.createElement('dt')).textContent = platforms[pid]
  $output.append($dd)

  regex.lastIndex = 0
}
