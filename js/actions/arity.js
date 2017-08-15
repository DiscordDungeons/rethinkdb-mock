var arity, cache;

cache = Object.create(null);

arity = exports;

arity.get = function(actionId) {
  return cache[actionId];
};

arity.set = function(values) {
  var actionId, value;
  for (actionId in values) {
    value = values[actionId];
    cache[actionId] = value;
  }
};

arity.NONE = [0, 0];

arity.ONE = [1, 1];

arity.ONE_PLUS = [1, Infinity];

arity.ONE_TWO = [1, 2];

arity.ONE_THREE = [1, 3];

arity.TWO = [2, 2];
