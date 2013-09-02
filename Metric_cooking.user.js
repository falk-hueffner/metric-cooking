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
    'asparagus': [/\basparagus/, 134/cup_ml], // ~11011~
    'baking powder': [/\bbaking powder/, 4.6/tsp_ml], // ~18369~
    'baking soda': [/\b(baking|bicarbonate of) soda/, 4.6/tsp_ml], // ~18372~
    'blackberries': [/\bblackberries/, 144/cup_ml], // ~09042~
    'brown sugar': [/(\blight[ -]|\bdark |firmly |\(?packed\)? )*brown sugar/, 220/cup_ml], // ~19334~ (packed)
    'butter': [/\b((un)?salted |chilled |cold )*butter/, 113/cup_ml], // ~01145~
    'canned chickpeas': [/\bcanned chickpeas/, 152/cup_ml], // ~16359~
    'chopped parsley': [/(chopped |minced |fresh |Italian )*parsley/, 60/cup_ml], // ~11297~
    'chopped shallots': [/(finely |chopped )*shallots/, 10.0/tbsp_ml], // ~11677~
    'cocoa': [/\b(unsweetened |Dutch[- ]process(ed)? )*cocoa( powder)?/, 86/cup_ml], // ~19165~
    'cornstarch': [/\bcornstarch/, 128/cup_ml], // ~20027~
    'cottage cheese': [/\b(low-fat )?cottage cheese/, 225/cup_ml], // ~01012~ (small curd, not packed)
    'crumbled blue cheese': [/\bcrumbled blue cheese/, 135/cup_ml], // ~01004~
    'dark corn syrup': [/\bdark corn syrup/, 328/cup_ml], // ~19349~
    'dulce de leche': [/\bdulce de leche/, 19/tbsp_ml], // ~01225~
    'flour': [/\b(all[- ]purpose |sifted |cake |unbleached )*flour/, 125/cup_ml], // ~20081~
    'honey': [/\bhoney/, 339/cup_ml], // ~19296~
    'light corn syrup': [/\b(light )?corn syrup/, 341/cup_ml], // ~19350~
    'long-grain rice': [/\b(long[- ]grain(ed)? |[Bb]asmati )+(brown |white )*rice(?! vinegar| crispies| flour)/, 185/cup_ml], // ~20444~, ~20036~ (brown)
    'marmalade': [/\b(orange )?marmalade/, 320/cup_ml], // ~19303~
    'mayonnaise': [/\bmayonnaise/, 220/cup_ml], // ~04025~
    'mustard': [/\b(Dijon )?mustard/, 249/cup_ml], // ~02046~
    'parmesan': [/\b(finely |freshly |grated |shredded )*([Pp]armesan|[Pp]armigiano [Rr]eggiano)(\s+cheese)?/, 100/cup_ml], // ~01032~ (grated), ~01146~ (shredded)
    'peanut butter': [/\b(smooth )?peanut butter/, 258/cup_ml], // ~16397~ (smooth), ~16398~ (chunky)
    'pecans': [/\bpecans/, 99/cup_ml], // ~12142~ (halves)
    'pine nuts': [/\bpine nuts/, 135/cup_ml], // ~12147~
    'pistachio': [/\bpistachio(s|\s+nuts)/, 123/cup_ml], // ~12151~ (raw)
    'powdered sugar': [/\b(powdered|confectioners['’]?) sugar/, 120/cup_ml], // ~19336~ (unsifted)
    'raisins': [/\braisins/, 165/cup_ml], // ~09298~ (packed)
    'ricotta': [/\b(fresh )?ricotta/, 246/cup_ml], // ~01036~
    'salt': [/\b(table )?salt/, 292/cup_ml], // ~02047~
    'short-grain rice': [/\b(short[- ]grain(ed)? |Arborio )+(brown )?rice(?! vinegar| crispies| flour)/, 200/cup_ml], // ~20052~
    'shredded mozzarella': [/\bshredded mozzarella( cheese)?/, 112/cup_ml], // ~01026~
    'spinach': [/\bspinach/, 30/cup_ml], // ~11457~ (raw)
    'sugar': [/\b(granulated )?sugar/, 200/cup_ml], // ~19335~
    'sun-dried tomatoes': [/\bsun-dried tomatoes/, 54/cup_ml], // ~11955~
    'tomato paste': [/\btomato paste/, 262/cup_ml], // ~11546~
    'yogurt': [/\b(plain |low-fat )*yogurt/, 245/cup_ml] // ~01116~
};
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

function prefixGroups (regexp, prefix) {
    return regexp.replace(/\(<([^>]+)>/g, '(<' + prefix + ':$1' + '>');
}

var units = {
    'cup':        [/(cups?)\b/   ,   'ml', 236.5882365  ],
    'fahrenheit': [/(°\s*?|degrees )F(ahrenheit)?/,   '°C', undefined    ],
    'inch':       [/inch(es)?\b/,   'mm',  25.6        ],
    'ounce':      [/ounces?\b|oz\b\.?/, 'g',   28.349523125],
    'pint':       [/pints?\b/,       'g',  236.5882365*2],
    'pound':      [/pounds?\b|lbs?\b\.?/, 'g',  453.59237    ],
    'quart':      [/quarts?\b/,      'ml', 946.352946   ],
    'stick':      [/sticks?\b/,      'g', 4*28.349523125],
    'tablespoon': [/[Tt]ablespoons?\b|(T|tb|[Tt]bsp?|TBL)\b\.?/, 'ml',  14.8        ],
    'teaspoon':   [/[Tt]easpoons?\b|(t|tsp|TSP)\b\.?/,       'ml',  14.8/3      ]
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

function parseNumber(match, prefix) {
    prefix = prefix || '';
    var real = match.group(prefix + 'real');
    if (real)
        return parseFloat(real);

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

var reFrom = '(<from>'
        + prefixGroups(reNumber, 'from') + '-?'
        + prefixGroups(reUnit,   'from') + '?'
        + '\\s*(-|to|or)\\s*)';

var reAll =
        reFrom + '?'
        + reNumber + '(\\s*|-)'
        + reUnit + '(\\s+(of(\\s+the)?\\s+)?'
        + reIngredient + ')?';
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
    var unit = parseUnit(match);
    var converted = convert(parseNumber(match), unit);
    var newAmount = converted.amount;
    var newUnit = converted.unit;

    var fromAmount;
    if (match.group('from')) {
        converted = convert(parseNumber(match, 'from:'), unit);
        if (converted.unit == newUnit) {
            fromAmount = converted.amount;
            if (fromAmount >= newAmount) { // "1-1/2"
                newAmount += fromAmount;
            fromAmount = undefined;
            }
        } else {
            // TODO: convert seperately
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
    // false positives with C meaning °C
    // ['1/2 C butter', '1/2 C butter [55 g]'],
    ['1 t vanilla, almond, coconut, or orange extract', '1 t [5 ml] vanilla, almond, coconut, or orange extract'],
    ['about 6 T unpopped', 'about 6 T [90 ml] unpopped'],
    ['2 T cocoa powder', '2 T cocoa powder [11 g]'],
    ['2/3 cup smooth peanut butter', '2/3 cup smooth peanut butter [175 g]'],
    ['3 tablespoons unsalted butter, melted', '3 tablespoons unsalted butter [21 g], melted'],
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
    ['2 cups sifted cake flour', '2 cups sifted cake flour [250 g]'],
    ['10 Tbs unsalted butter, at room temperature' ,'10 Tbs unsalted butter [70 g], at room temperature'],
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
    ['4 tablespoons salted butter', '4 tablespoons salted butter [28 g]'],
    ['1 1/3 cups ricotta', '1 1/3 cups ricotta [325 g]'],
    ['2 tablespoons of the butter', '2 tablespoons of the butter [14 g]'],
    ['1/4 cup shredded Parmesan cheese', '1/4 cup shredded Parmesan cheese [25 g]'],
    ['1/2 pound fresh ricotta', '1/2 pound fresh ricotta [225 g]'],
    ['64 ounces chicken broth', '64 ounces [1.8 kg] chicken broth'],
    ['2 cups low-fat cottage cheese', '2 cups low-fat cottage cheese [450 g]'],
    ['8 3/4 oz. sugar', '8 3/4 oz. sugar [250 g]'],
    ['2 tablespoons cold butter', '2 tablespoons cold butter [14 g]'],
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
    ['1 pint cherry tomatoes', '1 pint [475 g] cherry tomatoes'],
    ['Preheat oven to 450° F.', 'Preheat oven to 450° F [230 °C].'],
    ['1 cup mayonnaise', '1 cup mayonnaise [225 g]'],
    // TODO: fix
    // ['28 1/3-inch-thick diagonal bread slices', '28 1/3-inch [9 mm]-thick diagonal bread slices']
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
    ['1 lb. lentils – regular or De Puy variety', '1 lb. [450 g] lentils – regular or De Puy variety'],
    ['3 cups canned chickpeas, divided', '3 cups canned chickpeas [450 g], divided'],
    ['2 tablespoons tomato paste', '2 tablespoons tomato paste [33 g]'],
    ['3 cups short-grain brown rice', '3 cups short-grain brown rice [600 g]'],
    ['make certain your freezer is set to 0°F.', 'make certain your freezer is set to 0°F [-18 °C].'],
    ['3/4 cup granulated sugar', '3/4 cup granulated sugar [150 g]'],
    ['2 Tbs. Dutch-processed cocoa powder', '2 Tbs. Dutch-processed cocoa powder [11 g]'],
    ['1 cup basmati rice', '1 cup basmati rice [190 g]'],
    ['1 1/2 cups unbleached all-purpose flour', '1 1/2 cups unbleached all-purpose flour [190 g]'],
    ['3/4 cup plus 2 tablespoons packed light-brown sugar', '3/4 cup [175 ml] plus 2 tablespoons packed light-brown sugar [28 g]'],
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
    ['2 teaspoons kosher salt or 1 teaspoon table salt', '2 teaspoons [10 ml] kosher salt or 1 teaspoon table salt [6 g]'],
    ['1 cup long-grain white rice', '1 cup long-grain white rice [190 g]'],
    ['Add 1/3 cup finely chopped shallots to the saucepan.', 'Add 1/3 cup finely chopped shallots [53 g] to the saucepan.'],
    ['1/4 cup minced fresh Italian parsley', '1/4 cup minced fresh Italian parsley [15 g]']
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
