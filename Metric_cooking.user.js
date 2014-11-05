// ==UserScript==
// @name        Metric cooking
// @namespace   https://github.com/falk-hueffner
// @description Annotates US cooking units with their metric equivalent.
// @include     http://*
// @include     https://*
// @include     file://*
// @exclude     http://*google.tld/*
// @exclude     https://*google.tld/*
// @version     1
// @grant       none
// ==/UserScript==

/* Copyright (C) 2013, 2014  Falk Hüffner

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


var dangerous    = true;
var maxError     = 0.03;
var numUnitSpace = '\u202F';    // thin space
var test         = true;

var cup_ml  = 236.5882365;
var tbsp_ml = 14.78676478125;
var tsp_ml  = tbsp_ml/3;
var pound_g = 453.59237;
var pound_per_ft3 = 0.0160184634; // in g/ml

// sources:
// USDA National Nutrient Database for Standard Reference, Release 26
// FAO/INFOODS Density Database Version 2.0 (2012)
var ingredients = {
    'blueberries': [/\bblueberries/, 148/cup_ml], // ~09050~
    'strawberries': [/\b(fresh |medium-sized )*strawberries/, 144/cup_ml], // ~09316~
    'raspberries': [/\b(fresh )*raspberries/, 0.66], // ~09302~ says 123g/cup, that seems too low. Use Wolfram Alpha
    'dried apricots': [/\bdried apricots/, 130/cup_ml], // ~09032~
    'almonds': [/\b(blanched |raw |peeled )*almonds/, 144/cup_ml], // average of ~12061~ (143) and ~12062~ (145)
    'arugula': [/\barugula( leaves)?/, 10.0/(0.5*cup_ml)], // ~11959~
    'asparagus': [/\basparagus/, 134/cup_ml], // ~11011~
    'baking powder': [/\bbaking powder/, 4.6/tsp_ml], // ~18369~
    'baking soda': [/\b(baking|bicarbonate of) soda/, 4.6/tsp_ml], // ~18372~
    'blackberries': [/\bblackberries/, 144/cup_ml], // ~09042~
    'brown sugar': [/(\blight[ -]|\bdark[- ]|golden |firmly |\(?packed\)? )*brown sugar/, 220/cup_ml], // ~19334~ (packed)
    'butter': [/\b((un)?salted |chilled |cold |softened )*butter/, 227/cup_ml], // ~01145~
    'cake flour': [/\b(sifted |unbleached )*(cake|pastry) flour/, 114/cup_ml], // the internet
    'canned chickpeas': [/\bcanned chickpeas/, 152/cup_ml], // ~16359~
    'cheddar': [/(coarsely |grated |shredded |aged |white |sharp )*[Cc]heddar/, 113/cup_ml], // ~01009~
    'cherries': [/\b([Pp]itted |frozen |whole |fresh |Bing )*[Cc]herries/, 154.5/cup_ml], // ~09063~ & ~09070~ / ~09068~ & ~09076~
    'cherry tomatoes': [/(halved |cherry |grape |or |assorted )*(cherry|grape) tomatoes/, 149/cup_ml], // ~11529~
    'chocolate chips': [/(semi-sweet |dark |milk |semi- |or |bittersweet )*chocolate chips/, 0.71], // Wolfram Alpha
    'chopped parsley': [/(chopped |minced |fresh |Italian |flat-leaf )*parsley( leaves)?/, 60/cup_ml], // ~11297~
    'chopped shallots': [/(finely |chopped )*shallots/, 10.0/tbsp_ml], // ~11677~
    'cocoa nibs': [/cocoa nibs/, 35*pound_per_ft3], // http://www.sawyerhanson.com/uploads/Brabender%20Ingredient%20bulk%20density%20table.pdf
    'cocoa': [/\b(unsweetened |Dutch[- ]process(ed)? |natural )*cocoa( powder)?(?! nibs)/, 86/cup_ml], // ~19165~
    'cornmeal': [/\b(yellow )?(cornmeal|polenta)/, 157/cup_ml], // ~20022~
    'cornstarch': [/\b(corn ?starch|starch\s+powder|cornflour)/, 128/cup_ml], // ~20027~
    'cottage cheese': [/\b(low-fat )?cottage cheese/, 225/cup_ml], // ~01012~ (small curd, not packed)
    'cranberries': [/\b(fresh |of |or |thawed |frozen )*cranberries/, 100/cup_ml], // ~09078~
    'cream cheese': [/cream cheese/, 232/cup_ml], // ~01017~
    'cream': [/\b(heavy |whipping |or |double )*cream/, 238.5/cup_ml], // ~01053~ & ~01052~
    'creme fraiche': [/(cr[eè]me fra[iî]che|(Mexican )?crema)/, 0.978], // FAO, 38%
    'crumbled blue cheese': [/\bcrumbled blue cheese/, 135/cup_ml], // ~01004~
    'dark corn syrup': [/\bdark corn syrup/, 328/cup_ml], // ~19349~
    'dried cherries': [/\b(pitted )?dried cherries/, 40/(0.25*cup_ml)], // ~09044~
    'dulce de leche': [/\bdulce de leche/, 19/tbsp_ml], // ~01225~
    'farro': [/\bfarro/, 0.82], // Wolfram Alpha
    'feta': [/\b(crumbled |low[ -]fat )*[Ff]eta( cheese)?/, 150/cup_ml], // ~01019~
    'flour': [/\b(all[- ]purpose |sifted |unbleached |white )*flour/, 125/cup_ml], // ~20081~
    'hazelnuts': [/\bhazelnuts/, 135/cup_ml], // ~12120~ (whole)
    'honey': [/\bhoney/, 339/cup_ml], // ~19296~
    'israeli couscous': [/\b(\(?Israeli\)? |pearl(ed)? |or )*(\(?Israeli\)? |pearl(ed)? )+cous ?cous/, 50/(cup_ml/3)], // http://www.fatsecret.com/calories-nutrition/osem/israeli-couscous
    'kosher salt': [/kosher salt/, 0.57], // Wolfram Alpha
    'lentils': [/\b(brown |or |green )*lentils/, 192/cup_ml], // ~16069~
    'light corn syrup': [/\b(light )?corn syrup/, 341/cup_ml], // ~19350~
    'long-grain rice': [/\b(long[- ]grain(ed)? |[Bb]asmati |[Jj]asmine |brown |white |uncooked )*rice(?! vinegar| crispies| flour| wine)/, 185/cup_ml], // ~20444~, ~20036~ (brown)
    'maple syrup': [/\b(pure )?maple syrup/, 80/60], // ~19911~
    'marmalade': [/\b(orange )?marmalade/, 320/cup_ml], // ~19303~
    'mayonnaise': [/\bmayonnaise/, 220/cup_ml], // ~04025~
    'mint': [/\bmint( leaves)?/, 3.2/(2*tbsp_ml)], // ~02064~
    'mustard': [/\b([Dd]ijon |grainy |yellow )*mustard/, 249/cup_ml], // ~02046~
    'nutella': [/\bNutella/, 1.2], // Wolfram Alpha
    'onions, chopped': [/\b(chopped onions?)|(onions?, chopped)/, 160/cup_ml], // ~11282~
    'orzo': [/\b(whole[- ]wheat )?orzo/, 225/cup_ml], // estimate from various sources
    'parmesan': [/\b(finely |freshly |grated |shredded |fresh )*([Pp]armesan|[Pp]armigiano[ -][Rr]eggiano|[Rr]omano)(\s+cheese)?/, 100/cup_ml], // ~01032~ (grated), ~01146~ (shredded)
    'pastry flour': [/\b(whole |wheat )*pastry flour/, 0.51], // Wolfram Alpha
    'peanut butter': [/\b(smooth |natural |creamy |chunky )?peanut butter/, 258/cup_ml], // ~16397~ (smooth), ~16398~ (chunky)
    'peanuts': [/\bpeanuts/, 146/cup_ml], // ~16087~
    'pecans': [/\bpecans?( halves)?/, 99/cup_ml], // ~12142~ (halves)
    'pine nuts': [/\bpine ?nuts/, 135/cup_ml], // ~12147~
    'pistachio': [/\bpistachio(s|\s+nuts)/, 123/cup_ml], // ~12151~ (raw)
    'powdered sugar': [/\b(powdered|confectioners['’]?|icing) sugar/, 120/cup_ml], // ~19336~ (unsifted)
    'quinoa': [/\b(dry |pre-washed |or |rinsed |whole[- ]grain |organic )*quinoa/, 170/cup_ml], // ~20035~
    'raisins': [/\b(golden )?raisins/, 165/cup_ml], // ~09298~ (packed)
    'ricotta': [/\b(fresh )?ricotta( cheese)?/, 246/cup_ml], // ~01036~
    'salt': [/\b(table )?salt/, 292/cup_ml], // ~02047~
    'short-grain rice': [/\b(short[- ]grain(ed)? |[Aa]rborio |[Bb]omba |[Cc]alasparra )+(brown |[Bb]omba |or |[Cc]alasparra )*rice(?! vinegar| crispies| flour)/, 200/cup_ml], // ~20052~
    'shredded mozzarella': [/\b(shredded |part-skim )*mozzarella( cheese)?/, 112/cup_ml], // ~01026~
    'sliced almonds': [/\bsliced (and toasted )?almonds/, 92/cup_ml], // ~12061~
    'sour cream': [/\bsour cream/, 230/cup_ml], // ~01056~
    'spinach': [/\b(fresh )?spinach/, 30/cup_ml], // ~11457~ (raw)
    'sugar': [/\b(granulated |white )*sugar/, 200/cup_ml], // ~19335~
    'sun-dried tomatoes': [/\bsun-dried tomatoes/, 54/cup_ml], // ~11955~
    'superfine sugar': [/\b(golden )?(superfine|cast[eo]r) sugar/, 0.81], // Wolfram Alpha
    'swiss cheese': [/\b(grated |shredded )*Swiss cheese/, 108/cup_ml], // ~01040~
    'tomato paste': [/\b(double-concentrated )?tomato paste/, 262/cup_ml], // ~11546~
    'wild rice': [/\bwild rice/, 160/cup_ml], // ~20088~
    'yogurt': [/\b(plain |low-fat |vanilla |\d% |Greek |full-fat )*yogurt/, 245/cup_ml] // ~01116~
};

// wares labeled in dry pints
var dry_ingredients = [
    'blackberries',
    'blueberries',
    'cherries',
    'cherry tomatoes',
    'cranberries',
    'raspberries',
    'strawberries'
];

var reIngredient = '';
for (var ingredient in ingredients) {
    if (reIngredient)
        reIngredient += '|';
    else
        reIngredient = '(<ingredient>';
    reIngredient += '(<' + ingredient + '>' + ingredients[ingredient][0].source + '\\b)';
}
reIngredient += ')';

function round(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var fs = [100000, 50000, 25000, 10000, 5000, 2500, 1000, 500, 250, 100, 50, 25, 10, 5, 1];
    var newx;
    for (var f in fs) {
        newx = Math.round(x / fs[f]) * fs[f];
        var error = Math.abs(x - newx);
        if (error / x < maxError)
            return sign * newx;
    }
    return sign * newx;
}

// Python-like named groups: (<name>...)
function namedGroupRegExp(regexp, modifiers) {
    var groupNumber = {};
    var i = 1;
    var re = new RegExp(regexp.replace(/\((?![?\]])(<([^>]+)>)?/g,
                                       function (_, __, name) {
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

function prefixGroups (regexp, prefix) {
    return regexp.replace(/\(<([^>]+)>/g, '(<' + prefix + ':$1' + '>');
}

var logReplacement = false;

var fahrenheit = dangerous
        ? /(([°º˚*]|degrees?\b)\s*(?! ?C\b)(F\b|[(]F[)]|Fahrenheit\b)?)|F(ahrenheit)?\b/
        :  /([°º˚]|degrees?\b)\s*(F\b|[(]F[)]|Fahrenheit\b)/;
var inches = dangerous
        ? /(inch(es)?\b|[”″"](?!\w))/
        : /inch(es)?\b/;

var units = {
    'cup':        [/(cups?)\b/,                                  'ml', cup_ml      ],
    'fahrenheit': [fahrenheit,                                   '°C', undefined   ],
    'fl oz':      [/fl\.? oz\.?/,                                'ml', 2 * tbsp_ml ],
    'inch':       [inches,                                       'mm', 25.6        ],
    'ounce':      [/ounces?\b|oz\b\.?/,                          'g' , pound_g / 16],
    'pint':       [/pints?\b/,                                   'ml', 2 * cup_ml  ], // US liquid pint
    'dry pint':   [/dry pints?\b/,                               'ml', 550.6104713575 ], // US dry pint (berries etc.)
    'pound':      [/pounds?\b|lbs?\b\.?/,                        'g' , pound_g     ],
    'quart':      [/quarts?\b|qt\b\.?/,                          'ml', 4 * cup_ml  ],
    'stick':      [/sticks?\b(?!\s+cinnamon)/,                   'g' , pound_g / 4 ],
    'tablespoon': [/[Tt]ablespoons?\b|(T|tb|[Tt]bsp?|TBL|TBSP)\b\.?/, 'ml', tbsp_ml     ],
    'teaspoon':   [/[Tt]easpoons?\b|(t|tsp|TSP)\b\.?/,           'ml', tbsp_ml / 3 ]
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

var numWords = {
    'quarter'      : [/([Oo]ne[- ])?[Qq]uarter( of an?)?/,     1/4],
    'threequarter' : [/([Tt]hree[- ])[Qq]quarters?( of an?)?/, 3/4],
    'third'        : [/([Oo]ne[- ])?[Tt]hird( of an?)?/,       1/3],
    'twothirds'    : [/([Tt]wo[- ])[Tt]hirds?( of an?)?/,      2/3],
    'half'         : [/([Oo]ne[- ])?[Hh]alf|[Hh]alf an?/,      1/2],
    'one'          : [/[Aa]|[Aa]n|[Oo]ne(?![- ]([Hh]alf|[Tt]hird|[Qq]uarter))/, 1],
    'two'          : [/[Tt]wo/,              2],
    'three'        : [/[Tt]hree/,            3],
    'four'         : [/[Ff]our/,             4],
    'five'         : [/[Ff]ive/,             5],
    'six'          : [/[Ss]ix/,              6],
    'seven'        : [/[Ss]even/,            7],
    'eight'        : [/[Ee]ight/,            8],
    'nine'         : [/[Nn]ine/,             9],
    'ten'          : [/[Tt]en/,             10],
    'eleven'       : [/[Ee]leven/,          11],
    'twelve'       : [/[Tt]welve|[Dd]ozen/, 12]
};
var reNumWord   = '';
for (var numWord in numWords) {
    if (reNumWord)
        reNumWord += '|';
    else
        reNumWord   = '(<numWord>';
    reNumWord += '(<' + numWord + '>\\b(' + numWords[numWord][0].source + ')\\b)';
}
reNumWord += ')';

var reReal      = /(<real>\d+(\.\d+)?)/.source;
var reFracChar  = /(<fracChar>[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/.source;
var reFraction  = '(<fraction>(<fracWhole>\\d+(\\s*|-))?(((<fracNum>\\d+)[/⁄∕](<fracDen>\\d+)((th)? of an?)?)|' + reFracChar +'))';
var reNumber = '(<number>' + reNumWord + '|' + reReal + '|' + reFraction + ')';

function parseNumber(match, prefix) {
    prefix = prefix || '';
    var real = match.group(prefix + 'real');
    if (real)
        return parseFloat(real);

    var numWord = match.group(prefix + 'numWord');
    if (numWord) {
        for (var w in numWords)
            if (match.group(prefix + w))
                return numWords[w][1];
        return undefined;
    }

    var amount = 0;
    var fracWhole = match.group(prefix + 'fracWhole');
    if (fracWhole)
        amount += parseInt(fracWhole);
    var fracChar = match.group(prefix + 'fracChar');
    if (fracChar) {
        amount += {'½': 1/2,
                   '⅓': 1/3, '⅔': 2/3,
                   '¼': 1/4, '¾': 3/4,
                   '⅕': 1/5, '⅖': 2/5, '⅗': 3/5, '⅘': 4/5,
                   '⅙': 1/6, '⅚': 5/6,
                   '⅛': 1/8, '⅜': 3/8, '⅝': 5/8, '⅞': 7/8
                  }[fracChar];
    } else {
        var fracNum = match.group(prefix + 'fracNum');
        var fracDen = match.group(prefix + 'fracDen');
        amount += parseInt(fracNum) / parseInt(fracDen);
    }
    return amount;
}

function parseUnit(match, prefix) {
    prefix = prefix || '';
    for (var u in units)
        if (match.group(prefix + u))
            return u;
    return undefined;
}

function parseIngredient(match) {
    for (var i in ingredients)
        if (match.group(i))
            return i;
}

var reFrom = '(<from>'
        + '(<between>between\\s+)?'
        + prefixGroups(reNumber, 'from') + '-?\\s*'
        + '(('
        + prefixGroups(reUnit, 'from')
        + '\\s*((<range1>-|–|to|or)|(<plus1>plus|\\+|and|\\s+))\\s*)'
        + '|'
        + '(\\s*((<range2>-|–|to|or)|(<plus2>plus|\\+|and))\\s*)'
        + '))';

var reBy = '(<by>'
        + prefixGroups(reNumber, 'by1') + '[”"″]?-?\\s*(×|x|by)-?\\s*'
        + prefixGroups(reNumber, 'by2') + '[”"″]?-?(\\s*(×|x|by)-?\\s*'
        + prefixGroups(reNumber, 'by3') + ')?([”"″]|[ -]?inch(es)?)'
        + (dangerous ? "?" : "")
        + ')';

var reAll =
        reBy + '|('
        + reFrom + '?(<main>'
        + reNumber + '(\\s*|-)'
        + reUnit + '(\\s+(of(\\s+the)?\\s+)?'
        + reIngredient + ')?))';
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
    } else if (unit == 'g' && amount >= 1000) {
        unit = 'kg';
        amount /= 1000;
    }
    return {amount: amount, unit: unit};
}

function replaceUnits(match) {
    var newText = match[0];

    // avoid false positives with e.g. 'a t-shirt'
    if (match.group('numWord') && match.group('unit').match(/^["tT]$/))
        return newText;

    if (match.group('by')) {
        var by1 = round(convert(parseNumber(match, 'by1:'), 'inch').amount) / 10;
        var by2 = round(convert(parseNumber(match, 'by2:'), 'inch').amount) / 10;
        var by3 = round(convert(parseNumber(match, 'by3:'), 'inch').amount) / 10;

        newText += ' [' + by1 + '×' + by2;
        if (by3)
            newText += '×' + by3;
        return newText + numUnitSpace + 'cm]';
    }

    var unit = parseUnit(match);
    if (unit == 'pint') {
        for (var i in dry_ingredients) {
            if (match.group(dry_ingredients[i])) {
                unit = 'dry pint';
                break;
            }
        }
    }
    var converted = convert(parseNumber(match), unit);
    var newAmount = converted.amount;
    var newUnit = converted.unit;

    var fromAmount;
    if (match.group('from')) {
        var fromUnit = match.group('from:unit') ? parseUnit(match, 'from:') : unit;
        converted = convert(parseNumber(match, 'from:'), fromUnit);
        if (converted.unit != newUnit)
            return re.replace(match.group('from'), replaceUnits)
                +  re.replace(match.group('main'), replaceUnits);
        if (match.group('between') || match.group('range1') || match.group('range2')) {
            fromAmount = converted.amount;
            if (parseNumber(match, 'from:') >= 1 && parseNumber(match) < 1) { // "1-1/2"
                newAmount += fromAmount;
                fromAmount = undefined;
            }
        } else {
            if (!match.group('from:numWord')) // 'from a 1/4-ounce envelope'
                newAmount += converted.amount;
        }
    }

    if (match.group('ingredient')) {
        var ingredient = parseIngredient(match);
        if (newUnit == 'ml') {
            newAmount = newAmount * ingredients[ingredient][1];
            newUnit = 'g';
            if (fromAmount)
                fromAmount = fromAmount * ingredients[ingredient][1];
        }
    }

    if ((newUnit == 'ml' || newUnit == 'g') && newAmount < 4)
        return newText;

    newAmount = round(newAmount);

    if (fromAmount) {
        fromAmount = round(fromAmount);
        var scaled = scale(fromAmount, newUnit);
        if (scaled.unit != newUnit) {
            fromAmount = scaled.amount;
            scaled = scale(newAmount, newUnit);
            newAmount = scaled.amount;
            newUnit   = scaled.unit;
        }
    } else {
        scaled = scale(newAmount, newUnit);
        newAmount = scaled.amount;
        newUnit   = scaled.unit;
    }

    if (fromAmount == newAmount)
        fromAmount = undefined;

    newText += ' [';
    if (fromAmount)
        newText += fromAmount + '–';
    newText += newAmount + numUnitSpace + newUnit + ']';
    
    return newText;
}

var tests = [
    ['1 cup Guinness', '1 cup [240 ml] Guinness'],
    ['3/4 cup unsweetened cocoa', '3/4 cup unsweetened cocoa [65 g]'],
    ['1 1/4 cups confectioners’ sugar', '1 1/4 cups confectioners’ sugar [150 g]'],
    ['1 tb vanilla extract', '1 tb [15 ml] vanilla extract'],
    ['chopped into 1-inch chunks', 'chopped into 1-inch [2.5 cm] chunks'],
    ['2 1/2 tsp baking soda', '2 1/2 tsp baking soda [11 g]'],
    ['8 oz cream cheese', '8 oz cream cheese [225 g]'],
    ['1 stick, plus 1 tb, unsalted butter', '1 stick [110 g], plus 1 tb [15 ml], unsalted butter'],
    ['8 ounces spaghetti (or other) pasta', '8 ounces [225 g] spaghetti (or other) pasta'],
    ['2 Tbsp olive oil', '2 Tbsp [30 ml] olive oil'],
    ['at least 4 quarts of water', 'at least 4 quarts [3.75 l] of water'],
    ['2 cups flour', '2 cups flour [250 g]'],
    ['2 cups dark brown sugar', '2 cups dark brown sugar [450 g]'],
    ['1/4 cup pine nuts', '1/4 cup pine nuts [34 g]'],
    ['1 lb semi-sweet chocolate chips', '1 lb semi-sweet chocolate chips [450 g]'],
    // false positives with C meaning °C
    // ['1/2 C butter', '1/2 C butter [55 g]'],
    ['1 t vanilla, almond, coconut, or orange extract', '1 t [5 ml] vanilla, almond, coconut, or orange extract'],
    ['about 6 T unpopped', 'about 6 T [90 ml] unpopped'],
    ['2 T cocoa powder', '2 T cocoa powder [11 g]'],
    ['2/3 cup smooth peanut butter', '2/3 cup smooth peanut butter [175 g]'],
    ['3 tablespoons unsalted butter, melted', '3 tablespoons unsalted butter [43 g], melted'],
    ['1 teaspoon unflavored gelatin', '1 teaspoon [5 ml] unflavored gelatin'],
    ['from a 1/4-ounce envelope', 'from a 1/4-ounce [7 g] envelope'],
    ['3/8 tablespoon salt', '3/8 tablespoon salt [7 g]'],
    ['1 cup dulce de leche', '1 cup dulce de leche [300 g]'],
    ['2 teaspoons light corn syrup', '2 teaspoons light corn syrup [14 g]'],
    ['preheat oven to 325°F.', 'preheat oven to 325°F [160 °C].'],
    ['1 tsp bicarbonate of soda', '1 tsp bicarbonate of soda [5 g]'],
    ['2 tsp baking powder', '2 tsp baking powder [9 g]'],
    ['½ tbsp salt', '½ tbsp salt [9 g]'],
    ['1 tbsp vanilla extract', '1 tbsp [15 ml] vanilla extract'],
    ['4 tbsp. Dijon mustard', '4 tbsp. Dijon mustard [62 g]'],
    ['3/4 pound pasta', '3/4 pound [350 g] pasta'],
    ['Preheat oven to 350 degrees F with rack in middle.', 'Preheat oven to 350 degrees F [175 °C] with rack in middle.'],
    ['2 cups all-purpose flour', '2 cups all-purpose flour [250 g]'],
    ['1 3/4 cups sugar', '1 3/4 cups sugar [350 g]'],
    ['2 cups sifted cake flour', '2 cups sifted cake flour [225 g]'],
    ['10 Tbs unsalted butter, at room temperature' ,'10 Tbs unsalted butter [140 g], at room temperature'],
    ['if using unsalted, add 1/2 tbsp of salt', 'if using unsalted, add 1/2 tbsp of salt [9 g]'],
    ['1/2 cup packed light brown sugar', '1/2 cup packed light brown sugar [110 g]'],
    ['1/2 cup packed dark brown sugar', '1/2 cup packed dark brown sugar [110 g]'],
    ['2 cups confectioners sugar, must be sifted!', '2 cups confectioners sugar [240 g], must be sifted!'],
    ['Preheat the oven to 350 degrees Fahrenheit.', 'Preheat the oven to 350 degrees Fahrenheit [175 °C].'],
    ['2 cups all purpose flour', '2 cups all purpose flour [250 g]'],
    ['1/4 teaspoon black pepper', '1/4 teaspoon black pepper'],
    ['2 tablespoons finely grated parmesan', '2 tablespoons finely grated parmesan [13 g]'],
    ['1 1/2sticks chilled unsalted butter', '1 1/2sticks chilled unsalted butter [175 g]'],
    ['spacing 2 inches apart', 'spacing 2 inches [5 cm] apart'],
    ['4 tablespoons salted butter', '4 tablespoons salted butter [57 g]'],
    ['1 1/3 cups ricotta', '1 1/3 cups ricotta [325 g]'],
    ['2 tablespoons of the butter', '2 tablespoons of the butter [28 g]'],
    ['1/4 cup shredded Parmesan cheese', '1/4 cup shredded Parmesan cheese [25 g]'],
    ['1/2 pound fresh ricotta', '1/2 pound fresh ricotta [225 g]'],
    ['64 ounces chicken broth', '64 ounces [1.8 kg] chicken broth'],
    ['2 cups low-fat cottage cheese', '2 cups low-fat cottage cheese [450 g]'],
    ['8 3/4 oz. sugar', '8 3/4 oz. sugar [250 g]'],
    ['2 tablespoons cold butter', '2 tablespoons cold butter [28 g]'],
    ['Heat oil in a 5- to 6-quart heavy pot', 'Heat oil in a 5- to 6-quart [4.75–5.75 l] heavy pot'],
    ['1 3/4 cups (packed) brown sugar', '1 3/4 cups (packed) brown sugar [375 g]'],
    ['1 cup plain yogurt', '1 cup plain yogurt [250 g]'],
    ['1 1/2 cups Arborio rice', '1 1/2 cups Arborio rice [300 g]'],
    ['1 cup freshly grated Parmesan', '1 cup freshly grated Parmesan [100 g]'],
    ['2 or 3 cups broccoli florets', '2 or 3 cups [475–700 ml] broccoli florets'],
    ['add 3-4 tablespoons flour', 'add 3-4 tablespoons flour [23–31 g]'],
    ['1-2 Tbs white distilled vinegar', '1-2 Tbs [15–30 ml] white distilled vinegar'],
    ['1 chicken (2 1/2 to 3 pounds), cut into 8 pieces', '1 chicken (2 1/2 to 3 pounds [1.1–1.4 kg]), cut into 8 pieces'],
    ['with sides about 2 1/2 to 3 inches high', 'with sides about 2 1/2 to 3 inches [6.5–7.5 cm] high'],
    ['in a 10- to 12-inch ovenproof heavy skillet', 'in a 10- to 12-inch [25–30 cm] ovenproof heavy skillet'],
    ['Makes about twelve 3- to 4-inch pancakes', 'Makes about twelve 3- to 4-inch [7.5–10 cm] pancakes'],
    ['boil in a 1- to 1 1/2-quart heavy saucepan', 'boil in a 1- to 1 1/2-quart [950–1400 ml] heavy saucepan'],
    ['1 (14- to 19-ounce) can chickpeas', '1 (14- to 19-ounce [400–550 g]) can chickpeas'],
    ['torn into 1/4- to 1/2-inch pieces', 'torn into 1/4- to 1/2-inch [6–13 mm] pieces'],
    ['scrubbed and cut into 1/2-inch to 3/4-inch cubes', 'scrubbed and cut into 1/2-inch to 3/4-inch [1.3–1.9 cm] cubes'],
    ['1/4 cup corn syrup', '1/4 cup corn syrup [85 g]'],
    ['1 pint cherry tomatoes', '1 pint cherry tomatoes [350 g]'],
    ['Preheat oven to 450° F.', 'Preheat oven to 450° F [230 °C].'],
    ['1 cup mayonnaise', '1 cup mayonnaise [225 g]'],
    ['1/2 cup low-fat yogurt (preferably Greek)', '1/2 cup low-fat yogurt [125 g] (preferably Greek)'],
    ['6 Tablespoons rice vinegar', '6 Tablespoons [90 ml] rice vinegar'],
    ['1/4 cup parmigiano reggiano (grated)', '1/4 cup parmigiano reggiano [25 g] (grated)'],
    ['1 cup asparagus (cleaned)', '1 cup asparagus [130 g] (cleaned)'],
    ['1/4 cup spinach (optional)', '1/4 cup spinach [8 g] (optional)'],
    ['2 tablespoons pistachios (toasted)', '2 tablespoons pistachios [15 g] (toasted)'],
    ['2 TBL unsweetened cocoa powder', '2 TBL unsweetened cocoa powder [11 g]'],
    ['1 TSP lemon juice', '1 TSP [5 ml] lemon juice'],
    ['1/3 cup cornstarch', '1/3 cup cornstarch [43 g]'],
    ['½ cup orange marmalade', '½ cup orange marmalade [160 g]'],
    ['1 lb. lentils – regular or De Puy variety', '1 lb. lentils [450 g] – regular or De Puy variety'],
    ['3 cups canned chickpeas, divided', '3 cups canned chickpeas [450 g], divided'],
    ['2 tablespoons tomato paste', '2 tablespoons tomato paste [33 g]'],
    ['3 cups short-grain brown rice', '3 cups short-grain brown rice [600 g]'],
    ['make certain your freezer is set to 0°F.', 'make certain your freezer is set to 0°F [-18 °C].'],
    ['3/4 cup granulated sugar', '3/4 cup granulated sugar [150 g]'],
    ['2 Tbs. Dutch-processed cocoa powder', '2 Tbs. Dutch-processed cocoa powder [11 g]'],
    ['1 cup basmati rice', '1 cup basmati rice [190 g]'],
    ['1 1/2 cups unbleached all-purpose flour', '1 1/2 cups unbleached all-purpose flour [190 g]'],
    ['3/4 cup plus 2 tablespoons packed light-brown sugar', '3/4 cup plus 2 tablespoons packed light-brown sugar [190 g]'],
    ['1 cup blackberries', '1 cup blackberries [140 g]'],
    ['Dump in 1/2 cup crumbled blue cheese', 'Dump in 1/2 cup crumbled blue cheese [68 g]'],
    ['3/4 cup unsweetened Dutch process cocoa powder', '3/4 cup unsweetened Dutch process cocoa powder [65 g]'],
    ['1/4 cup firmly packed light brown sugar', '1/4 cup firmly packed light brown sugar [55 g]'],
    ['1/2 cup sun-dried tomatoes', '1/2 cup sun-dried tomatoes [27 g]'],
    ['2 cups long grain rice', '2 cups long grain rice [375 g]'],
    ['3/4 cup pecans, toasted', '3/4 cup pecans [75 g], toasted'],
    ['1/3 cup shredded mozzarella cheese', '1/3 cup shredded mozzarella cheese [37 g]'],
    ['1/4 cup of honey', '1/4 cup of honey [85 g]'],
    ['1/2 cup raisins', '1/2 cup raisins [83 g]'],
    ['2 teaspoons kosher salt or 1 teaspoon table salt', '2 teaspoons kosher salt [6 g] or 1 teaspoon table salt [6 g]'],
    ['1 cup long-grain white rice', '1 cup long-grain white rice [190 g]'],
    ['Add 1/3 cup finely chopped shallots to the saucepan.', 'Add 1/3 cup finely chopped shallots [53 g] to the saucepan.'],
    ['1/4 cup minced fresh Italian parsley', '1/4 cup minced fresh Italian parsley [15 g]'],
    ['1 1/4 cups aged white cheddar', '1 1/4 cups aged white cheddar [140 g]'],
    ['2/3 cup freshly grated Parmigiano-Reggiano', '2/3 cup freshly grated Parmigiano-Reggiano [65 g]'],
    ['2 tablespoons minced fresh flat-leaf parsley leaves', '2 tablespoons minced fresh flat-leaf parsley leaves [8 g]'],
    ['1 Tablespoon cream cheese, at room temperature', '1 Tablespoon cream cheese [15 g], at room temperature'],
    ['3/4 cup grated Swiss cheese', '3/4 cup grated Swiss cheese [80 g]'],
    ['2 cups ricotta cheese', '2 cups ricotta cheese [500 g]'],
    ['1-1/2 to 2 cups freshly grated Romano cheese', '1-1/2 to 2 cups freshly grated Romano cheese [150–200 g]'],
    ['Begin the assembly by preheating the oven to 375ºF', 'Begin the assembly by preheating the oven to 375ºF [190 °C]'],
    ['1 1/2 cups icing sugar', '1 1/2 cups icing sugar [175 g]'],
    ['1 cup brown rice', '1 cup brown rice [190 g]'],
    ['- 3 Tbsp pinenuts', '- 3 Tbsp pinenuts [25 g]'],
    ['combine 2 tablespoons softened butter', 'combine 2 tablespoons softened butter [28 g]'],
    ['2/3 cup feta cheese', '2/3 cup feta cheese [100 g]'],
    ['1 3- to 4-ounce wedge blue cheese', '1 3- to 4-ounce [85–110 g] wedge blue cheese'],
    ['¾ cup wild rice', '¾ cup wild rice [120 g]'],
    ['1 cup onions, chopped', '1 cup onions, chopped [160 g]'],
    ['1.5 cups arborio rice', '1.5 cups arborio rice [300 g]'],
    ['1/2 – 1 lb linguine', '1/2 – 1 lb [225–450 g] linguine'],
    ['½ stick cinnamon', '½ stick cinnamon'],
    ['1 1/4 cups jasmine rice', '1 1/4 cups jasmine rice [225 g]'],
    ['1 cup lentils', '1 cup lentils [190 g]'],
    ['1 cup (packed) golden brown sugar', '1 cup (packed) golden brown sugar [225 g]'],
    ['1½ pounds sweet potatoes (1lb 11oz)', '1½ pounds [700 g] sweet potatoes (1lb 11oz [750 g])'],
    ['¼ cup pure maple syrup','¼ cup pure maple syrup [80 g]'],
    ['1 1/2 cups raw almonds', '1 1/2 cups raw almonds [220 g]'],
    ['1/2 cup of low-fat feta cheese', '1/2 cup of low-fat feta cheese [75 g]'],
    ['1/4 cup natural peanut butter',  '1/4 cup natural peanut butter [65 g]'],
    ['1 1/2 cups to 2 cups fresh or frozen cranberries','1 1/2 cups to 2 cups fresh or frozen cranberries [150–200 g]'],
    ['1/2 cup white sugar', '1/2 cup white sugar [100 g]'],
    ['1/2 cup pecan halves',  '1/2 cup pecan halves [50 g]'],
    ['6 tablespoons or 3 ounces cold unsalted butter', '6 tablespoons [90 ml] or 3 ounces cold unsalted butter [85 g]'],
    ['½ cup creamy peanut butter', '½ cup creamy peanut butter [130 g]'],
    ['3 tablespoons shredded part-skim mozzarella cheese', '3 tablespoons shredded part-skim mozzarella cheese [21 g]'],
    ['1 cup (2 sticks or 8 ounces) butter', '1 cup [240 ml] (2 sticks or 8 ounces [225 g]) butter'],
    ['3 cups unbleached pastry flour', '3 cups unbleached pastry flour [350 g]'],
    ['About one cup', 'About one cup [240 ml]'],
    ['Heat the olive oil in a four-quart pot', 'Heat the olive oil in a four-quart [3.75 l] pot'],
    ['Caramelize a nine-inch round or tube pan', 'Caramelize a nine-inch [22.5 cm] round or tube pan'],
    ['add a tablespoon of heavy cream and stir', 'add a tablespoon of heavy cream [15 g] and stir'],
    ['a little less than a cup', 'a little less than a cup [240 ml]'],
    ['Divide the mixture among ten 3-ounce pop molds', 'Divide the mixture among ten 3-ounce [85 g] pop molds'],
    ['I used about 1/4 to 1/3 of a cup and', 'I used about 1/4 to 1/3 of a cup [60–80 ml] and'],
    ['at about 350-380 degrees (F).', 'at about 350-380 degrees (F) [175–190 °C].'],
    ['1 cup of peanuts (or any kind of nuts)', '1 cup of peanuts [150 g] (or any kind of nuts)'],
    ['¾ cup plus 2 Tbs sugar', '¾ cup plus 2 Tbs sugar [175 g]'],
    ['1/3 cup plus 2 tablespoons packed dark brown sugar', '1/3 cup plus 2 tablespoons packed dark brown sugar [100 g]'],
    ['1 cup + 1 tablespoon all purpose flour', '1 cup + 1 tablespoon all purpose flour [130 g]'],
    ['1 lb 2 oz penne rigate', '1 lb 2 oz [500 g] penne rigate'],
    ['1 cup of rice needs 1 and 1/4 cups of water', '1 cup of rice [190 g] needs 1 and 1/4 cups [300 ml] of water'],
    ['1 and 1/2 cups of milk, you know, roughly', '1 and 1/2 cups [350 ml] of milk, you know, roughly'],
    ['for half a pound for the 2 of us', 'for half a pound [225 g] for the 2 of us'],
    ['1 tablespoon plus 1 ½ teaspoons baking powder', '1 tablespoon plus 1 ½ teaspoons baking powder [21 g]'],
    ['Eight 8-inch flour tortillas', 'Eight 8-inch flour [20 cm] tortillas'],
    ['or a quarter of an ounce, which will cost about $40', 'or a quarter of an ounce [7 g], which will cost about $40'],
    ['1/2 cup sliced almonds, toasted', '1/2 cup sliced almonds [45 g], toasted'],
    ['Add a 1/2 cup of cinnamon', 'Add a 1/2 cup [120 ml] of cinnamon'],
    ['Divide the mixture among ten 3-ounce pop molds', 'Divide the mixture among ten 3-ounce [85 g] pop molds'],
    ['A few tablespoons of Torani flavoring syrups', 'A few tablespoons of Torani flavoring syrups'],
    ['1 2.5 lb boneless eye-round roast, tied', '1 2.5 lb [1.1 kg] boneless eye-round roast, tied'],
    ['One 1/8-inch thick slice presunto', 'One 1/8-inch [3 mm] thick slice presunto'],
    ['makes 1 9-inch pie crust', 'makes 1 9-inch [22.5 cm] pie crust'],
    ['1 28-ounce can San Marzano tomatoes', '1 28-ounce [800 g] can San Marzano tomatoes'],
    ['to fit mine in a 9×13-inch baking pan', 'to fit mine in a 9×13-inch [22.5×32.5 cm] baking pan'],
    ['roll out the dough into a 20-by-12-inch rectangle', 'roll out the dough into a 20-by-12-inch [50×30 cm] rectangle'],
    ['Butter a 13- by 9- by 2-inch baking pan', 'Butter a 13- by 9- by 2-inch [32.5×22.5×5 cm] baking pan'],
    ['Gently knead dough into a 10-by-8-inch rectangle', 'Gently knead dough into a 10-by-8-inch [25×20 cm] rectangle'],
    ['Butter two 9×2 inch round cake pans', 'Butter two 9×2 inch [22.5×5 cm] round cake pans'],
    ['Butter a 9x5 inch loaf pan', 'Butter a 9x5 inch [22.5×12.5 cm] loaf pan'],
    ['ramekins or a 9”-by-13” baking dish', 'ramekins or a 9”-by-13” [22.5×32.5 cm] baking dish'],
    ['Line a 13" x 18" x 1" baking sheet', 'Line a 13" x 18" x 1" [32.5×45×2.5 cm] baking sheet'],
    ['Grease a 9-x-5-x-3-inch loaf pan', 'Grease a 9-x-5-x-3-inch [22.5×12.5×7.5 cm] loaf pan'],
    ['in a parchment-lined 15x10x1-inch pan', 'in a parchment-lined 15x10x1-inch [37.5×25×2.5 cm] pan'],
    ['Lightly butter a 9-by-5-by-3-inch loaf pan', 'Lightly butter a 9-by-5-by-3-inch [22.5×12.5×7.5 cm] loaf pan'],
    ['5 strips, each about 12 by 4 inches', '5 strips, each about 12 by 4 inches [30×10 cm]'],
    ['mixture evenly in a 9x13" baking dish', 'mixture evenly in a 9x13" [22.5×32.5 cm] baking dish'],
    ['mandoline set to 1/16th of an inch.', 'mandoline set to 1/16th of an inch [2 mm].'],
    ['Five tablespoons of flour', 'Five tablespoons of flour [40 g]'],
    ['1 1⁄2    cups finely grated Parmesan', '1 1⁄2    cups finely grated Parmesan [150 g]'],
    ['½ cup dark chocolate chips', '½ cup dark chocolate chips [85 g]'],
    ['about 1 pound 2-inch florets', 'about 1 pound [450 g] 2-inch [5 cm] florets'],
    ['between 1/8 and 1/4-inch', 'between 1/8 and 1/4-inch [3–6 mm]'],
    ['between 12 ounces and a pound—that\'s big', 'between 12 ounces and a pound [350–450 g]—that\'s big'],
    ['1-¼ cup sugar, Divided', '1-¼ cup sugar [250 g], Divided'],
    ['1/4 cup superfine sugar', '1/4 cup superfine sugar [48 g]'],
    ['1 cup creme fraiche', '1 cup creme fraiche [225 g]'],
    ['1 cup Mexican crema (or creme fraiche)', '1 cup Mexican crema [225 g] (or creme fraiche)'],
    ['Pre-heat your oven to 350*F.', 'Pre-heat your oven to 350*F [175 °C].'],
    ['⅓ cup cocoa nibs', '⅓ cup cocoa nibs [45 g]'],
    ['5 tbsp golden caster sugar', '5 tbsp golden caster sugar [60 g]'],
    ['1/2 cup peeled almonds', '1/2 cup peeled almonds [70 g]'],
    ['1 3/4 cups uncooked brown rice', '1 3/4 cups uncooked brown rice [325 g]'],
    ['1 cup brown or green lentils, washed and picked over', '1 cup brown or green lentils [190 g], washed and picked over'],
    ['3/4 cup sliced and toasted almonds', '3/4 cup sliced and toasted almonds [70 g]'],
    ['1 cup vanilla yogurt (full fat)', '1 cup vanilla yogurt [250 g] (full fat)'],
    ['4-5 TBSP lemon juice', '4-5 TBSP [60–75 ml] lemon juice'],
    ['1/4 cup yellow cornmeal', '1/4 cup yellow cornmeal [40 g]'],
    ['1 cup cherry tomatoes, sliced in half', '1 cup cherry tomatoes [150 g], sliced in half'],
    ['1 cup farro', '1 cup farro [190 g]'],
    ['2 cups arugula leaves', '2 cups arugula leaves [40 g]'],
    ['1 cup mint leaves', '1 cup mint leaves [25 g]'],
    ['3/4 cup halved cherry or grape tomatoes', '3/4 cup halved cherry or grape tomatoes [110 g]'],
    ['1 cup pearled (Israeli) cous cous', '1 cup pearled (Israeli) cous cous [150 g]'],
    ['1 1/2 cup Israeli or pearl couscous', '1 1/2 cup Israeli or pearl couscous [225 g]'],
    ['1 1/2 cups orzo', '1 1/2 cups orzo [340 g]'],
    ['1 cup Nutella', '1 cup Nutella [280 g]'],
    ['1 cup pitted dried cherries', '1 cup pitted dried cherries [160 g]'],
    ['1 cup sour cream, at room temperature', '1 cup sour cream [225 g], at room temperature'],
    ['2 1/2 cups heavy or whipping cream, chilled', '2 1/2 cups heavy or whipping cream [600 g], chilled'],
    ['1 cup whole wheat pastry flour', '1 cup whole wheat pastry flour [120 g]'],
    ['1 cup dried apricots', '1 cup dried apricots [130 g]'],
    ['1 cup Bomba or Calasparra rice', '1 cup Bomba or Calasparra rice [200 g]'],
    ['1 ½ cups full-fat plain yogurt', '1 ½ cups full-fat plain yogurt [375 g]'],
    ['', ''],
    ['', '']
// failing
    //['32 bars, each about 2-1/4 x 1-1/2 inches', '32 bars, each about 2-1/4 x 1-1/2 inches [5.8×3.8 cm]'],
    //['1 x 375g pack of pre-rolled puff pastry', '1 x 375g pack of pre-rolled puff pastry'],
    //['Grease two 8½ by 4½-inch loaf pans', 'Grease two 8½ by 4½-inch loaf pans'],
    //['1 pint heavy cream]'
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

logReplacement = false;

var textNodes = document.evaluate('//body//text()', document, null,
                                  XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

for (var i = 0; i < textNodes.snapshotLength; i++) {
    var node = textNodes.snapshotItem(i);
    var text = node.data;
    var newText = re.replace(text, function (match) {
        var replacement = replaceUnits(match);
        if (logReplacement) {
            console.log('\'' + match[0] + '\' -> \'' + replacement + '\'');
            logReplacement = false;
        }
        return replacement;
    });
    node.data = newText;
}
