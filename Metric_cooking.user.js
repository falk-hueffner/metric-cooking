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
var tbsp_ml = 14.8;
var tsp_ml = tbsp_ml/3;
// source: USDA National Nutrient Database for Standard Reference, Release 26
var ingredients = {
    'baking powder': [/baking powder/, 4.6/tsp_ml], // ~18369~
    'baking soda': [/(baking|bicarbonate of) soda/, 4.6/tsp_ml], // ~18372~
    'brown sugar': [/(dark )?brown sugar/, 220/cup_ml], // ~19334~ (packed)
    'butter': [/(unsalted )?butter/, 113/cup_ml], // ~01145~
    'cocoa': [/(unsweetened )?cocoa( powder)?/, 86/cup_ml], // ~19165~
    'dulce de leche': [/dulce de leche/, 19/tbsp_ml], // ~01225~
    'flour': [/flour/, 125/cup_ml], // ~20081~
    'light corn syrup': [/light corn syrup/, 341/cup_ml], // ~19350~
    'peanut butter': [/(smooth )?peanut butter/, 258/cup_ml], // ~16397~ (smooth), ~16398~ (chunky)
    'pine nuts': [/pine nuts/, 135/cup_ml], // ~12147~
    'powdered sugar': [/(powdered|confectioners['’]) sugar/, 120/cup_ml], // ~19336~ (unsifted)
    'salt': [/salt/, 292/cup_ml] // ~02047~
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
    'cup':        [/\b(cups?|C)\b/,   'ml', 236.5882365  ],
    'fahrenheit': [/°F/,              '°C', undefined    ],
    'inch':       [/\binch\b/,        'mm',  25.6        ],
    'ounce':      [/\b(oz|ounces?)\b/, 'g',   28.349523125],
    'pound':      [/\blb\b/,          'g',  453.59237    ],
    'quart':      [/\bquarts\b/,      'ml', 946.352946   ],
    'stick':      [/\bstick\b/,       'g', 4*28.349523125],
    'tablespoon': [/\b(T|tb|[Tt]bsp|tablespoons?)\b\.?/, 'ml',  14.8        ],
    'teaspoon':   [/\b(t|tsp|teaspoons?)\b\.?/,       'ml',  14.8/3      ]
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

var reReal      = /(<real>\d+(\.\d+)?)/.source;
var reFracChar  = /(<fracChar>[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/.source;
var reFraction  = '(<fraction>(<fracWhole>\\d+\\s+)?(((<fracNum>\\d+)/(<fracDen>\\d+))|' + reFracChar +'))';
var reNumber = '(<number>' + reReal + '|' + reFraction + ')';

function parseNumber(match) {
    var real = match.group('real');
    if (real)
        return parseFloat(real);

    var amount = 0;
    var fracWhole = match.group('fracWhole');
    if (fracWhole)
        amount += parseInt(fracWhole);
    var fracChar = match.group('fracChar');
    if (fracChar) {
        amount += {'½': 1/2,
                   '⅓': 1/3, '⅔': 2/3,
                   '¼': 1/4, '¾': 3/4,
                   '⅕': 1/5, '⅖': 2/5, '⅗': 3/5, '⅘': 4/5,
                   '⅙': 1/6, '⅚': 5/6,
                   '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8
                  }[fracChar];
    } else {
        var fracNum = match.group('fracNum');
        var fracDen = match.group('fracDen');
        amount += parseInt(fracNum) / parseInt(fracDen);
    }
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

var reAll = reNumber + '(\\s*|-)' + reUnit + '(\\s+' + reIngredient + ')?';
var re = namedGroupRegExp(reAll, 'g');

function convert(amount, unit) {
    var newUnit = units[unit][1];
    var newAmount;
    if (unit == 'fahrenheit')
        newAmount = (amount - 32) * (5/9);
    else
        newAmount = amount * units[unit][2];
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
    ['3/4 cup unsweetened cocoa', '3/4 cup unsweetened cocoa [65 g]'],
    ['1 1/4 cups confectioners’ sugar', '1 1/4 cups confectioners’ sugar [150 g]'],
    ['1 tb vanilla extract', '1 tb [15 ml] vanilla extract'],
    ['chopped into 1-inch chunks', 'chopped into 1-inch [2.5 cm] chunks'],
    ['2 1/2 tsp baking soda', '2 1/2 tsp baking soda [12 g]'],
    ['8 oz cream cheese', '8 oz [225 g] cream cheese'],
    ['1 stick, plus 1 tb, unsalted butter', '1 stick [110 g], plus 1 tb [15 ml], unsalted butter'],
    ['8 ounces spaghetti (or other) pasta', '8 ounces [225 g] spaghetti (or other) pasta'],
    ['2 Tbsp olive oil', '2 Tbsp [30 ml] olive oil'],
    ['at least 4 quarts of water', 'at least 4 quarts [3.75 l] of water'],
    ['2 cups flour', '2 cups flour [250 g]'],
    ['2 cups dark brown sugar', '2 cups dark brown sugar [450 g]'],
    ['1/4 cup pine nuts', '1/4 cup pine nuts [34 g]'],
    ['1 lb semi-sweet chocolate chips', '1 lb [450 g] semi-sweet chocolate chips'],
    ['1/2 C butter', '1/2 C butter [55 g]'],
    ['1 t vanilla, almond, coconut, or orange extract', '1 t [5 ml] vanilla, almond, coconut, or orange extract'],
    ['about 6 T unpopped', 'about 6 T [90 ml] unpopped'],
    ['2 T cocoa powder', '2 T cocoa powder [11 g]'],
    ['2/3 C smooth peanut butter', '2/3 C smooth peanut butter [175 g]'],
    ['3 tablespoons unsalted butter, melted', '3 tablespoons unsalted butter [21 g], melted'],
    ['1 teaspoon unflavored gelatin', '1 teaspoon [5 ml] unflavored gelatin'],
    ['from a 1/4-ounce envelope', 'from a 1/4-ounce [7 g] envelope'],
    ['3/8 teaspoon salt', '3/8 teaspoon salt [2 g]'],
    ['1 cup dulce de leche', '1 cup dulce de leche [300 g]'],
    ['2 teaspoons light corn syrup', '2 teaspoons light corn syrup [14 g]'],
    ['preheat oven to 325°F.', 'preheat oven to 325°F [160 °C].'],
    ['1 tsp bicarbonate of soda', '1 tsp bicarbonate of soda [5 g]'],
    ['2 tsp baking powder', '2 tsp baking powder [9 g]'],
    ['½ tsp salt', '½ tsp salt [3 g]'],
    ['1 tbsp vanilla extract', '1 tbsp [15 ml] vanilla extract'],
    ['4 tbsp. Dijon mustard', '4 tbsp. [60 ml] Dijon mustard']
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
