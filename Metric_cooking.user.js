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


var maxError     = 0.03;
var numUnitSpace = '\u202F';    // thin space
var test         = true;

var cup_ml = 236.5882365;
// source: USDA National Nutrient Database for Standard Reference, Release 26
var ingredients = {
    'flour':       [/flour/, 125/cup_ml],              // ~20081~
    'brown sugar': [/(dark )?brown sugar/, 220/cup_ml] // ~19334~ (packed)
};
var reIngredient = '';
for (var ingredient in ingredients) {
    if (reIngredient)
        reIngredient += '|';
    else
        reIngredient = '(<ingredient>';
    reIngredient += '(<' + ingredient + '>\\b' + ingredients[ingredient][0].source + '\\b)';
}
reIngredient += ')';

function round(x){
    var fs = [100000, 50000, 25000, 10000, 5000, 2500, 1000, 500, 250, 100, 50, 25, 10, 5, 1];
    var newx;
    for (var f in fs) {
        newx = Math.round(x / fs[f]) * fs[f];
        var error = Math.abs(x - newx);
        if (error / x < maxError)
            return newx;
    }
    return newx;
}

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
    'cup':        [/\bcups?\b/,       'ml', 236.5882365  ],
    'inch':       [/\binch\b/,        'mm',  25.6        ],
    'ounce':      [/\b(oz|ounces)\b/, 'g',   28.349523125],
    'stick':      [/\bstick\b/,       'g', 4*28.349523125],
    'tablespoon': [/\b(tb|Tbsp)\b/,   'ml',  14.8        ],
    'teaspoon':   [/\btsp\b/,         'ml',  14.8/3      ],
    'quart':      [/\bquarts\b/,      'ml', 946.352946   ]
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
var reFraction  = /(<fraction>(<fracWhole>\d+\s+)?(<fracNum>\d+)[/](<fracDen>\d+))/.source;
var reNumber = '(<number>' + reReal + '|' + reFraction + ')';

function parseNumber(match) {
    var real = match.group('real');
    if (real)
        return parseFloat(real);

    var amount = 0;
    var fracWhole = match.group('fracWhole');
    if (fracWhole)
        amount += parseInt(fracWhole);
    var fracNum = match.group('fracNum');
    var fracDen = match.group('fracDen');
    amount += parseInt(fracNum) / parseInt(fracDen);
    return amount;
}

function parseUnit(match) {
    for (var u in units)
        if (match.group(u))
            return u;
    return undefined;
}

function parseIngredient(match) {
    for (var i in ingredients)
        if (match.group(i))
            return i;
}

var reAll = reNumber + '(\\s+|-)' + reUnit + '(\\s+' + reIngredient + ')?';
var re = namedGroupRegExp(reAll, 'g');

function convert(amount, unit) {
    var newUnit = units[unit][1];
    var newAmount = amount * units[unit][2];
    return {amount: newAmount, unit: newUnit};
}

function scale(amount, unit) {
    if (unit == 'mm' && amount >= 10) {
        unit = 'cm';
        amount /= 10;
    } else if (unit == 'ml' && amount >= 1000) {
        unit = 'l';
        amount /= 1000;
    }
    return {amount: amount, unit: unit};
}

function replaceUnits(match) {
    var newText = match[0];
    var unit = parseUnit(match);
    var converted = convert(parseNumber(match), unit);
    var newAmount = converted.amount;
    var newUnit = converted.unit;

    if (match.group('ingredient')) {
        var ingredient = parseIngredient(match);
        if (newUnit == 'ml') {
            newAmount = newAmount * ingredients[ingredient][1];
            newUnit = 'g';
        }
    }

    newAmount = round(newAmount);
    var scaled = scale(newAmount, newUnit);
    newAmount = scaled.amount;
    newUnit   = scaled.unit;

    newText += ' [' + newAmount + numUnitSpace + newUnit + ']';
    
    return newText;
}

var tests = [
    ['1 cup Guinness', '1 cup [240 ml] Guinness'],
    ['3/4 cup unsweetened cocoa', '3/4 cup [175 ml] unsweetened cocoa'],
    ['1 1/4 cups confectioners’ sugar', '1 1/4 cups [300 ml] confectioners’ sugar'],
    ['1 tb vanilla extract', '1 tb [15 ml] vanilla extract'],
    ['chopped into 1-inch chunks', 'chopped into 1-inch [2.5 cm] chunks'],
    ['2 1/2 tsp baking soda', '2 1/2 tsp [12 ml] baking soda'],
    ['8 oz cream cheese', '8 oz [225 g] cream cheese'],
    ['1 stick, plus 1 tb, unsalted butter', '1 stick [110 g], plus 1 tb [15 ml], unsalted butter'],
    ['8 ounces spaghetti (or other) pasta', '8 ounces [225 g] spaghetti (or other) pasta'],
    ['2 Tbsp olive oil', '2 Tbsp [30 ml] olive oil'],
    ['at least 4 quarts of water', 'at least 4 quarts [3.75 l] of water'],
    ['2 cups flour', '2 cups flour [250 g]'],
    ['2 cups dark brown sugar', '2 cups dark brown sugar [450 g]']
];

if (test) {
    var failed = 0;
    for (var i in tests) {
        var result = re.replace(tests[i][0], replaceUnits);
        if (result != tests[i][1]) {
            console.log('test failed: "%s" -> "%s" (not "%s")', tests[i][0], result, tests[i][1]);
            failed++;
        }
    }
    console.log('%d of %d tests passed', tests.length - failed, tests.length);
}

var textNodes = document.evaluate('//body//text()', document, null,
                                  XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

for (var i = 0; i < textNodes.snapshotLength; i++) {
    var node = textNodes.snapshotItem(i);
    var text = node.data;
    var newText = re.replace(text, replaceUnits);
    node.data = newText;
}
