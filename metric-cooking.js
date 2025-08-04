if (typeof module !== 'undefined' && module.exports) {
    module.exports = { walk, addMetricUnits };
}

const dangerous = true; // whether to do replacements with frequent false positives
const maxError = 0.03; // maximum relative error after rounding

const cup_ml = 236.5882365;
const tbsp_ml = 14.78676478125;
const tsp_ml = tbsp_ml / 3;
const gallon_ml = 3785.411784;
const pound_g = 453.59237;
const pound_per_ft3 = 0.0160184634; // in g/ml
const numUnitSpace = '\u202F'; // thin space

// sources:
// USDA National Nutrient Database for Standard Reference, Release 26
// FAO/INFOODS Density Database Version 2.0 (2012)
// biome-ignore format: keep one ingredient per line
const ingredients = {
    almond_flour: [/\balmond flour/, 96 / cup_ml], // http://www.kingarthurflour.com/learn/ingredient-weight-chart.html
    almonds: [/\b(blanched |raw |peeled )*almonds/, 144 / cup_ml], // average of ~12061~ (143) and ~12062~ (145)
    arugula: [/\barugula( leaves)?/, 10.0 / (0.5 * cup_ml)], // ~11959~
    asparagus: [/\basparagus/, 134 / cup_ml], // ~11011~
    baking_powder: [/\bbaking powder/, 4.6 / tsp_ml], // ~18369~
    baking_soda: [/\b(baking|bicarbonate of) soda/, 4.6 / tsp_ml], // ~18372~
    blackberries: [/\bblackberries/, 144 / cup_ml], // ~09042~
    blueberries: [/\bblueberries/, 148 / cup_ml], // ~09050~
    brown_sugar: [/(\blight[ -]|\bdark[- ]|golden |firmly |\(?packed\)? )*brown sugar/, 220 / cup_ml], // ~19334~ (packed)
    butter: [/\b((un)?salted,? |chilled,? |cold,? |softened,? |[eE]uropean[- ]style,? |[sS]weet,? )*[bB]utter/, 227 / cup_ml], // ~01145~
    cake_flour: [/\b(sifted |unbleached )*(cake|pastry) flour/, 114 / cup_ml], // the internet
    canned_chickpeas: [/\bcanned chickpeas/, 152 / cup_ml], // ~16359~
    cheddar: [/(coarsely |grated |shredded |aged |white |sharp )*[Cc]heddar/, 113 / cup_ml], // ~01009~
    cherries: [/\b([Pp]itted |frozen |whole |fresh |Bing )*[Cc]herries/, 154.5 / cup_ml], // ~09063~ & ~09070~ / ~09068~ & ~09076~
    cherry_tomatoes: [/(halved |cherry |grape |or |assorted )*(cherry|grape) tomatoes/, 149 / cup_ml], // ~11529~
    chocolate_chips: [/(semi-sweet |dark |milk |semi- |or |bittersweet )*chocolate chips/, 0.71], // Wolfram Alpha
    chopped_parsley: [/(chopped |minced |fresh |Italian |flat-leaf )*parsley( leaves)?/, 60 / cup_ml], // ~11297~
    chopped_shallots: [/(finely |chopped )*shallots/, 10.0 / tbsp_ml], // ~11677~
    cocoa_nibs: [/cocoa nibs/, 35 * pound_per_ft3], // http://www.sawyerhanson.com/uploads/Brabender%20Ingredient%20bulk%20density%20table.pdf
    cocoa: [/\b(unsweetened |Dutch[- ]process(ed)? |natural )*cocoa( powder)?(?! nibs)/, 86 / cup_ml], // ~19165~
    cornmeal: [/\b(yellow )?(cornmeal|polenta)/, 157 / cup_ml], // ~20022~
    cornstarch: [/\b(corn ?starch|starch\s+powder|cornflour)/, 128 / cup_ml], // ~20027~
    cottage_cheese: [/\b(low-fat )?cottage cheese/, 225 / cup_ml], // ~01012~ (small curd, not packed)
    couscous: [/\b(instant |whole wheat |plain |dry )?cous ?cous/, 173 / cup_ml], // ~20028~
    cranberries: [/\b(fresh |of |or |thawed |frozen )*cranberries/, 100 / cup_ml], // ~09078~
    cream_cheese: [/cream cheese/, 232 / cup_ml], // ~01017~
    cream: [/\b(heavy |whipping |or |double )*cream/, 238.5 / cup_ml], // ~01053~ & ~01052~
    creme_fraiche: [/(cr[eè]me fra[iî]che)|((Mexican )?crema)/, 0.978], // FAO, 38%
    crumbled_blue_cheese: [/\bcrumbled blue cheese/, 135 / cup_ml], // ~01004~
    dark_corn_syrup: [/\bdark corn syrup/, 328 / cup_ml], // ~19349~
    dried_apricots: [/\bdried apricots/, 130 / cup_ml], // ~09032~
    dried_cherries: [/\b(pitted )?dried cherries/, 40 / (0.25 * cup_ml)], // ~09044~
    dulce_de_leche: [/\bdulce de leche/, 19 / tbsp_ml], // ~01225~
    farro: [/\bfarro/, 0.82], // Wolfram Alpha
    feta: [/\b(crumbled |low[ -]fat )*[Ff]eta( cheese)?/, 150 / cup_ml], // ~01019~
    flour: [/\b(all[- ]purpose |sifted |unbleached |white |self[- ]raising )*flour/, 125 / cup_ml], // ~20081~
    hazelnuts: [/\bhazelnuts/, 135 / cup_ml], // ~12120~ (whole)
    honey: [/\b(mild(-tasting)? )?honey/, 339 / cup_ml], // ~19296~
    israeli_couscous: [/\b(\(?Israeli\)? |\(?pearl(ed)?\)? |or )*(\(?Israeli\)? |\(?pearl(ed)?\)? )+cous ?cous/, 50 / (cup_ml / 3)], // http://www.fatsecret.com/calories-nutrition/osem/israeli-couscous
    kosher_salt: [/kosher salt/, 0.57], // Wolfram Alpha
    lentils: [/\b(brown |or |green )*lentils/, 192 / cup_ml], // ~16069~
    light_corn_syrup: [/\b(light )?corn syrup/, 341 / cup_ml], // ~19350~
    long_grain_rice: [/\b(long[- ]grain(ed)? |[Bb]asmati |[Jj]asmine |brown |white |uncooked |warm,? |cooked |cold )*rice(?! vinegar| crispies| flour| wine)/, 185 / cup_ml], // ~20444~, ~20036~ (brown)
    maple_syrup: [/\b(pure )?maple syrup/, 80 / 60], // ~19911~
    marmalade: [/\b(orange )?marmalade/, 320 / cup_ml], // ~19303~
    matzo_meal: [/\bmatzo meal/, 0.5], // Wolfram Alpha
    mayonnaise: [/\bmayonnaise/, 220 / cup_ml], // ~04025~
    mint: [/\bmint( leaves)?/, 3.2 / (2 * tbsp_ml)], // ~02064~
    miso: [/\b(white |light |or |yellow |red |brown |mellow )*[Mm]iso( paste)?/, 275 / cup_ml], // ~16112~
    mustard: [/\b([Dd]ijon |grainy |whole grain |yellow )*mustard(?! seed)/, 249 / cup_ml], // ~02046~
    nutella: [/\bNutella/, 1.2], // Wolfram Alpha
    oats_steel_cut: [/\bsteel[- ]cut oats/, 0.68], // Wolfram Alpha
    onions_chopped: [/\b(chopped onions?)|(onions?, chopped)/, 160 / cup_ml], // ~11282~
    orzo: [/\b(whole[- ]wheat )?orzo/, 225 / cup_ml], // estimate from various sources
    parmesan: [/\b(finely |freshly |grated |shredded |fresh )*([Pp]armesan|[Pp]armigiano[ -][Rr]eggiano|(Pecorino )?[Rr]omano)(\s+cheese)?/, 100 / cup_ml], // ~01032~ (grated), ~01146~ (shredded)
    pastry_flour: [/\b(whole |wheat )*pastry flour/, 0.51], // Wolfram Alpha
    peanut_butter: [/\b(smooth |natural |creamy |chunky )?peanut butter/, 258 / cup_ml], // ~16397~ (smooth), ~16398~ (chunky)
    peanuts: [/\b(roasted| salted )*peanuts/, 145 / cup_ml], // average of ~16087~, ~16089~
    pecans: [/\b(toasted )?pecans?( halves)?/, 99 / cup_ml], // ~12142~ (halves)
    pine_nuts: [/\bpine ?nuts/, 135 / cup_ml], // ~12147~
    pistachio: [/\b(shelled )?pistachio(s|\s+nuts)/, 123 / cup_ml], // ~12151~ (raw)
    powdered_sugar: [/\b(powdered|confectioner['’]?s['’]?|icing) sugar/, 120 / cup_ml], // ~19336~ (unsifted)
    quark: [/\bquark/, 1.035], // http://dx.doi.org/10.1002/food.19720160506 (Speisequark 1.05, Sahnequark 1.02)
    quinoa: [/\b(dry |pre-washed |or |rinsed |whole[- ]grain |organic )*quinoa/, 170 / cup_ml], // ~20035~
    raisins: [/\b(golden )?raisins/, 165 / cup_ml], // ~09298~ (packed)
    raspberries: [/\b(fresh )*raspberries/, 0.66], // ~09302~ says 123g/cup, that seems too low. Use Wolfram Alpha
    ricotta: [/\b(fresh )?ricotta( cheese)?/, 246 / cup_ml], // ~01036~
    salt: [/\b(table )?salt/, 292 / cup_ml], // ~02047~
    sesame: [/\bsesame( seeds)?(?! oil)/, 144 / cup_ml], // ~12023~
    short_grain_rice: [/\b(short[- ]grain(ed)? |[Aa]rborio |[Bb]omba |[Cc]alasparra )+(brown |[Bb]omba |or |[Cc]alasparra )*rice(?! vinegar| crispies| flour)/, 200 / cup_ml], // ~20052~
    shredded_coconut: [/\b(unsweetened )?shredded coconut/, 93 / cup_ml], // ~12179~
    shredded_mozzarella: [/\b(shredded |part-skim )*mozzarella( cheese)?/, 112 / cup_ml], // ~01026~
    sliced_almonds: [/\bsliced (and toasted )?almonds/, 92 / cup_ml], // ~12061~
    sour_cream: [/\b(low-fat |light )?sour cream/, 230 / cup_ml], // ~01056~, ~01178~
    spinach: [/\b(fresh )?spinach/, 30 / cup_ml], // ~11457~ (raw)
    strawberries: [/\b(fresh |medium-sized )*strawberries/, 144 / cup_ml], // ~09316~
    sugar: [/\b(granulated |white |cane )*sugar/, 200 / cup_ml], // ~19335~
    sun_dried_tomatoes: [/\bsun[- ]dried tomatoes/, 54 / cup_ml], // ~11955~
    superfine_sugar: [/\b(golden )?(superfine|cast[eo]r) sugar/, 0.81], // Wolfram Alpha
    swiss_cheese: [/\b(grated |shredded )*Swiss cheese/, 108 / cup_ml], // ~01040~
    tahini: [/\btahini/, 15 / tbsp_ml], // ~12166~
    tomato_paste: [/\b(double-concentrated )?tomato paste/, 262 / cup_ml], // ~11546~
    walnuts: [/\bwalnuts/, 100 / cup_ml], // ~12155~
    sunflower_seed_kernels: [/\b(raw )?sunflower seeds/, 128 / cup_ml], // ~12155~
    wild_rice: [/\b(cooked )?wild rice/, 160 / cup_ml], // ~20088~
    yeast_dry: [/\byeast/, 136 / cup_ml],
    yogurt: [/\b(plain |vanilla |\d% |[Gg]reek |(non|low|full)[- ]?fat |whole milk )*yogurt/, 245 / cup_ml] // ~01116~
};

