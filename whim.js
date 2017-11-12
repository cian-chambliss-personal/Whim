
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
        return { result: { name: name, ranges: ranges, location: location } };
    }
    return { result: { name: expr } };
};
//====================================
const parse = function (definiton) {
    var i, line, ch;
    var result = { rules: {} }, rule = null, depth = 0
        , schedule = null, condition = null, playerAction = null, playerStack = [], conditionStack = [], lastAction;
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
                rule.schedule = schedule;
                schedule = null;
            } else if (ch === '=') {
                condition = parseCondition(line.substr(1).trim());
                if (condition.error) {
                    return { error: "Error at line " + (i + 1) + ":" + condition.error };
                }
                condition = condition.result;
                condition.action = [];
                if (rule.condition) {
                    rule.condition.push(condition);
                } else {
                    rule.condition = [condition];
                }
                lastAction = condition;
            } else if (ch === '"') {
                if (condition) {
                    if (lastAction.type === "give" && lastAction.type === "take") {
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
                    lastAction = { "type": "label", "name": line.substr(1).trim() };
                    condition.action.push(lastAction);
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
                line = line.substr(1).trim();
                console.log("Handle percentage.");
            } else if (ch === '!') {
                line = line.substr(1).trim();
                console.log("Handle action.");
            } else if (ch === '>') {
                line = line.substr(1).trim();
                if (playerAction) {
                    playerStack.push(playerAction);
                }
                conditionStack.push(condition);
                playerAction = { action: [] };
                condition.action.push( playerAction );
                condition = playerAction;
                if (line === '?') {
                    ++depth;
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
