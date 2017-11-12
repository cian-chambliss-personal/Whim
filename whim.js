
//====================================
const parseNumber = function (expr) {
    var num = 0;
    expr = expr.trim();
    try {
        num = parseFloat(expr);
    } catch (err) {
        return { error: err };
    }
    return { result: num };
};
//====================================
const parseRange = function (expr) {
    var result = {}, num, op = "<";
    expr = expr.split("<");
    if (expr.length === 1) {
        op = ">";
        expr = expr[0].split(">");
    }
    if (expr.length !== 2) {
        return { error: "Expected a '<' comparison operator " };
    }
    if (op === ">") {
        op = expr[0];
        expr[0] = expr[1];
        expr[1] = op;
    }
    if (expr[0].length > 0) {
        num = parseNumber(expr[0]);
        if (num.error) {
            return num;
        }
        result.start = num.result;
    }
    if (expr[1].length > 0) {
        num = parseNumber(expr[1]);
        if (num.error) {
            return num;
        }
        result.end = num.result;
        if (result.start !== undefined) {
            if (result.start >= result.end) {
                return { error: "Start must be less than end." };
            }
        }
    }
    return { result: result };
};
//====================================
const parseCondition = function (expr) {
    var place = expr.indexOf('!');
    var name, i, range, ranges = [], location = null;
    if (place > 0) {
        location = expr.substr(place + 1).trim();
        expr = expr.substr(0, place);
    }
    place = expr.indexOf(':');
    if (place > 0) {
        name = expr.substr(0, place).trim();
        expr = expr.split('||');
        for (i = 0; i < expr.length; ++i) {
            range = parseRange(expr[i]);
            if (range.error) {
                return range;
            }
            ranges.push(range);
        }
        return { result: {  type : "condition" , name: name, ranges: ranges, location: location } };
    }
    return { result: { type : "condition" , name: expr } };
};
//====================================
const parse = function (definiton) {
    var i, line, ch;
    var result = { rules: {} }, rule = null, depth = 0
        , schedule = null, condition = null, playerAction = null
        , playerStack = [], conditionStack = [], lastAction = null
        , gotoStack = null, chanceStack = null , chanceDepth = 0;
    definiton = definiton.split("\r").join().split("\n");
    for (i = 0; i < definiton.length; ++i) {
        line = definiton[i].trim();
        if (line === "") {
        } else if (line.charAt(0) === '@' && depth === 0) {
            rule = {};
            result.rules[line.substr(1)] = rule;
        } else if (rule) {
            ch = line.charAt(0);
            if (ch === '[') {
                ++depth;
                schedule = [];
            } else if (ch === ']' && schedule) {
                --depth;
                rule.schedule = schedule;
                schedule = null;
            } else if (ch === '=') {
                lastAction = parseCondition(line.substr(1).trim());
                if (lastAction.error) {
                    return { error: "Error at line " + (i + 1) + ":" + lastAction.error };
                }
                lastAction = lastAction.result;
                lastAction.action = [];
                if( depth > 0 && !schedule ) {
                    if( conditionStack.length ) {
                       if( conditionStack[ conditionStack.length - 1 ].nested ) {
                           condition = conditionStack.pop();
                       }
                    }
                    condition.action.push(lastAction); 
                    conditionStack.push(condition);
                    condition.nested = true;
                } else if (rule.condition) {
                    rule.condition.push(lastAction);
                } else {
                    rule.condition = [lastAction];
                }
                condition = lastAction;
            } else if (ch === '"') {
                if (condition) {
                    if (lastAction.type === "give" || lastAction.type === "take") {
                        lastAction.error = line.substr(1).trim();
                    } else {
                        lastAction = { "type": "say", "text": line.substr(1).trim() };
                        condition.action.push(lastAction);
                    }
                } else {
                    return { error: "Error at line " + (i + 1) + ": say command needs a context" };
                }
            } else if (ch === '-') {
                if (condition) {
                    lastAction = { "type": "give", "content": line.substr(1).trim() };
                    condition.action.push(lastAction);
                } else {
                    return { error: "Error at line " + (i + 1) + ": give command needs a context" };
                }
            } else if (ch === '+') {
                if (condition) {
                    lastAction = { "type": "take", "content": line.substr(1).trim() };
                    condition.action.push(lastAction);
                } else {
                    return { error: "Error at line " + (i + 1) + ": take command needs a context" };
                }
            } else if (ch === '$') {
                if (condition) {
                    if (!gotoStack) {
                        gotoStack = {};
                        condition.goto = gotoStack;
                    }
                    condition = { action: [] };
                    gotoStack[line.substr(1).trim()] = condition;
                } else {
                    return { error: "Error at line " + (i + 1) + ": goto command needs a context" };
                }
            } else if (line === "...") {
                if (condition) {
                    lastAction = { "type": "repeatLabel" };
                    condition.action.push(lastAction);
                } else {
                    return { error: "Error at line " + (i + 1) + ": repeat needs a context" };
                }
            } else if (ch === '?') {
                line = line.substr(1).trim();
                if (line.charAt(0) === '"') {
                    if (condition) {
                        lastAction = { "type": "actorSay", "text": line.substr(1).trim() };
                        condition.action.push(lastAction);
                    } else {
                        return { error: "Error at line " + (i + 1) + ": actor say needs a context" };
                    }
                } else {
                    return { error: "Error at line " + (i + 1) + " Expected text." };
                }
            } else if (ch === '%') {
                if (condition) {
                    line = line.substr(1).trim();
                    if( chanceDepth !== depth ) {
                        chanceStack = null;
                    }
                    if( !chanceStack ) {
                        chanceDepth = depth;
                        chanceStack = [];
                        lastAction = { "type": "chance", "chance": chanceStack }
                        condition.action.push(lastAction);
                    }
                    lastAction = { "odds" : line , action : [] };
                    chanceStack.push(lastAction);
                    condition = lastAction;
                } else {
                    return { error: "Error at line " + (i + 1) + ": chance command needs a context" };
                }
            } else if (ch === '!') {
                if (condition) {
                    lastAction = { "type": "action", "name": line.substr(1).trim() };
                    condition.action.push(lastAction);
                } else {
                    return { error: "Error at line " + (i + 1) + ": action command needs a context" };
                }
            } else if (ch === '>') {
                line = line.substr(1).trim();
                if (playerAction) {
                    playerStack.push(playerAction);
                }
                conditionStack.push(condition);
                playerAction = { type: "", action: [] };
                condition.action.push(playerAction);
                condition = playerAction;
                ++depth;
                if (line === '?') {
                    playerAction.type = "dialog";
                }
                lastAction = playerAction;
            } else if (ch === '<') {
                line = line.substr(1).trim();
                if (line.length > 0) {
                    condition.goto = line;
                }
                if (playerAction) {
                    --depth;
                    if (playerStack.length) {
                        playerAction = playerStack.pop();
                        condition = conditionStack.pop();
                    } else {
                        playerAction = null;
                    }
                    ++line;
                } else {
                    return { error: "Error at line " + (i + 1) + " unexpected end <." };
                }
            } else {
                return { error: "Error at line " + (i + 1) + " unexpected character " + ch + " ." };
            }
        } else {
            return { error: "Error at line " + (i + 1) };
        }
    }
    return { error: null, result: result };
};
//======================
exports.parse = parse;
