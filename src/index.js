import doc from 'global/document.js'
import debounce from 'debounce'
import emojiRegex from 'emoji-regex'
import {emoji} from './emoji.js'
import {platforms} from './platforms.js'

const regex = emojiRegex()

const $form = doc.querySelector('#form')
const $input = doc.querySelector('#in')
const $options = doc.querySelector('#options')
const $output = doc.querySelector('#out')
const $current = doc.querySelector('#current')

const own = {}.hasOwnProperty

const value = 'To be or not to 🐝, that is the ❓'
const defaults = new Set(['apple', 'google', 'facebook', 'twitter'])

let key

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
  let index = -1

  $input.value = ''

  tick()

  function tick() {
    const char = value.charAt(++index)

    if (char) {
      $input.value += char
      onchange()

      setTimeout(tick, 100)
    }
  }
}

function each(platform) {
  const $label = doc.createElement('label')
  const $check = $label.appendChild(doc.createElement('input'))

  $check.checked = defaults.has(platform)
  $check.type = 'checkbox'
  $check.name = 'platform'
  $check.id = platform
  $check.addEventListener('change', onchange)

  $label.append(doc.createTextNode(platforms[platform]))
  $options.append($label)
}

function onchange() {
  let $head = $output.lastChild
  let key

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
  const $check = doc.querySelector('#' + pid)
  const value = $input.value
  let lastIndex = 0
  let $img
  let match
  let hit
  let info

  if (!$check.checked) {
    return
  }

  const $dd = doc.createElement('dd')

  while ((match = regex.exec(value))) {
    hit = match[0]
    info = emoji[hit]

    if (lastIndex !== regex.lastIndex - hit.length) {
      $dd.append(
        doc.createTextNode(value.slice(lastIndex, regex.lastIndex - hit.length))
      )
    }

    $img = doc.createElement('img')

    if (info) {
      $img.title = info.title + ' (on ' + platforms[pid] + ')'
      $img.alt = hit
      $img.src = './image/' + pid + '/' + info.id + '.png'
      $dd.append($img)
    } else {
      console.log('else:', info, hit)
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
