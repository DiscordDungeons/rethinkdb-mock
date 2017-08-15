var actions, arity, deleteRow, deleteRows, findRow, isArray, isConstructor, selRE, types, updateRow, updateRows, utils, uuid;

isConstructor = require("isConstructor");

arity = require("./arity");

types = require("./types");

utils = require("../utils");

uuid = require("../utils/uuid");

isArray = Array.isArray;

selRE = /TABLE|SELECTION/;

arity.set({
  get: arity.ONE,
  getAll: arity.ONE_PLUS,
  insert: arity.ONE_TWO,
  update: arity.ONE_TWO,
  replace: arity.ONE_TWO,
  "delete": arity.NONE
});

types.set({
  get: "SELECTION",
  getAll: "SELECTION<ARRAY>",
  insert: types.DATUM,
  update: types.DATUM,
  replace: types.DATUM,
  "delete": types.DATUM
});

actions = exports;

actions.get = function(table, rowId) {
  var index;
  if (rowId === void 0) {
    throw Error("Argument 1 to get may not be `undefined`");
  }
  if (utils.isQuery(rowId)) {
    rowId = rowId._run();
  }
  if ((rowId === null) || isConstructor(rowId, Object)) {
    throw Error("Primary keys must be either a number, string, bool, pseudotype or array");
  }
  this.rowId = rowId;
  this.rowIndex = -1;
  index = -1;
  while (++index < table.length) {
    if (table[index].id === rowId) {
      this.rowIndex = index;
      return table[index];
    }
  }
  return null;
};

actions.getAll = function(table, args) {
  var key;
  if (!args.length) {
    return [];
  }
  if (isConstructor(args[args.length - 1], Object)) {
    key = args.pop().index;
  }
  if (key == null) {
    key = "id";
  }
  utils.expect(key, "STRING");
  args.forEach(function(arg, index) {
    if (arg === null) {
      throw Error("Keys cannot be NULL");
    }
    if (isConstructor(arg, Object)) {
      throw Error((key === "id" ? "Primary" : "Secondary") + " keys must be either a number, string, bool, pseudotype or array");
    }
  });
  return table.filter(function(row) {
    var arg, i, len;
    for (i = 0, len = args.length; i < len; i++) {
      arg = args[i];
      if (isArray(arg)) {
        if (utils.equals(arg, row[key])) {
          return true;
        }
      } else if (arg === row[key]) {
        return true;
      }
    }
    return false;
  });
};

actions.insert = function(table, rows) {
  var errors, generated_keys, i, len, res, row;
  if (!isArray(rows)) {
    rows = [rows];
  }
  errors = 0;
  generated_keys = [];
  for (i = 0, len = rows.length; i < len; i++) {
    row = rows[i];
    utils.expect(row, "OBJECT");
    if (row.hasOwnProperty("id")) {
      if (findRow(table, row.id)) {
        errors += 1;
      } else {
        table.push(row);
      }
    } else {
      generated_keys.push(row.id = uuid());
      table.push(row);
    }
  }
  res = {
    errors: errors
  };
  if (errors > 0) {
    res.first_error = "Duplicate primary key `id`";
  }
  res.inserted = rows.length - errors;
  if (generated_keys.length) {
    res.generated_keys = generated_keys;
  }
  return res;
};

actions.update = function(result, patch) {
  if (isArray(result)) {
    return updateRows.call(this, result, patch);
  }
  return updateRow.call(this, result, patch);
};

