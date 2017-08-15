var actions, arity, isConstructor, merge, mergeObjects, seq, seqRE, types, utils;

isConstructor = require("isConstructor");

arity = require("./arity");

types = require("./types");

utils = require("../utils");

seq = require("../utils/seq");

seqRE = /TABLE|SELECTION<ARRAY>/;

arity.set({
  bracket: arity.ONE,
  getField: arity.ONE,
  hasFields: arity.ONE_PLUS,
  merge: arity.ONE_PLUS,
  pluck: arity.ONE_PLUS,
  without: arity.ONE_PLUS
});

types.set({
  bracket: types.BRACKET,
  getField: types.DATUM,
  hasFields: types.SEQUENCE,
  merge: types.DATUM,
  pluck: types.DATUM,
  without: types.DATUM
});

actions = exports;

actions.bracket = function(result, key) {
  var type;
  type = utils.typeOf(key);
  if (type === "NUMBER") {
    if (key < -1 && seqRE.test(this.type)) {
      throw Error("Cannot use an index < -1 on a stream");
    }
    return seq.nth(result, key);
  }
  if (type !== "STRING") {
    throw Error("Expected NUMBER or STRING as second argument to `bracket` but found " + type);
  }
  type = utils.typeOf(result);
  if (type === "ARRAY") {
    return seq.getField(result, key);
  }
  if (type === "OBJECT") {
    return utils.getField(result, key);
  }
  throw Error("Expected ARRAY or OBJECT as first argument to `bracket` but found " + type);
};

actions.getField = function(result, attr) {
  var type;
  utils.expect(attr, "STRING");
  type = utils.typeOf(result);
  if (type === "ARRAY") {
    return seq.getField(result, attr);
  }
  if (type === "OBJECT") {
    return utils.getField(result, attr);
  }
  throw Error("Expected ARRAY or OBJECT but found " + type);
};

actions.hasFields = function(result, attrs) {
  var attr, i, len, type;
  attrs = utils.flatten(attrs);
  for (i = 0, len = attrs.length; i < len; i++) {
    attr = attrs[i];
    utils.expect(attr, "STRING");
  }
  type = utils.typeOf(result);
  if (type === "ARRAY") {
    return seq.hasFields(result, attrs);
  }
  if (type === "OBJECT") {
    return utils.hasFields(result, attrs);
  }
  throw Error("Expected ARRAY or OBJECT but found " + type);
};

actions.merge = function(result, args) {
  var type;
  type = utils.typeOf(result);
  if (type === "ARRAY") {
    return result.map(function(row) {
      utils.expect(row, "OBJECT");
      return mergeObjects(row, args);
    });
  }
  if (type === "OBJECT") {
    return mergeObjects(result, args);
  }
  throw Error("Expected ARRAY or OBJECT but found " + type);
};

actions.pluck = function(result, args) {
  var type;
  type = utils.typeOf(result);
  if (type === "ARRAY") {
    return seq.pluck(result, args);
  }
  if (type === "OBJECT") {
    return utils.pluck(result, args);
  }
  throw Error("Expected ARRAY or OBJECT but found " + type);
};

actions.without = function(result, args) {
  var type;
  args = utils.flatten(args);
  type = utils.typeOf(result);
  if (type === "ARRAY") {
    return seq.without(result, args);
  }
  if (type === "OBJECT") {
    return utils.without(result, args);
  }
  throw Error("Expected ARRAY or OBJECT but found " + type);
};

mergeObjects = function(output, inputs) {
  var ctx, i, input, len;
  output = utils.cloneObject(output);
  ctx = {
    row: output
  };
  for (i = 0, len = inputs.length; i < len; i++) {
    input = inputs[i];
    if (utils.isQuery(input)) {
      input = input._eval(ctx);
    }
    output = merge(output, input);
  }
  return output;
};

merge = function(output, input) {
  var key, value;
  if (!isConstructor(input, Object)) {
    return input;
  }
  if (!isConstructor(output, Object)) {
    return input;
  }
  for (key in input) {
    value = input[key];
    if (isConstructor(value, Object)) {
      if (isConstructor(output[key], Object)) {
        merge(output[key], value);
      } else {
        output[key] = value;
      }
    } else {
      output[key] = value;
    }
  }
  return output;
};
