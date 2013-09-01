// ==UserScript==
// @name        Metric cooking
// @namespace   https://github.com/falk-hueffner
// @description Annotates US cooking units with their metric equivalent.
// @include     http://*
// @include     https://*
// @include     file://*
// @version     1
// @grant       none
// ==/UserScript==

/* Copyright (C) 2013  Falk Hüffner

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License along
   with this program; if not, write to the Free Software Foundation, Inc.,
   51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.  */


var numUnitSpace = '\u202F';    // thin space
var test = true;

// Python-like named groups: (<name>...)
function namedGroupRegExp(regexp, modifiers) {
    var groupNumber = {};
    var i = 1;
    var re = new RegExp(regexp.replace(/\((?![?])(<([^>]+)>)?/g,
                                       function (_, _, name) {
                                           groupNumber[name] = i++;
                                           return '(';
                                       }),
                        modifiers);

    re.exec = function (string) {
        var match = RegExp.prototype.exec.call(this, string);
        match.group = function (name) {
            return match[groupNumber[name]];
        };
        return match;
    };

    re.replace = function (string, replace) {
        if (typeof replace == 'function') {
            return string.replace(this, function () {
                var args = arguments;
                arguments.group = function (name) {
                    return args[groupNumber[name]];
                };
                return replace(arguments);
            });
        } else {
            return string.replace(this, replace);
        }
    };
    return re;
}

var units = {
    'cup': [/\b[Cc]ups?\b/, 'ml', 236.5882365]
};

var reUnit = '';
for (var unit in units) {
    if (reUnit)
        reUnit += '|';
    else
        reUnit = '(<unit>';
    reUnit += '(<' + unit + '>' + units[unit][0].source + ')';
}
reUnit += ')';

var reReal   = /(<real>\d+(\.\d+)?)/.source;
var reNumber = '(<number>' + reReal + ')';

function parseNumber(match) {
    var real = match.group('real');
    return parseFloat(real);
}

function parseUnit(match) {
    for (var u in units)
	if (match.group(u))
            return u;
    return undefined;
}

var reAll = reNumber + '\\s+' + reUnit;
var re = namedGroupRegExp(reAll, 'g');

function convert(amount, unit) {
    var newUnit = units[unit][1];
    var newAmount = amount * units[unit][2];
    return {amount: newAmount, unit: newUnit};
}

function replaceUnits(match) {
    var newText = match[0];
    var unit = parseUnit(match);
    var converted = convert(parseNumber(match), unit);
    var newAmount = converted.amount;
    var newUnit = converted.unit;

    newText += ' [' + newAmount + numUnitSpace + newUnit + ']';
    
    return newText;
}

var tests = [
    ['1 cup Guinness', /1 cup \[23.*ml\] Guinness/]
];

if (test) {
    for (var i in tests) {
        var result = re.replace(tests[i][0], replaceUnits);
        if (!result || !result.match(tests[i][1]))
            dump('test failed: "%s" -> "%s" (not %s)', tests[i][0], result, tests[i][1]);
    }
}

var textNodes = document.evaluate('//body//text()', document, null,
                                  XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

for (var i = 0; i < textNodes.snapshotLength; i++) {
    var node = textNodes.snapshotItem(i);
    var text = node.data;
    var newText = re.replace(text, replaceUnits);
    node.data = newText;
}
