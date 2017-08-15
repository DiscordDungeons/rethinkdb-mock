var actions, arity, types, utils;

arity = require("./arity");

types = require("./types");

utils = require("../utils");

arity.set({
  add: arity.ONE_PLUS,
  sub: arity.ONE_PLUS,
  mul: arity.ONE_PLUS,
  div: arity.ONE_PLUS
});

types.set({
  add: types.DATUM,
  sub: types.DATUM,
  mul: types.DATUM,
  div: types.DATUM
});

actions = exports;

actions.add = function(result, args) {
  var arg, i, len, total, type;
  type = utils.typeOf(result);
  if (!/ARRAY|NUMBER|STRING/.test(type)) {
    throw Error("Expected type ARRAY, NUMBER, or STRING but found " + type);
  }
  total = result;
  for (i = 0, len = args.length; i < len; i++) {
    arg = args[i];
    utils.expect(arg, type);
    if (type === "ARRAY") {
      total = total.concat(arg);
    } else {
      total += arg;
    }
  }
  return total;
};

actions.sub = function(result, args) {
  var arg, i, len, total;
  utils.expect(result, "NUMBER");
  total = result;
  for (i = 0, len = args.length; i < len; i++) {
    arg = args[i];
    utils.expect(arg, "NUMBER");
    total -= arg;
  }
  return null;
};

actions.mul = function(result, args) {
  var arg, i, len, total;
  utils.expect(result, "NUMBER");
  total = result;
  for (i = 0, len = args.length; i < len; i++) {
    arg = args[i];
    utils.expect(arg, "NUMBER");
    total *= arg;
  }
  return null;
};

actions.div = function(result, args) {
  var arg, i, len, total;
  utils.expect(result, "NUMBER");
  total = result;
  for (i = 0, len = args.length; i < len; i++) {
    arg = args[i];
    utils.expect(arg, "NUMBER");
    total /= arg;
  }
  return null;
};
