'use strict';

var doc = require('global/document');
var debounce = require('debounce');
var regex = require('emoji-regex')();
var data = require('./emoji.json');
var platforms = require('./platforms.json');

var $form = doc.getElementById('form');
var $input = doc.getElementById('in');
var $options = doc.getElementById('options');
var $output = doc.getElementById('out');
var $current = doc.getElementById('current');

var value = 'To be or not to 🐝, that is the ❓';
var defaults = ['apple', 'google', 'facebook', 'twitter'];

Object.keys(platforms).forEach(each);

$form.addEventListener('submit', onsubmit);
$input.addEventListener('input', debounce(onchange, 200));

onchange();

(function () {
  var index = -1;

  $input.value = '';

  tick();

  function tick() {
    var char = value.charAt(++index);

    if (char) {
      $input.value += char;
      onchange();

      setTimeout(tick, 100);
    }
  }
})();

function each(platform) {
  var $label = doc.createElement('label');
  var $check = $label.appendChild(doc.createElement('input'));

  $check.checked = defaults.indexOf(platform) !== -1;
  $check.type = 'checkbox';
  $check.name = 'platform';
  $check.id = platform;
  $check.addEventListener('change', onchange);

  $label.appendChild(doc.createTextNode(platforms[platform]));
  $options.appendChild($label);
}

function onchange() {
  var $head = $output.lastChild;

  while ($head) {
    if ($head === $current) {
      break;
    }

    $head.remove();
    $head = $output.lastChild;
  }

  $current.textContent = $input.value;

  Object.keys(platforms).forEach(add);
}

function onsubmit(ev) {
  onchange();
  ev.preventDefault();
}

function add(pid) {
  var $check = doc.getElementById(pid);
  var value = $input.value;
  var lastIndex = 0;
  var $dd;
  var $img;
  var match;
  var emoji;
  var info;

  if (!$check.checked) {
    return;
  }

  $dd = doc.createElement('dd');

  // eslint-disable-next-line no-cond-assign
  while (match = regex.exec(value)) {
    emoji = match[0];
    info = data[emoji];

    if (lastIndex !== regex.lastIndex - emoji.length) {
      $dd.appendChild(doc.createTextNode(value.slice(lastIndex, regex.lastIndex - emoji.length)));
    }

    $img = doc.createElement('img');

    if (info) {
      $img.title = info.title + ' (on ' + platforms[pid] + ')';
      $img.alt = emoji;
      $img.src = './image/' + pid + '/' + info.id + '.png';
      $dd.appendChild($img);
    } else {
      console.log('else: ', info, emoji);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex !== value.length) {
    $dd.appendChild(doc.createTextNode(value.slice(lastIndex)));
  }

  $output.appendChild(doc.createElement('dt')).textContent = platforms[pid];
  $output.appendChild($dd);

  regex.lastIndex = 0;
}
