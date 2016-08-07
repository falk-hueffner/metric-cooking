"use strict";

module.exports = {
    addMetricUnits: function(text) {
        return re.replace(text, replaceUnits);
    }
};

var dangerous    = true; // whether to do replacements with frequent false positives
var maxError     = 0.03; // maximum relative error after rounding

var logTimings = false;
var logReplacement = false;

var start_time = +new Date();

var cup_ml  = 236.5882365;
var tbsp_ml = 14.78676478125;
var tsp_ml  = tbsp_ml/3;
var pound_g = 453.59237;
var pound_per_ft3 = 0.0160184634; // in g/ml
var numUnitSpace = '\u202F';    // thin space

// sources:
// USDA National Nutrient Database for Standard Reference, Release 26
// FAO/INFOODS Density Database Version 2.0 (2012)
var ingredients = {
    'almonds': [/\b(blanched |raw |peeled )*almonds/, 144/cup_ml], // average of ~12061~ (143) and ~12062~ (145)
    'arugula': [/\barugula( leaves)?/, 10.0/(0.5*cup_ml)], // ~11959~
    'asparagus': [/\basparagus/, 134/cup_ml], // ~11011~
    'baking powder': [/\bbaking powder/, 4.6/tsp_ml], // ~18369~
    'baking soda': [/\b(baking|bicarbonate of) soda/, 4.6/tsp_ml], // ~18372~
    'blackberries': [/\bblackberries/, 144/cup_ml], // ~09042~
    'blueberries': [/\bblueberries/, 148/cup_ml], // ~09050~
    'brown sugar': [/(\blight[ -]|\bdark[- ]|golden |firmly |\(?packed\)? )*brown sugar/, 220/cup_ml], // ~19334~ (packed)
    'butter': [/\b((un)?salted,? |chilled,? |cold,? |softened,? )*butter/, 227/cup_ml], // ~01145~
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
    'couscous': [/\b(instant |whole wheat |plain |dry )?cous ?cous/, 173/cup_ml], // ~20028~
    'cranberries': [/\b(fresh |of |or |thawed |frozen )*cranberries/, 100/cup_ml], // ~09078~
    'cream cheese': [/cream cheese/, 232/cup_ml], // ~01017~
    'cream': [/\b(heavy |whipping |or |double )*cream/, 238.5/cup_ml], // ~01053~ & ~01052~
    'creme fraiche': [/(cr[eè]me fra[iî]che)|((Mexican )?crema)/, 0.978], // FAO, 38%
    'crumbled blue cheese': [/\bcrumbled blue cheese/, 135/cup_ml], // ~01004~
    'dark corn syrup': [/\bdark corn syrup/, 328/cup_ml], // ~19349~
    'dried apricots': [/\bdried apricots/, 130/cup_ml], // ~09032~
    'dried cherries': [/\b(pitted )?dried cherries/, 40/(0.25*cup_ml)], // ~09044~
    'dulce de leche': [/\bdulce de leche/, 19/tbsp_ml], // ~01225~
    'farro': [/\bfarro/, 0.82], // Wolfram Alpha
    'feta': [/\b(crumbled |low[ -]fat )*[Ff]eta( cheese)?/, 150/cup_ml], // ~01019~
    'flour': [/\b(all[- ]purpose |sifted |unbleached |white |self[- ]raising )*flour/, 125/cup_ml], // ~20081~
    'hazelnuts': [/\bhazelnuts/, 135/cup_ml], // ~12120~ (whole)
    'honey': [/\b(mild-tasting )?honey/, 339/cup_ml], // ~19296~
    'israeli couscous': [/\b(\(?Israeli\)? |\(?pearl(ed)?\)? |or )*(\(?Israeli\)? |\(?pearl(ed)?\)? )+cous ?cous/, 50/(cup_ml/3)], // http://www.fatsecret.com/calories-nutrition/osem/israeli-couscous
    'kosher salt': [/kosher salt/, 0.57], // Wolfram Alpha
    'lentils': [/\b(brown |or |green )*lentils/, 192/cup_ml], // ~16069~
    'light corn syrup': [/\b(light )?corn syrup/, 341/cup_ml], // ~19350~
    'long-grain rice': [/\b(long[- ]grain(ed)? |[Bb]asmati |[Jj]asmine |brown |white |uncooked |warm,? |cooked |cold )*rice(?! vinegar| crispies| flour| wine)/, 185/cup_ml], // ~20444~, ~20036~ (brown)
    'maple syrup': [/\b(pure )?maple syrup/, 80/60], // ~19911~
    'marmalade': [/\b(orange )?marmalade/, 320/cup_ml], // ~19303~
    'mayonnaise': [/\bmayonnaise/, 220/cup_ml], // ~04025~
    'mint': [/\bmint( leaves)?/, 3.2/(2*tbsp_ml)], // ~02064~
    'mustard': [/\b([Dd]ijon |grainy |yellow )*mustard(?! seed)/, 249/cup_ml], // ~02046~
    'nutella': [/\bNutella/, 1.2], // Wolfram Alpha
    'onions, chopped': [/\b(chopped onions?)|(onions?, chopped)/, 160/cup_ml], // ~11282~
    'orzo': [/\b(whole[- ]wheat )?orzo/, 225/cup_ml], // estimate from various sources
    'parmesan': [/\b(finely |freshly |grated |shredded |fresh )*([Pp]armesan|[Pp]armigiano[ -][Rr]eggiano|(Pecorino )?[Rr]omano)(\s+cheese)?/, 100/cup_ml], // ~01032~ (grated), ~01146~ (shredded)
    'pastry flour': [/\b(whole |wheat )*pastry flour/, 0.51], // Wolfram Alpha
    'peanut butter': [/\b(smooth |natural |creamy |chunky )?peanut butter/, 258/cup_ml], // ~16397~ (smooth), ~16398~ (chunky)
    'peanuts': [/\b(roasted| salted )*peanuts/, 145/cup_ml], // average of ~16087~, ~16089~
    'pecans': [/\b(toasted )?pecans?( halves)?/, 99/cup_ml], // ~12142~ (halves)
    'pine nuts': [/\bpine ?nuts/, 135/cup_ml], // ~12147~
    'pistachio': [/\b(shelled )?pistachio(s|\s+nuts)/, 123/cup_ml], // ~12151~ (raw)
    'powdered sugar': [/\b(powdered|confectioner['’]?s['’]?|icing) sugar/, 120/cup_ml], // ~19336~ (unsifted)
    'quark': [/\bquark/, 1.035], // http://dx.doi.org/10.1002/food.19720160506 (Speisequark 1.05, Sahnequark 1.02)
    'quinoa': [/\b(dry |pre-washed |or |rinsed |whole[- ]grain |organic )*quinoa/, 170/cup_ml], // ~20035~
    'raisins': [/\b(golden )?raisins/, 165/cup_ml], // ~09298~ (packed)
    'raspberries': [/\b(fresh )*raspberries/, 0.66], // ~09302~ says 123g/cup, that seems too low. Use Wolfram Alpha
    'ricotta': [/\b(fresh )?ricotta( cheese)?/, 246/cup_ml], // ~01036~
    'salt': [/\b(table )?salt/, 292/cup_ml], // ~02047~
    'sesame': [/\bsesame( seeds)?(?! oil)/, 144/cup_ml], // ~12023~
    'short-grain rice': [/\b(short[- ]grain(ed)? |[Aa]rborio |[Bb]omba |[Cc]alasparra )+(brown |[Bb]omba |or |[Cc]alasparra )*rice(?! vinegar| crispies| flour)/, 200/cup_ml], // ~20052~
    'shredded coconut': [/\b(unsweetened )?shredded coconut/, 93/cup_ml], // ~12179~
    'shredded mozzarella': [/\b(shredded |part-skim )*mozzarella( cheese)?/, 112/cup_ml], // ~01026~
    'sliced almonds': [/\bsliced (and toasted )?almonds/, 92/cup_ml], // ~12061~
    'sour cream': [/\b(low-fat )?sour cream/, 230/cup_ml], // ~01056~, ~01178~
    'spinach': [/\b(fresh )?spinach/, 30/cup_ml], // ~11457~ (raw)
    'strawberries': [/\b(fresh |medium-sized )*strawberries/, 144/cup_ml], // ~09316~
    'sugar': [/\b(granulated |white )*sugar/, 200/cup_ml], // ~19335~
    'sun-dried tomatoes': [/\bsun[- ]dried tomatoes/, 54/cup_ml], // ~11955~
    'superfine sugar': [/\b(golden )?(superfine|cast[eo]r) sugar/, 0.81], // Wolfram Alpha
    'swiss cheese': [/\b(grated |shredded )*Swiss cheese/, 108/cup_ml], // ~01040~
    'tomato paste': [/\b(double-concentrated )?tomato paste/, 262/cup_ml], // ~11546~
    'walnuts': [/\bwalnuts/, 100/cup_ml], // ~12155~
    'wild rice': [/\bwild rice/, 160/cup_ml], // ~20088~
    'oats, steel-cut': [/\bsteel[- ]cut oats/, 0.68], // Wolfram Alpha
    'matzo meal': [/\bmatzo meal/, 0.5], // Wolfram Alpha
    'yogurt': [/\b(plain |low-fat |vanilla |\d% |Greek |full-fat |whole milk )*yogurt/, 245/cup_ml] // ~01116~
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

function round(x, isTemperature) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var fs = [100000, 50000, 25000, 10000, 5000, 2500, 1000, 500, 250, 100, 50, 25, 10, 5, 1];
    var newx;
    for (var f in fs) {
        newx = Math.round(x / fs[f]) * fs[f];
	var error = Math.abs(x - newx);
	if (isTemperature) {
	    var maxAbsError = x < 100 ? 1 : (x < 160 ? 1.5 : 2.5);
            if (error < maxAbsError)
		return sign * newx;
	} else {
            if (error / x < maxError)
		return sign * newx;
	}
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
	if (match) {
            match.group = function (name) {
		return match[groupNumber[name]];
            };
	}
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

var fahrenheit = dangerous
        ? /(([°º˚*]|degrees?(?! [Cc]elsius)\b)\s*(?! ?C\b)(F\b|[(]F[)]|Fahrenheit\b)?)|F(ahrenheit)?\b/
        :  /([°º˚]|degrees?(?! [Cc]elsius)\b)\s*(F\b|[(]F[)]|Fahrenheit\b)/;
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

    newAmount = round(newAmount, newUnit == '°C');

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

// food52.com has HTML like this:
// <li class="has-quantity" itemprop="ingredients">
//   <span class="quantity">1</span>
//   <span class="item-name">cup basmati rice, rinsed and drained</span>
// if (location.hostname.match('food52')) {
//     var quantities = document.querySelectorAll('.has-quantity');
//     for (i in quantities) {
// 	node = quantities[i];
// 	console.log(node);
// 	var number = node.children[0].innerHTML;
// 	console.log(number);
// 	var unitText = node.children[1].innerHTML;
// 	var text = number + ' ' + unitText;
// 	var newText = re.replace(text, replaceUnits);
// 	if (logReplacement && newText != text)
// 	    console.log('\'' + text + '\' -> \'' + newText + '\'');
// 	node.children[1].innerHTML = newText.substr(number.length);
//     }
// }

function walk(node)
{
    // Source: http://is.gd/mwZp7E
    var child, next;
    switch (node.nodeType) {
        case 1:  // Element
        case 9:  // Document
        case 11: // Document fragment
        child = node.firstChild;
        while (child) {
            next = child.nextSibling;
            walk(child);
            child = next;
        }
        break;
        
        case 3: // Text node
        handleNode(node);
        break;
    }
}
         
function handleNode(textNode) {
    let text = textNode.nodeValue;
	 
    if (text) {
        var modified = re.replace(text, function (match) {
            var replacement = replaceUnits(match);
            if (logReplacement) {
                console.log('\'' + match[0] + '\' -> \'' + replacement + '\'');
                logReplacement = false;
            }
            return replacement;
        });
	if (modified != text) {
	    textNode.nodeValue = modified;
	}
    }
}
         
function handleText(text) {
    let v = text;
    v = v.replace(/\bthe\b/g, "foobar");
    return v;
}

function walkBody() {
    console.log("walkBody");
    walk(document.body);
}

var end_time = +new Date();
if (logTimings)
  console.log('Metric cooking setup: %dms', end_time - start_time);
start_time = +new Date();

if (typeof document !== 'undefined') {
    walkBody();
}

end_time = +new Date();
if (logTimings)
  console.log('Metric cooking body: %dms', end_time - start_time);