actions.replace = function(rows, values) {
  var i, len, query, res, row, table;
  if (!selRE.test(this.type)) {
    throw Error("Expected type SELECTION but found " + this.type);
  }
  table = this.db._tables[this.tableId];
  if (values === null) {
    if (rows === null) {
      return {
        deleted: 0,
        skipped: 1
      };
    }
    if (isArray(rows)) {
      return deleteRows.call(this, rows);
    }
    table.splice(this.rowIndex, 1);
    return {
      deleted: 1,
      skipped: 0
    };
  } else if (rows === null) {
    table.push(values);
    return {
      inserted: 1
    };
  }
  res = {
    errors: 0,
    replaced: 0,
    unchanged: 0
  };
  if (!isArray(rows)) {
    rows = [rows];
  }
  if (utils.isQuery(values)) {
    query = values;
  }
  for (i = 0, len = rows.length; i < len; i++) {
    row = rows[i];
    if (query) {
      values = query._run({
        row: row
      });
    }
    if ("OBJECT" !== utils.typeOf(values)) {
      throw Error("Inserted value must be an OBJECT (got " + (utils.typeOf(values)) + ")");
    }
    if (!values.hasOwnProperty("id")) {
      throw Error("Inserted object must have primary key `id`");
    }
    if (values.id !== row.id) {
      res.errors += 1;
      if (res.first_error == null) {
        res.first_error = "Primary key `id` cannot be changed";
      }
    } else if (utils.equals(row, values)) {
      res.unchanged += 1;
    } else {
      table[table.indexOf(row)] = values;
      res.replaced += 1;
    }
  }
  return res;
};

actions["delete"] = function(result) {
  if (isArray(result)) {
    return deleteRows.call(this, result);
  }
  return deleteRow.call(this, result);
};

findRow = function(table, rowId) {
  if (rowId === void 0) {
    throw Error("Argument 1 to get may not be `undefined`");
  }
  if (utils.isQuery(rowId)) {
    rowId = rowId._run();
  }
  if ((rowId === null) || isConstructor(rowId, Object)) {
    throw Error("Primary keys must be either a number, string, bool, pseudotype or array");
  }
  return table.find(function(row) {
    return row.id === rowId;
  });
};

updateRows = function(rows, patch) {
  var i, len, query, replaced, row, update;
  if (!selRE.test(this.type)) {
    throw Error("Expected type SELECTION but found " + this.type);
  }
  if (!rows.length) {
    return {
      replaced: 0,
      unchanged: 0
    };
  }
  if (patch === null) {
    return {
      replaced: 0,
      unchanged: rows.length
    };
  }
  if (utils.isQuery(patch)) {
    query = patch;
    update = function(row) {
      patch = query._eval({
        row: row
      });
      utils.expect(patch, "OBJECT");
      return utils.update(row, patch);
    };
  } else {
    utils.expect(patch, "OBJECT");
    update = function(row) {
      return utils.update(row, patch);
    };
  }
  replaced = 0;
  for (i = 0, len = rows.length; i < len; i++) {
    row = rows[i];
    if (update(row, patch)) {
      replaced += 1;
    }
  }
  return {
    replaced: replaced,
    unchanged: rows.length - replaced
  };
};

updateRow = function(row, patch) {
  if (this.type !== "SELECTION") {
    throw Error("Expected type SELECTION but found " + this.type);
  }
  if (row === null) {
    return {
      replaced: 0,
      skipped: 1
    };
  }
  if (utils.isQuery(patch)) {
    patch = patch._eval({
      row: row
    });
  }
  utils.expect(patch, "OBJECT");
  if (utils.update(row, patch)) {
    return {
      replaced: 1,
      unchanged: 0
    };
  }
  return {
    replaced: 0,
    unchanged: 1
  };
};

deleteRows = function(rows) {
  var deleted;
  if (this.type === "TABLE") {
    deleted = rows.length;
    rows.length = 0;
    return {
      deleted: deleted
    };
  }
  if (this.type !== "SELECTION<ARRAY>") {
    throw Error("Expected type SELECTION but found " + this.type);
  }
  if (!rows.length) {
    return {
      deleted: 0
    };
  }
  deleted = 0;
  this.db._tables[this.tableId] = this.db._tables[this.tableId].filter(function(row) {
    if (~rows.indexOf(row)) {
      deleted += 1;
      return false;
    }
    return true;
  });
  return {
    deleted: deleted
  };
};

deleteRow = function(row) {
  var table;
  if (row === null) {
    return {
      deleted: 0,
      skipped: 1
    };
  }
  if (this.type !== "SELECTION") {
    throw Error("Expected type SELECTION but found " + this.type);
  }
  table = this.db._tables[this.tableId];
  table.splice(this.rowIndex, 1);
  return {
    deleted: 1,
    skipped: 0
  };
};