// wares labeled in dry pints
const dry_ingredients = [
    'blackberries',
    'blueberries',
    'cherries',
    'cherry_tomatoes',
    'cranberries',
    'raspberries',
    'strawberries',
];

const reIngredient = `(?<ingredient>${Object.entries(ingredients)
    .map(([ingredient, [regex]]) => `(?<${ingredient}>${regex.source}\\b)`)
    .join('|')})`;

function round(x, isTemperature) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const fs = [100000, 50000, 25000, 10000, 5000, 2500, 1000, 500, 250, 100, 50, 25, 10, 5, 1];
    let newx;
    for (const f of fs) {
        newx = Math.round(x / f) * f;
        const error = Math.abs(x - newx);
        if (isTemperature) {
            const maxAbsError = x < 100 ? 1 : x < 160 ? 1.5 : 2.5;
            if (error < maxAbsError) {
                return sign * newx;
            }
        } else {
            if (error / x < maxError) {
                return sign * newx;
            }
        }
    }
    return sign * newx;
}

function prefixGroups(regexp, prefix) {
    return regexp.replace(/\(\?<([^>]+)>/g, `(?<${prefix}$1>`);
}

const fahrenheit = dangerous
    ? /(([°º˚*℉]|degrees?(?! [Cc]elsius)\b)\s*(?! ?C\b)(F\b|[(]F[)]|Fahrenheit\b)?)|F(ahrenheit)?\b/
    : /([°º˚℉]|degrees?(?! [Cc]elsius)\b)\s*(F\b|[(]F[)]|Fahrenheit\b)/;
const inches = dangerous ? /(inch(es)?\b|[”″"](?!\w))/ : /inch(es)?\b/;

const units = {
    cup: [/([Cc](ups?)?)\b/, 'ml', cup_ml],
    fahrenheit: [fahrenheit, '°C', undefined],
    fl_oz: [/(fl\.? oz\.?)|(fluid[- ]ounces?)/, 'ml', 2 * tbsp_ml],
    inch: [inches, 'mm', 25.6],
    ounce: [/ounces?\b|oz\b\.?/, 'g', pound_g / 16],
    pint: [/pints?\b/, 'ml', 2 * cup_ml], // US liquid pint
    dry_pint: [/dry pints?\b/, 'ml', 550.6104713575], // US dry pint (berries etc.)
    pound: [/pounds?\b|lbs?\b\.?/, 'g', pound_g],
    quart: [/quarts?\b|qt\b\.?/, 'ml', 4 * cup_ml],
    gallon: [/gallons?\b/, 'ml', gallon_ml],
    stick: [/sticks?\b(?!\s+cinnamon)/, 'g', pound_g / 4],
    tablespoon: [/[Tt]ablespoons?\b|(T|tb|[Tt]bsp?|TBL|TBSP)\b\.?/, 'ml', tbsp_ml],
    teaspoon: [/[Tt]easpoons?\b|(t|tsp?|TSP)\b\.?/, 'ml', tbsp_ml / 3],
};

const reUnit = `(?<unit>${Object.entries(units)
    .map(([unit, [regex]]) => `(?<${unit}>${regex.source})`)
    .join('|')})`;

const numWords = {
    quarter: [/([Oo]ne[- ])?[Qq]uarter( of an?)?/, 1 / 4],
    threequarter: [/([Tt]hree[- ])[Qq]quarters?( of an?)?/, 3 / 4],
    third: [/([Oo]ne[- ])?[Tt]hird( of an?)?/, 1 / 3],
    twothirds: [/([Tt]wo[- ])[Tt]hirds?( of an?)?/, 2 / 3],
    half: [/([Oo]ne[- ])?([Hh]alf|1\/2)( an?)?/, 1 / 2],
    one: [/[Aa]|[Aa]n|[Oo]ne|per(?![- ]([Hh]alf|[Tt]hird|[Qq]uarter))/, 1],
    two: [/[Tt]wo/, 2],
    three: [/[Tt]hree/, 3],
    four: [/[Ff]our/, 4],
    five: [/[Ff]ive/, 5],
    six: [/[Ss]ix/, 6],
    seven: [/[Ss]even/, 7],
    eight: [/[Ee]ight/, 8],
    nine: [/[Nn]ine/, 9],
    ten: [/[Tt]en/, 10],
    eleven: [/[Ee]leven/, 11],
    twelve: [/[Tt]welve|[Dd]ozen/, 12],
};

const reNumWord = `(?<numWord>${Object.entries(numWords)
    .map(([numWord, [regex]]) => `(?<${numWord}>\\b(${regex.source})\\b)`)
    .join('|')})`;

const reReal = /(?<real>\d+(\.\d+)?)/.source;
const reFracChar = /(?<fracChar>[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/.source;
const reFraction = `(?<fraction>(?<fracWhole>\\d+(\\s*|-))?(((?<fracNum>\\d+)[/⁄∕](?<fracDen>\\d+)(( ?ths?)?( of an?)?)?)|${reFracChar}))`;
const reNumber = `(?<number>${reNumWord}|${reFraction}|${reReal})`;

// biome-ignore format: keep one line per denominator
const UNICODE_FRACTIONS = {
    '½': 1 / 2,
    '⅓': 1 / 3, '⅔': 2 / 3,
    '¼': 1 / 4, '¾': 3 / 4,
    '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5,
    '⅙': 1 / 6, '⅚': 5 / 6,
    '⅐': 1 / 7,
    '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
    '⅑': 1 / 9,
    '⅒': 1 / 10
};

function findMatchingKey(obj, groups, prefix = '') {
    return Object.keys(obj).find(key => groups[prefix + key]);
}

function parseNumber(groups, prefix = '') {
    // Parse decimal numbers
    const real = groups[`${prefix}real`];
    if (real) {
        return parseFloat(real);
    }

    // Parse word numbers
    const numWord = groups[`${prefix}numWord`];
    if (numWord) {
        const matchingWord = findMatchingKey(numWords, groups, prefix);
        return matchingWord ? numWords[matchingWord][1] : undefined;
    }

    // Parse fractions
    let amount = 0;
    const fracWhole = groups[`${prefix}fracWhole`];
    if (fracWhole) {
        amount += parseInt(fracWhole);
    }

    const fracChar = groups[`${prefix}fracChar`];
    if (fracChar) {
        amount += UNICODE_FRACTIONS[fracChar];
    } else {
        const fracNum = groups[`${prefix}fracNum`];
        const fracDen = groups[`${prefix}fracDen`];
        amount += parseInt(fracNum) / parseInt(fracDen);
    }
    return amount;
}

function parseUnit(groups, prefix = '') {
    return findMatchingKey(units, groups, prefix);
}

function parseIngredient(groups) {
    return findMatchingKey(ingredients, groups);
}

// This captures two different things:
// * Range: "1 to 2 cups" or "between 1 and 2 cups".
// * Sum: "1 and 1/4 cups of water" or "1 stick, plus 1 tb".
// We'll figure out which one it is when we have the match.
// biome-ignore format: keep
const reFrom = '(?<from>'
    + '(?<between>between\\s+)?'
    + prefixGroups(reNumber, 'from') + '-?\\s*'
    + '(('
    + prefixGroups(reUnit, 'from')
    + '\\s*((?<range1>-|–|to|or)|(?<plus1>(, )?plus|\\+|and|\\s+))\\s*)'
    + '|'
    + '(\\s*((?<range2>-|–|to|or)|(?<plus2>plus|\\+|and))\\s*)'
    + '))';

// Matches dimension patterns like in "9×13 inch pan"
// biome-ignore format: keep
const reBy = '(?<by>'
    + prefixGroups(reNumber, 'by1') + '[”"″]?(-inch)?-?\\s*(×|x|[- ]?by[- ]?)-?\\s*'
    + prefixGroups(reNumber, 'by2') + '[”"″]?(-inch)?-?(\\s*(×|x|[- ]?by[- ]?)-?\\s*'
    + prefixGroups(reNumber, 'by3') + ')?([”"″]|[ -]?inch(es)?)'
    + (dangerous ? "?" : "")
    + ')';

// biome-ignore format: keep
const reAll =
    reBy + '|('
    + reFrom + '?(?<main>'
    + reNumber + '(\\s*|-)'
    + reUnit + '(\\s+(of(\\s+the)?\\s+)?'
    + reIngredient + ')?))';
const re = new RegExp(reAll, 'g');

function convert(amount, unit) {
    const newUnit = units[unit][1];
    let newAmount;
    if (unit === 'fahrenheit') {
        newAmount = (amount - 32) * (5 / 9);
    } else {
        newAmount = amount * units[unit][2];
    }
    return { amount: newAmount, unit: newUnit };
}

function scale(amount, unit) {
    const scalingRules = {
        mm: { threshold: 10, newUnit: 'cm', divisor: 10 },
        ml: { threshold: 1000, newUnit: 'l', divisor: 1000 },
        g: { threshold: 1000, newUnit: 'kg', divisor: 1000 },
    };

    const rule = scalingRules[unit];
    if (rule && amount >= rule.threshold) {
        return { amount: amount / rule.divisor, unit: rule.newUnit };
    }

    return { amount: amount, unit: unit };
}

// Returns an array of { annotation: string, insertIndex: number } objects
// for a single match. The insertIndex is relative to the match start.
// The regexp is designed to match a single annotation, but in an edge case
// we'll recognize we actually need two.
function getAnnotationsForMatch(match, ...args) {
    const groups = args[args.length - 1]; // named groups are the last argument

    // avoid false positives with e.g. 'a t-shirt'
    if (groups.numWord && groups.unit.match(/^["tT]$/)) {
        return [];
    }

    if (groups.by) {
        const by1 = round(convert(parseNumber(groups, 'by1'), 'inch').amount) / 10;
        const by2 = round(convert(parseNumber(groups, 'by2'), 'inch').amount) / 10;
        const by3 = round(convert(parseNumber(groups, 'by3'), 'inch').amount) / 10;

        let annotation = ` [${by1}×${by2}`;
        if (by3) {
            annotation += `×${by3}`;
        }
        annotation += `${numUnitSpace}cm]`;
        return [{ annotation: annotation, insertIndex: match.length }];
    }

    let unit = parseUnit(groups);
    if (unit === 'pint') {
        for (const i in dry_ingredients) {
            if (groups[dry_ingredients[i]]) {
                unit = 'dry_pint';
                break;
            }
        }
    }
    let converted = convert(parseNumber(groups), unit);
    let newAmount = converted.amount;
    let newUnit = converted.unit;

    let fromAmount;
    if (groups.from) {
        const fromUnit = groups.fromunit ? parseUnit(groups, 'from') : unit;
        converted = convert(parseNumber(groups, 'from'), fromUnit);
        if (converted.unit !== newUnit) {
            // We had something like "about 1 pound 2-inch florets", which is not to be
            // converted into a single measurement or range. We still want annotations
            // for the parts separately. Recursively process each part and collect annotations.
            const annotations = [];
            let offset = 0;

            for (const partName of ['from', 'main']) {
                groups[partName].replace(re, (submatch, ...subargs) => {
                    const subAnnotations = getAnnotationsForMatch(submatch, ...subargs);
                    subAnnotations.forEach(ann => {
                        annotations.push({
                            annotation: ann.annotation,
                            insertIndex: offset + ann.insertIndex,
                        });
                    });
                    return submatch;
                });
                offset += groups[partName].length;
            }

            return annotations;
        }
        if (groups.between || groups.range1 || groups.range2) {
            fromAmount = converted.amount;
            // Avoid misparsing e.g. "1-1/2" (supposed to mean 1.5)
            if (parseNumber(groups, 'from') >= 1 && parseNumber(groups) < 1) {
                newAmount += fromAmount;
                fromAmount = undefined;
            }
        } else {
            newAmount += converted.amount;
        }
    }

    if (groups.ingredient) {
        const ingredient = parseIngredient(groups);
        if (newUnit === 'ml') {
            newAmount = newAmount * ingredients[ingredient][1];
            newUnit = 'g';
            if (fromAmount) {
                fromAmount = fromAmount * ingredients[ingredient][1];
            }
        }
    }

    if ((newUnit === 'ml' || newUnit === 'g') && newAmount < 4) {
        return [];
    }

    if (newUnit === '°C' && groups.numWord) {
        return [];
    }

    newAmount = round(newAmount, newUnit === '°C');

    let scaled;
    if (fromAmount) {
        fromAmount = round(fromAmount);
        scaled = scale(fromAmount, newUnit);
        if (scaled.unit !== newUnit) {
            fromAmount = scaled.amount;
            scaled = scale(newAmount, newUnit);
            newAmount = scaled.amount;
            newUnit = scaled.unit;
        }
    } else {
        scaled = scale(newAmount, newUnit);
        newAmount = scaled.amount;
        newUnit = scaled.unit;
    }

    if (fromAmount === newAmount) {
        fromAmount = undefined;
    }

    let annotation = ' [';
    if (fromAmount) {
        annotation += `${fromAmount}–`;
    }
    annotation += `${newAmount + numUnitSpace + newUnit}]`;

    return [{ annotation: annotation, insertIndex: match.length }];
}

function getAllAnnotations(text) {
    const annotations = [];

    text.replace(re, (match, ...args) => {
        const matchStart = args[args.length - 3]; // third to last arg is the match position
        const matchAnnotations = getAnnotationsForMatch(match, ...args);

        // Convert relative positions to absolute positions
        for (const ann of matchAnnotations) {
            annotations.push({
                annotation: ann.annotation,
                position: matchStart + ann.insertIndex,
            });
        }

        return match;
    });

    return annotations;
}

function addMetricUnits(text) {
    const annotations = getAllAnnotations(text);

    if (annotations.length === 0) {
        return text;
    }

    const descendingByPosition = (a, b) => b.position - a.position;
    annotations.sort(descendingByPosition);

    let result = text;
    for (const ann of annotations) {
        result = result.slice(0, ann.position) + ann.annotation + result.slice(ann.position);
    }

    return result;
}

// This is for handling text spread over several elements, e.g.
// <span>5 </span><span>tsp </span><span><a><strong>sugar, melted</strong></a></span>
// For this, we need to assemble the text across the elements and remember where the
// original elements were so that we can insert the annotations at the right point.
class Context {
    constructor() {
        // The text assembled so far.
        this.text = '';
        // Array of tuples of [textNodeStart, textNode] indicating that the text of textNode
        // starts in this.text at position textNodeStart.
        this.element_indices = [];
    }
}

// biome-ignore format: keep
const IN_TEXT_TAGS = new Set(['A', 'P', 'SPAN', 'DIV',
			      'EM', 'STRONG', 'I', 'B',
			      'SUB', 'SUP',
			     ]);
// biome-ignore format: keep
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE',
			   // Skip to avoid accidental submission of substituted text
			   'TEXTAREA',
			  ]);

function applyAnnotations(context) {
    const annotations = getAllAnnotations(context.text);

    // Sort by position descending to avoid index shifts when inserting
    annotations.sort((a, b) => b.position - a.position);

    for (const ann of annotations) {
        const nodeIndex = context.element_indices.findLastIndex(([p]) => p < ann.position);
        const [textNodeStart, textNode] = context.element_indices[nodeIndex];
        const insertPos = ann.position - textNodeStart;
        const text = textNode.textContent;
        textNode.textContent = text.slice(0, insertPos) + ann.annotation + text.slice(insertPos);
    }
}

function walk(node, context = new Context()) {
    if (node.nodeType === node.ELEMENT_NODE) {
        if (SKIP_TAGS.has(node.tagName)) {
            return new Context();
        }

        for (let child = node.firstChild; child; child = child.nextSibling) {
            context = walk(child, context);
        }

        if (!IN_TEXT_TAGS.has(node.tagName)) {
            applyAnnotations(context);
            context = new Context();
        }
    } else if (node.nodeType === node.TEXT_NODE) {
        context.element_indices.push([context.text.length, node]);
        context.text += node.textContent;
    }

    return context;
}

function walkBody() {
    walk(document.body);
}

if (typeof document !== 'undefined') {
    walkBody();
}
