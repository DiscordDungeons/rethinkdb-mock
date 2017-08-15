var actions, arity, types, utils, wrapAction;

arity = require("./arity");

types = require("./types");

utils = require("../utils");

arity.set({
  typeOf: arity.NONE
});

types.set({
  typeOf: types.DATUM
});

actions = {
  typeOf: utils.typeOf
};

utils.assertArity = function(actionId, args) {
  var max, min, ref;
  ref = arity.get(actionId), min = ref[0], max = ref[1];
  if (min === max) {
    if (args.length !== min) {
      throw Error("`" + actionId + "` takes " + min + " argument" + (min === 1 ? "" : "s") + ", " + args.length + " provided");
    }
  } else if (args.length < min) {
    throw Error("`" + actionId + "` takes at least " + min + " argument" + (min === 1 ? "" : "s") + ", " + args.length + " provided");
  } else if (args.length > max) {
    throw Error("`" + actionId + "` takes at most " + max + " argument" + (max === 1 ? "" : "s") + ", " + args.length + " provided");
  }
};

wrapAction = function(actionId, actionFn) {
  var maxArgs;
  maxArgs = arity.get(actionId)[1];
  if (maxArgs === 0) {
    return function(ctx, result) {
      return actionFn.call(ctx, result);
    };
  }
  if (maxArgs === 1) {
    return function(ctx, result, args) {
      return actionFn.call(ctx, result, args[0]);
    };
  }
  if (maxArgs === 2) {
    return function(ctx, result, args) {
      return actionFn.call(ctx, result, args[0], args[1]);
    };
  }
  return function(ctx, result, args) {
    return actionFn.call(ctx, result, args);
  };
};

[actions, require("./math"), require("./compare"), require("./object"), require("./array"), require("./table")].forEach(function(actions) {
  var actionFn, actionId;
  for (actionId in actions) {
    actionFn = actions[actionId];
    exports[actionId] = {
      call: wrapAction(actionId, actionFn),
      arity: arity.get(actionId),
      type: types.get(actionId)
    };
  }
});
